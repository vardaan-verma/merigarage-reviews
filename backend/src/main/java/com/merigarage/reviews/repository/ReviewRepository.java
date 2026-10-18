package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.Review;
import com.merigarage.reviews.domain.enums.ReviewStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByGarageIdAndUserIdOrderByCreatedAtDesc(Long garageId, Long userId);

    boolean existsByGarageIdAndUserId(Long garageId, Long userId);

    @EntityGraph(attributePaths = {"user", "garage"})
    List<Review> findByGarageIdAndIsDeletedFalseOrderByCreatedAtDesc(Long garageId);

    org.springframework.data.domain.Page<Review> findByGarageIdAndIsDeletedFalse(Long garageId, org.springframework.data.domain.Pageable pageable);

    List<Review> findByGarageIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(Long garageId, ReviewStatus status);

    @EntityGraph(attributePaths = {"user", "garage"})
    org.springframework.data.domain.Page<Review> findByGarageIdAndStatusAndIsDeletedFalse(Long garageId, ReviewStatus status, org.springframework.data.domain.Pageable pageable);

    @EntityGraph(attributePaths = {"user", "garage"})
    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByGarageIdAndIsDeletedFalse(Long garageId);

    long countByStatusAndIsDeletedFalse(ReviewStatus status);

    long countByIsDeletedFalse();
}
