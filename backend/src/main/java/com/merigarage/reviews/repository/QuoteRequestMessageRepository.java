package com.merigarage.reviews.repository;

import com.merigarage.reviews.domain.QuoteRequestMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuoteRequestMessageRepository extends JpaRepository<QuoteRequestMessage, Long> {

    @Query("""
        SELECT m FROM QuoteRequestMessage m
        LEFT JOIN FETCH m.senderUser u
        WHERE m.quoteRequest.id = :requestId
        ORDER BY m.createdAt ASC
    """)
    List<QuoteRequestMessage> findByQuoteRequestId(@Param("requestId") Long requestId);
}
