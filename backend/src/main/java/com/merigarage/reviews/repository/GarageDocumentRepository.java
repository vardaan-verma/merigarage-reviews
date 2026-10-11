package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.GarageDocument;
import com.merigarage.reviews.domain.enums.DocumentVerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageDocumentRepository extends JpaRepository<GarageDocument, Long> {

    List<GarageDocument> findByGarageId(Long garageId);

    List<GarageDocument> findByGarageIdAndVerificationStatus(Long garageId, DocumentVerificationStatus verificationStatus);

    List<GarageDocument> findByVerificationStatus(DocumentVerificationStatus verificationStatus);
}
