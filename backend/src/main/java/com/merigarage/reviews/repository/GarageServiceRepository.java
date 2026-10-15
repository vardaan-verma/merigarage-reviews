package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GarageService;
import com.merigarage.reviews.domain.id.GarageServiceId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageServiceRepository extends JpaRepository<GarageService, GarageServiceId> {

    @org.springframework.data.jpa.repository.Query("""
        SELECT gs FROM GarageService gs
        JOIN FETCH gs.service s
        WHERE gs.garage.id = :garageId
        ORDER BY s.displayOrder ASC
    """)
    List<GarageService> findByGarageId(@org.springframework.data.repository.query.Param("garageId") Long garageId);

    @org.springframework.data.jpa.repository.Query("""
        SELECT gs FROM GarageService gs
        JOIN FETCH gs.service s
        WHERE gs.garage.id = :garageId
          AND gs.isAvailable = true
        ORDER BY s.displayOrder ASC
    """)
    List<GarageService> findByGarageIdAndIsAvailableTrue(@org.springframework.data.repository.query.Param("garageId") Long garageId);

    List<GarageService> findByServiceId(Integer serviceId);

    void deleteByGarageId(Long garageId);

    @org.springframework.data.jpa.repository.Query("""
        SELECT gs FROM GarageService gs
        JOIN FETCH gs.service s
        WHERE gs.garage.id IN :garageIds
          AND gs.isAvailable = true
          AND s.isActive = true
        ORDER BY s.displayOrder ASC
    """)
    List<GarageService> findActiveServicesByGarageIds(@org.springframework.data.repository.query.Param("garageIds") List<Long> garageIds);
}
