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
}
