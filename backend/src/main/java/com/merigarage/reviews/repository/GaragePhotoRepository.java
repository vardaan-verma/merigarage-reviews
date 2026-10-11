package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GaragePhoto;
import com.merigarage.reviews.domain.enums.ModerationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GaragePhotoRepository extends JpaRepository<GaragePhoto, Long> {

    List<GaragePhoto> findByGarageIdAndIsDeletedFalseOrderByDisplayOrderAsc(Long garageId);

    Optional<GaragePhoto> findByGarageIdAndIsCoverTrueAndIsDeletedFalse(Long garageId);

    long countByGarageIdAndIsDeletedFalseAndModerationStatusNot(Long garageId, ModerationStatus moderationStatus);

    List<GaragePhoto> findByModerationStatus(ModerationStatus status);
}
