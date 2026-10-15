package com.merigarage.reviews.service.dto;

import com.merigarage.reviews.domain.QuoteRequestMessage;
import java.time.LocalDateTime;

public record QuoteRequestMessageDto(
        Long id,
        Long quoteRequestId,
        Long senderUserId,
        String senderName,
        String senderRole,
        String messageText,
        LocalDateTime createdAt
) {
    public static QuoteRequestMessageDto fromEntity(QuoteRequestMessage msg) {
        if (msg == null) return null;
        return new QuoteRequestMessageDto(
                msg.getId(),
                msg.getQuoteRequest() != null ? msg.getQuoteRequest().getId() : null,
                msg.getSenderUser() != null ? msg.getSenderUser().getId() : null,
                msg.getSenderUser() != null ? msg.getSenderUser().getFullName() : "User",
                msg.getSenderRole(),
                msg.getMessageText(),
                msg.getCreatedAt()
        );
    }
}
