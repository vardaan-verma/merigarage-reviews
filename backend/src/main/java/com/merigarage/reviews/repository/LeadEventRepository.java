package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.LeadEvent;
import com.merigarage.reviews.domain.enums.LeadEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LeadEventRepository extends JpaRepository<LeadEvent, Long> {

    boolean existsByEventId(String eventId);

    Optional<LeadEvent> findByEventId(String eventId);

    Page<LeadEvent> findByEventTypeOrderByCreatedAtDesc(LeadEventType eventType, Pageable pageable);

    Page<LeadEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<LeadEvent> findFirstBySessionIdAndEventTypeOrderByCreatedAtDesc(String sessionId, LeadEventType eventType);

    Optional<LeadEvent> findFirstBySessionIdOrderByCreatedAtDesc(String sessionId);

    long countByEventType(LeadEventType eventType);

    java.util.List<LeadEvent> findTop5ByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query("""
        SELECT e FROM LeadEvent e
        WHERE (:eventType IS NULL OR e.eventType = :eventType)
          AND (:city IS NULL OR LOWER(e.city) = LOWER(:city))
          AND (:state IS NULL OR LOWER(e.state) = LOWER(:state))
          AND (:serviceSlug IS NULL OR LOWER(e.serviceSlug) = LOWER(:serviceSlug))
          AND (:source IS NULL OR LOWER(e.source) = LOWER(:source))
          AND (:fromDt IS NULL OR e.createdAt >= :fromDt)
          AND (:toDt IS NULL OR e.createdAt <= :toDt)
          AND (:hasUser IS NULL OR (:hasUser = true AND e.user IS NOT NULL) OR (:hasUser = false AND e.user IS NULL))
          AND (:search IS NULL OR LOWER(e.sessionId) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(e.city) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(e.vehicleModel) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(e.vehicleMake) LIKE LOWER(CONCAT('%', :search, '%')))
    """)
    Page<LeadEvent> searchLeadEvents(
        @org.springframework.data.repository.query.Param("eventType") LeadEventType eventType,
        @org.springframework.data.repository.query.Param("city") String city,
        @org.springframework.data.repository.query.Param("state") String state,
        @org.springframework.data.repository.query.Param("serviceSlug") String serviceSlug,
        @org.springframework.data.repository.query.Param("source") String source,
        @org.springframework.data.repository.query.Param("hasUser") Boolean hasUser,
        @org.springframework.data.repository.query.Param("search") String search,
        @org.springframework.data.repository.query.Param("fromDt") java.time.LocalDateTime fromDt,
        @org.springframework.data.repository.query.Param("toDt") java.time.LocalDateTime toDt,
        Pageable pageable
    );
}
