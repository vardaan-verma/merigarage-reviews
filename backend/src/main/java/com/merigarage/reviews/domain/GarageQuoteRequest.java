package com.merigarage.reviews.domain;

import com.merigarage.reviews.domain.enums.QuoteRequestStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "garage_quote_requests")
public class GarageQuoteRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 30)
    @Column(name = "reference_number", nullable = false, unique = true, length = 30)
    private String referenceNumber;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_user_id", nullable = false)
    private User customerUser;

    @NotBlank
    @Size(max = 50)
    @Column(name = "vehicle_type", nullable = false, length = 50)
    private String vehicleType;

    @NotBlank
    @Size(max = 100)
    @Column(name = "vehicle_make", nullable = false, length = 100)
    private String vehicleMake;

    @NotBlank
    @Size(max = 100)
    @Column(name = "vehicle_model", nullable = false, length = 100)
    private String vehicleModel;

    @Column(name = "vehicle_year")
    private Integer vehicleYear;

    @Size(max = 50)
    @Column(name = "fuel_type", length = 50)
    private String fuelType;

    @Size(max = 50)
    @Column(name = "registration_number", length = 50)
    private String registrationNumber;

    @Column(name = "odometer_reading")
    private Integer odometerReading;

    @NotBlank
    @Column(name = "problem_description", nullable = false, columnDefinition = "TEXT")
    private String problemDescription;

    @Column(name = "customer_message", columnDefinition = "TEXT")
    private String customerMessage;

    @NotBlank
    @Size(max = 20)
    @Column(name = "contact_phone", nullable = false, length = 20)
    private String contactPhone;

    @Size(max = 255)
    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "preferred_date")
    private LocalDate preferredDate;

    @Column(name = "estimated_min_price", precision = 10, scale = 2)
    private BigDecimal estimatedMinPrice;

    @Column(name = "estimated_max_price", precision = 10, scale = 2)
    private BigDecimal estimatedMaxPrice;

    @Column(name = "proposed_quote_amount", precision = 10, scale = 2)
    private BigDecimal proposedQuoteAmount;

    @Column(name = "owner_notes", columnDefinition = "TEXT")
    private String ownerNotes;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private QuoteRequestStatus status = QuoteRequestStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "quote_request_services",
            joinColumns = @JoinColumn(name = "quote_request_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private Set<Service> services = new HashSet<>();

    @OneToMany(mappedBy = "quoteRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<QuoteRequestMessage> messages = new ArrayList<>();

    public GarageQuoteRequest() {
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = QuoteRequestStatus.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public Garage getGarage() {
        return garage;
    }

    public void setGarage(Garage garage) {
        this.garage = garage;
    }

    public User getCustomerUser() {
        return customerUser;
    }

    public void setCustomerUser(User customerUser) {
        this.customerUser = customerUser;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehicleMake() {
        return vehicleMake;
    }

    public void setVehicleMake(String vehicleMake) {
        this.vehicleMake = vehicleMake;
    }

    public String getVehicleModel() {
        return vehicleModel;
    }

    public void setVehicleModel(String vehicleModel) {
        this.vehicleModel = vehicleModel;
    }

    public Integer getVehicleYear() {
        return vehicleYear;
    }

    public void setVehicleYear(Integer vehicleYear) {
        this.vehicleYear = vehicleYear;
    }

    public String getFuelType() {
        return fuelType;
    }

    public void setFuelType(String fuelType) {
        this.fuelType = fuelType;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public Integer getOdometerReading() {
        return odometerReading;
    }

    public void setOdometerReading(Integer odometerReading) {
        this.odometerReading = odometerReading;
    }

    public String getProblemDescription() {
        return problemDescription;
    }

    public void setProblemDescription(String problemDescription) {
        this.problemDescription = problemDescription;
    }

    public String getCustomerMessage() {
        return customerMessage;
    }

    public void setCustomerMessage(String customerMessage) {
        this.customerMessage = customerMessage;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public LocalDate getPreferredDate() {
        return preferredDate;
    }

    public void setPreferredDate(LocalDate preferredDate) {
        this.preferredDate = preferredDate;
    }

    public BigDecimal getEstimatedMinPrice() {
        return estimatedMinPrice;
    }

    public void setEstimatedMinPrice(BigDecimal estimatedMinPrice) {
        this.estimatedMinPrice = estimatedMinPrice;
    }

    public BigDecimal getEstimatedMaxPrice() {
        return estimatedMaxPrice;
    }

    public void setEstimatedMaxPrice(BigDecimal estimatedMaxPrice) {
        this.estimatedMaxPrice = estimatedMaxPrice;
    }

    public BigDecimal getProposedQuoteAmount() {
        return proposedQuoteAmount;
    }

    public void setProposedQuoteAmount(BigDecimal proposedQuoteAmount) {
        this.proposedQuoteAmount = proposedQuoteAmount;
    }

    public String getOwnerNotes() {
        return ownerNotes;
    }

    public void setOwnerNotes(String ownerNotes) {
        this.ownerNotes = ownerNotes;
    }

    public QuoteRequestStatus getStatus() {
        return status;
    }

    public void setStatus(QuoteRequestStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Set<Service> getServices() {
        return services;
    }

    public void setServices(Set<Service> services) {
        this.services = services;
    }

    public List<QuoteRequestMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<QuoteRequestMessage> messages) {
        this.messages = messages;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GarageQuoteRequest that = (GarageQuoteRequest) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
