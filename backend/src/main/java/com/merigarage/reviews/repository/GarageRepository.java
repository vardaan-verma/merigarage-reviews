package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageRepository extends JpaRepository<Garage, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Garage g WHERE g.id = :id")
    Optional<Garage> findByIdForUpdate(@Param("id") Long id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"owner", "createdBy"})
    @Override
    Optional<Garage> findById(Long id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"owner", "createdBy"})
    Optional<Garage> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Garage> findByApprovalStatus(GarageApprovalStatus approvalStatus);

    org.springframework.data.domain.Page<Garage> findByApprovalStatus(GarageApprovalStatus approvalStatus, org.springframework.data.domain.Pageable pageable);

    List<Garage> findByApprovalStatusAndCity(GarageApprovalStatus approvalStatus, String city);

    org.springframework.data.domain.Page<Garage> findByApprovalStatusAndCity(GarageApprovalStatus approvalStatus, String city, org.springframework.data.domain.Pageable pageable);

    List<Garage> findByApprovalStatusAndCityAndIsVerified(GarageApprovalStatus approvalStatus, String city, Boolean isVerified);

    org.springframework.data.domain.Page<Garage> findByApprovalStatusAndCityAndIsVerified(GarageApprovalStatus approvalStatus, String city, Boolean isVerified, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Garage> findByApprovalStatusAndIsVerified(GarageApprovalStatus approvalStatus, Boolean isVerified, org.springframework.data.domain.Pageable pageable);

    List<Garage> findByOwnerId(Long ownerId);

    List<Garage> findByCreatedBy_Id(Long createdByUserId);

    @Query("SELECT DISTINCT g FROM Garage g WHERE g.owner.id = :userId OR (g.owner IS NULL AND g.createdBy.id = :userId)")
    List<Garage> findByOwnerOrCreator(@Param("userId") Long userId);

    @Query(
            value = """
                SELECT DISTINCT g FROM Garage g
                LEFT JOIN GarageService gs ON gs.garage.id = g.id AND gs.isAvailable = true
                LEFT JOIN gs.service s ON s.isActive = true
                WHERE g.approvalStatus = :approvalStatus
                  AND (:city IS NULL OR LOWER(g.city) = LOWER(:city))
                  AND (:isVerified IS NULL OR g.isVerified = :isVerified)
                  AND (:serviceId IS NULL OR (gs.service.id = :serviceId AND gs.isAvailable = true AND s.isActive = true))
                  AND (:serviceSlug IS NULL OR (s.slug = :serviceSlug AND gs.isAvailable = true AND s.isActive = true))
            """,
            countQuery = """
                SELECT COUNT(DISTINCT g) FROM Garage g
                LEFT JOIN GarageService gs ON gs.garage.id = g.id AND gs.isAvailable = true
                LEFT JOIN gs.service s ON s.isActive = true
                WHERE g.approvalStatus = :approvalStatus
                  AND (:city IS NULL OR LOWER(g.city) = LOWER(:city))
                  AND (:isVerified IS NULL OR g.isVerified = :isVerified)
                  AND (:serviceId IS NULL OR (gs.service.id = :serviceId AND gs.isAvailable = true AND s.isActive = true))
                  AND (:serviceSlug IS NULL OR (s.slug = :serviceSlug AND gs.isAvailable = true AND s.isActive = true))
            """
    )
    org.springframework.data.domain.Page<Garage> findApprovedWithFilters(
            @Param("approvalStatus") GarageApprovalStatus approvalStatus,
            @Param("city") String city,
            @Param("isVerified") Boolean isVerified,
            @Param("serviceId") Integer serviceId,
            @Param("serviceSlug") String serviceSlug,
            org.springframework.data.domain.Pageable pageable
    );
}

