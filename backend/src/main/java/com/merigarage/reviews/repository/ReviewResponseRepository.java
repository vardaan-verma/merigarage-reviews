package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.ReviewResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReviewResponseRepository extends JpaRepository<ReviewResponse, Long> {

    Optional<ReviewResponse> findByReviewId(Long reviewId);

    boolean existsByReviewId(Long reviewId);
}
