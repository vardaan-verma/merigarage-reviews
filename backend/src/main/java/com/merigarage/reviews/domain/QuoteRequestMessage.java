package com.merigarage.reviews.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "quote_request_messages")
public class QuoteRequestMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quote_request_id", nullable = false)
    private GarageQuoteRequest quoteRequest;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_user_id", nullable = false)
    private User senderUser;

    @NotBlank
    @Column(name = "sender_role", nullable = false, length = 30)
    private String senderRole; // "CUSTOMER" or "OWNER"

    @NotBlank
    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public QuoteRequestMessage() {
    }

    public QuoteRequestMessage(GarageQuoteRequest quoteRequest, User senderUser, String senderRole, String messageText) {
        this.quoteRequest = quoteRequest;
        this.senderUser = senderUser;
        this.senderRole = senderRole;
        this.messageText = messageText;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public GarageQuoteRequest getQuoteRequest() {
        return quoteRequest;
    }

    public void setQuoteRequest(GarageQuoteRequest quoteRequest) {
        this.quoteRequest = quoteRequest;
    }

    public User getSenderUser() {
        return senderUser;
    }

    public void setSenderUser(User senderUser) {
        this.senderUser = senderUser;
    }

    public String getSenderRole() {
        return senderRole;
    }

    public void setSenderRole(String senderRole) {
        this.senderRole = senderRole;
    }

    public String getMessageText() {
        return messageText;
    }

    public void setMessageText(String messageText) {
        this.messageText = messageText;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
