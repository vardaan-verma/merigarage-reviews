package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GarageQuoteRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageQuoteRequestRepository extends JpaRepository<GarageQuoteRequest, Long> {

    @Query("""
        SELECT r FROM GarageQuoteRequest r
        LEFT JOIN FETCH r.garage g
        LEFT JOIN FETCH r.customerUser u
        WHERE r.customerUser.id = :customerUserId
        ORDER BY r.createdAt DESC
    """)
    List<GarageQuoteRequest> findByCustomerUserId(@Param("customerUserId") Long customerUserId);

    @Query("""
        SELECT r FROM GarageQuoteRequest r
        LEFT JOIN FETCH r.garage g
        LEFT JOIN FETCH r.customerUser u
        WHERE r.garage.id = :garageId
        ORDER BY r.createdAt DESC
    """)
    List<GarageQuoteRequest> findByGarageId(@Param("garageId") Long garageId);

    @Query("""
        SELECT r FROM GarageQuoteRequest r
        LEFT JOIN FETCH r.garage g
        LEFT JOIN FETCH r.customerUser u
        LEFT JOIN FETCH r.services s
        WHERE r.id = :id
    """)
    Optional<GarageQuoteRequest> findByIdWithDetails(@Param("id") Long id);

    boolean existsByReferenceNumber(String referenceNumber);

    long countByStatus(com.merigarage.reviews.domain.enums.QuoteRequestStatus status);

    int countByCustomerUserId(Long customerUserId);

    int countByGarageId(Long garageId);

    List<GarageQuoteRequest> findTop5ByOrderByCreatedAtDesc();

    @Query(
        value = """
            SELECT DISTINCT r FROM GarageQuoteRequest r
            LEFT JOIN FETCH r.garage g
            LEFT JOIN FETCH r.customerUser u
            WHERE (:status IS NULL OR r.status = :status)
              AND (:fromDt IS NULL OR r.createdAt >= :fromDt)
              AND (:toDt IS NULL OR r.createdAt <= :toDt)
              AND (:search IS NULL OR LOWER(r.referenceNumber) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(g.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR (u.phoneNumber IS NOT NULL AND u.phoneNumber LIKE CONCAT('%', :search, '%')))
        """,
        countQuery = """
            SELECT COUNT(r) FROM GarageQuoteRequest r
            LEFT JOIN r.garage g
            LEFT JOIN r.customerUser u
            WHERE (:status IS NULL OR r.status = :status)
              AND (:fromDt IS NULL OR r.createdAt >= :fromDt)
              AND (:toDt IS NULL OR r.createdAt <= :toDt)
              AND (:search IS NULL OR LOWER(r.referenceNumber) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(g.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR (u.phoneNumber IS NOT NULL AND u.phoneNumber LIKE CONCAT('%', :search, '%')))
        """
    )
    org.springframework.data.domain.Page<GarageQuoteRequest> searchQuotesForAdmin(
        @Param("search") String search,
        @Param("status") com.merigarage.reviews.domain.enums.QuoteRequestStatus status,
        @Param("fromDt") java.time.LocalDateTime fromDt,
        @Param("toDt") java.time.LocalDateTime toDt,
        org.springframework.data.domain.Pageable pageable
    );
}
