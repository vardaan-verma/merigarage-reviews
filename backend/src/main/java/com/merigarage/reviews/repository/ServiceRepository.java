package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.Service;
import com.merigarage.reviews.domain.enums.ServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Integer> {

    Optional<Service> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Service> findByIsActiveTrueOrderByDisplayOrderAsc();

    List<Service> findByCategoryAndIsActiveTrue(ServiceCategory category);
}
