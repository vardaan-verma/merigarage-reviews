package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageService;
import com.merigarage.reviews.domain.Service;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.id.GarageServiceId;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.GarageServiceRepository;
import com.merigarage.reviews.repository.ServiceRepository;
import com.merigarage.reviews.service.dto.CreateServiceRequest;
import com.merigarage.reviews.service.dto.UpdateServiceRequest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@org.springframework.stereotype.Service
@Transactional(readOnly = true)
public class ServiceCatalogueService {

    private final ServiceRepository serviceRepository;
    private final GarageRepository garageRepository;
    private final GarageServiceRepository garageServiceRepository;

    public ServiceCatalogueService(ServiceRepository serviceRepository,
                                   GarageRepository garageRepository,
                                   GarageServiceRepository garageServiceRepository) {
        this.serviceRepository = serviceRepository;
        this.garageRepository = garageRepository;
        this.garageServiceRepository = garageServiceRepository;
    }

    @Transactional
    public Service createService(CreateServiceRequest request, User adminUser) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required to manage service catalogue.");
        }
        if (request == null) {
            throw new ValidationException("Create service request cannot be null.");
        }
        if (serviceRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw new ValidationException("A catalogue service with name '" + request.name().trim() + "' already exists.");
        }

        String baseSlug = com.merigarage.reviews.service.GarageService.toSlug(request.name());
        String slug = baseSlug;
        int counter = 1;
        while (serviceRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter;
            counter++;
        }

        Service service = new Service();
        service.setName(request.name().trim());
        service.setSlug(slug);
        service.setCategory(request.category());
        service.setDescription(request.description());
        service.setIsActive(request.isActive() != null ? request.isActive() : true);
        service.setDisplayOrder(request.displayOrder() != null ? request.displayOrder().intValue() : 0);

        return serviceRepository.save(service);
    }

    @Transactional
    public Service updateService(Integer serviceId, UpdateServiceRequest request, User adminUser) {
        if (adminUser == null) {
            throw new ForbiddenOperationException("Admin user authorization required to manage service catalogue.");
        }
        if (request == null) {
            throw new ValidationException("Update service request cannot be null.");
        }
        if (serviceRepository.existsByNameIgnoreCaseAndIdNot(request.name().trim(), serviceId)) {
            throw new ValidationException("A catalogue service with name '" + request.name().trim() + "' already exists.");
        }

        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found with id: " + serviceId));

        service.setName(request.name().trim());
        service.setCategory(request.category());
        service.setDescription(request.description());
        if (request.isActive() != null) {
            service.setIsActive(request.isActive());
        }
        if (request.displayOrder() != null) {
            service.setDisplayOrder(request.displayOrder().intValue());
        }

        return serviceRepository.save(service);
    }

    @Transactional
    public GarageService associateServiceWithGarage(Long garageId, Integer serviceId, BigDecimal startingPrice, Boolean isAvailable) {
        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));

        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Catalogue service not found with id: " + serviceId));

        // Respect active/inactive service status
        if (!Boolean.TRUE.equals(service.getIsActive())) {
            throw new InvalidOperationException("Cannot associate inactive catalogue service with garage: " + service.getName());
        }

        // Avoid duplicate associations
        GarageServiceId compositeId = new GarageServiceId(garageId, serviceId);
        Optional<GarageService> existingOpt = garageServiceRepository.findById(compositeId);

        GarageService garageService;
        if (existingOpt.isPresent()) {
            garageService = existingOpt.get();
            garageService.setStartingPrice(startingPrice);
            garageService.setIsAvailable(isAvailable != null ? isAvailable : true);
        } else {
            garageService = new GarageService(garage, service, startingPrice, isAvailable);
        }

        return garageServiceRepository.save(garageService);
    }

    @Transactional
    public void associateServicesWithGarage(Long garageId, List<Integer> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) return;
        Garage garage = garageRepository.findById(garageId)
                .orElseThrow(() -> new ResourceNotFoundException("Garage not found with id: " + garageId));
        for (Integer serviceId : serviceIds) {
            if (serviceId == null) continue;
            Service service = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new ValidationException("Invalid service ID: " + serviceId));
            if (!Boolean.TRUE.equals(service.getIsActive())) {
                throw new ValidationException("Cannot associate inactive service: " + service.getName());
            }
            GarageServiceId compositeId = new GarageServiceId(garageId, serviceId);
            if (!garageServiceRepository.existsById(compositeId)) {
                garageServiceRepository.save(new GarageService(garage, service, null, true));
            }
        }
    }

    @Transactional
    public void disassociateServiceFromGarage(Long garageId, Integer serviceId) {
        GarageServiceId compositeId = new GarageServiceId(garageId, serviceId);
        if (garageServiceRepository.existsById(compositeId)) {
            garageServiceRepository.deleteById(compositeId);
        }
    }

    public List<Service> getActiveCatalogueServices() {
        return serviceRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
    }

    public List<Service> getAllServicesForAdmin() {
        return serviceRepository.findAllByOrderByDisplayOrderAscIdAsc();
    }

    public Service getServiceById(Integer serviceId) {
        return serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Catalogue service not found with id: " + serviceId));
    }

    public List<GarageService> getServicesForGarage(Long garageId) {
        return garageServiceRepository.findByGarageId(garageId);
    }

    public java.util.Map<Long, List<String>> getServiceNamesForGarages(List<Long> garageIds) {
        if (garageIds == null || garageIds.isEmpty()) return java.util.Map.of();
        List<GarageService> list = garageServiceRepository.findActiveServicesByGarageIds(garageIds);
        java.util.Map<Long, List<String>> map = new java.util.HashMap<>();
        for (GarageService gs : list) {
            map.computeIfAbsent(gs.getGarage().getId(), k -> new java.util.ArrayList<>()).add(gs.getService().getName());
        }
        return map;
    }
}
