package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GarageProfileEdit;
import com.merigarage.reviews.domain.enums.EditStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageProfileEditRepository extends JpaRepository<GarageProfileEdit, Long> {

    List<GarageProfileEdit> findByGarageId(Long garageId);

    List<GarageProfileEdit> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    Optional<GarageProfileEdit> findByGarageIdAndStatus(Long garageId, EditStatus status);

    List<GarageProfileEdit> findByStatus(EditStatus status);
}
