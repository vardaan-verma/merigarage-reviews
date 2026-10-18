package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.ReviewReport;
import com.merigarage.reviews.domain.enums.ReviewReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {

    @EntityGraph(attributePaths = {"review", "garage", "reporter", "resolvedBy"})
    Optional<ReviewReport> findWithDetailsById(Long id);

    boolean existsByReviewIdAndReporterIdAndStatus(Long reviewId, Long reporterId, ReviewReportStatus status);

    long countByStatus(ReviewReportStatus status);

    List<ReviewReport> findByGarageIdOrderByCreatedAtDesc(Long garageId);

    @Query("""
        SELECT r FROM ReviewReport r
        JOIN FETCH r.review rev
        JOIN FETCH r.garage g
        JOIN FETCH r.reporter rep
        LEFT JOIN FETCH rev.user author
        LEFT JOIN FETCH r.resolvedBy res
        WHERE (:status IS NULL OR r.status = :status)
          AND (:search IS NULL OR LOWER(g.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(g.city) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(rep.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(rep.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR (author IS NOT NULL AND LOWER(author.fullName) LIKE LOWER(CONCAT('%', :search, '%')))
               OR LOWER(rev.reviewText) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(r.reportReason) LIKE LOWER(CONCAT('%', :search, '%'))
               OR CAST(r.id AS string) = :search
               OR CAST(rev.id AS string) = :search)
    """)
    Page<ReviewReport> searchReports(
            @Param("status") ReviewReportStatus status,
            @Param("search") String search,
            Pageable pageable
    );
}
