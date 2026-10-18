package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.GarageQuoteRequest;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.Vehicle;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.repository.GarageQuoteRequestRepository;
import com.merigarage.reviews.repository.VehicleRepository;
import com.merigarage.reviews.service.dto.CreateVehicleRequest;
import com.merigarage.reviews.service.dto.QuoteRequestDto;
import com.merigarage.reviews.service.dto.UpdateVehicleRequest;
import com.merigarage.reviews.service.dto.VehicleDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final GarageQuoteRequestRepository quoteRequestRepository;

    public VehicleService(VehicleRepository vehicleRepository,
                          GarageQuoteRequestRepository quoteRequestRepository) {
        this.vehicleRepository = vehicleRepository;
        this.quoteRequestRepository = quoteRequestRepository;
    }

    @Transactional(readOnly = true)
    public List<VehicleDto> getMyVehicles(Long userId) {
        return vehicleRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(VehicleDto::fromEntity)
                .toList();
    }

    public VehicleDto createVehicle(CreateVehicleRequest request, User currentUser) {
        Vehicle vehicle = new Vehicle(
                currentUser,
                request.vehicleType() != null && !request.vehicleType().isBlank() ? request.vehicleType().trim() : "Car",
                request.make().trim(),
                request.model().trim(),
                request.year(),
                request.registrationNumber() != null ? request.registrationNumber().trim().toUpperCase(Locale.ROOT) : null,
                request.fuelType() != null ? request.fuelType().trim() : null
        );
        Vehicle saved = vehicleRepository.save(vehicle);
        return VehicleDto.fromEntity(saved);
    }

    public VehicleDto updateVehicle(Long vehicleId, UpdateVehicleRequest request, Long userId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + vehicleId));

        if (!vehicle.getUser().getId().equals(userId)) {
            throw new ForbiddenOperationException("You do not have permission to modify this vehicle.");
        }

        vehicle.setVehicleType(request.vehicleType() != null && !request.vehicleType().isBlank() ? request.vehicleType().trim() : "Car");
        vehicle.setMake(request.make().trim());
        vehicle.setModel(request.model().trim());
        vehicle.setYear(request.year());
        vehicle.setRegistrationNumber(request.registrationNumber() != null ? request.registrationNumber().trim().toUpperCase(Locale.ROOT) : null);
        vehicle.setFuelType(request.fuelType() != null ? request.fuelType().trim() : null);

        Vehicle updated = vehicleRepository.save(vehicle);
        return VehicleDto.fromEntity(updated);
    }

    public void deleteVehicle(Long vehicleId, Long userId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + vehicleId));

        if (!vehicle.getUser().getId().equals(userId)) {
            throw new ForbiddenOperationException("You do not have permission to delete this vehicle.");
        }

        vehicleRepository.delete(vehicle);
    }

    @Transactional(readOnly = true)
    public List<QuoteRequestDto> getVehicleHistory(Long vehicleId, Long userId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + vehicleId));

        if (!vehicle.getUser().getId().equals(userId)) {
            throw new ForbiddenOperationException("You do not have permission to view history for this vehicle.");
        }

        List<GarageQuoteRequest> allCustomerQuotes = quoteRequestRepository.findByCustomerUserId(userId);
        String vReg = vehicle.getRegistrationNumber() != null ? vehicle.getRegistrationNumber().trim().toUpperCase(Locale.ROOT) : "";
        String vMake = vehicle.getMake().trim().toLowerCase(Locale.ROOT);
        String vModel = vehicle.getModel().trim().toLowerCase(Locale.ROOT);

        return allCustomerQuotes.stream()
                .filter(q -> {
                    // Match by registration number if present
                    if (!vReg.isBlank() && q.getRegistrationNumber() != null && !q.getRegistrationNumber().isBlank()) {
                        return q.getRegistrationNumber().trim().toUpperCase(Locale.ROOT).equals(vReg);
                    }
                    // Or match by make & model
                    boolean makeMatch = q.getVehicleMake() != null && q.getVehicleMake().trim().toLowerCase(Locale.ROOT).equals(vMake);
                    boolean modelMatch = q.getVehicleModel() != null && q.getVehicleModel().trim().toLowerCase(Locale.ROOT).equals(vModel);
                    return makeMatch && modelMatch;
                })
                .map(QuoteRequestDto::fromEntity)
                .toList();
    }
}
