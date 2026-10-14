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
}

