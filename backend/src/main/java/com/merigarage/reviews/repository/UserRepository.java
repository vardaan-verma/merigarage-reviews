package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByStatus(UserStatus status);

    long countByStatus(UserStatus status);

    long countByCreatedAtAfter(LocalDateTime after);

    @Query("""
        SELECT u FROM User u
        WHERE (:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
           OR (:search IS NOT NULL AND u.phoneNumber LIKE CONCAT('%', :search, '%')))
          AND (:status IS NULL OR u.status = :status)
          AND (:fromDt IS NULL OR u.createdAt >= :fromDt)
          AND (:toDt IS NULL OR u.createdAt <= :toDt)
    """)
    Page<User> searchUsers(
        @Param("search") String search,
        @Param("status") UserStatus status,
        @Param("fromDt") LocalDateTime fromDt,
        @Param("toDt") LocalDateTime toDt,
        Pageable pageable
    );
}
