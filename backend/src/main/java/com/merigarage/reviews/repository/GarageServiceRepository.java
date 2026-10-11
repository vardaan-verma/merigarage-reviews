package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GarageService;
import com.merigarage.reviews.domain.id.GarageServiceId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageServiceRepository extends JpaRepository<GarageService, GarageServiceId> {

    List<GarageService> findByGarageId(Long garageId);

    List<GarageService> findByGarageIdAndIsAvailableTrue(Long garageId);

    List<GarageService> findByServiceId(Integer serviceId);

    void deleteByGarageId(Long garageId);
}
