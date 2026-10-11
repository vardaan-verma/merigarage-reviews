package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.enums.ReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByGarageIdAndUserId(Long garageId, Long userId);

    boolean existsByGarageIdAndUserId(Long garageId, Long userId);

    List<Review> findByGarageIdAndIsDeletedFalseOrderByCreatedAtDesc(Long garageId);

    org.springframework.data.domain.Page<Review> findByGarageIdAndIsDeletedFalse(Long garageId, org.springframework.data.domain.Pageable pageable);

    List<Review> findByGarageIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(Long garageId, ReviewStatus status);

    org.springframework.data.domain.Page<Review> findByGarageIdAndStatusAndIsDeletedFalse(Long garageId, ReviewStatus status, org.springframework.data.domain.Pageable pageable);

    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByGarageIdAndIsDeletedFalse(Long garageId);
}
