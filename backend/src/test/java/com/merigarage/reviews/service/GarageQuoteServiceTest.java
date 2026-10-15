package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.Garage;
import com.merigarage.reviews.domain.GarageQuoteRequest;
import com.merigarage.reviews.domain.QuoteRequestMessage;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.enums.GarageApprovalStatus;
import com.merigarage.reviews.domain.enums.QuoteRequestStatus;
import com.merigarage.reviews.domain.enums.ServiceCategory;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.InvalidOperationException;
import com.merigarage.reviews.exception.ValidationException;
import com.merigarage.reviews.repository.GarageQuoteRequestRepository;
import com.merigarage.reviews.repository.GarageRepository;
import com.merigarage.reviews.repository.GarageServiceRepository;
import com.merigarage.reviews.repository.QuoteRequestMessageRepository;
import com.merigarage.reviews.service.dto.CreateQuoteRequest;
import com.merigarage.reviews.service.dto.QuoteCustomerActionRequest;
import com.merigarage.reviews.service.dto.QuoteOwnerResponseRequest;
import com.merigarage.reviews.service.dto.QuoteRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GarageQuoteServiceTest {

    @Mock
    private GarageQuoteRequestRepository quoteRequestRepository;

    @Mock
    private QuoteRequestMessageRepository messageRepository;

    @Mock
    private GarageRepository garageRepository;

    @Mock
    private GarageServiceRepository garageServiceRepository;

    @InjectMocks
    private GarageQuoteService quoteService;

    private User customer;
    private User owner;
    private Garage garage;
    private com.merigarage.reviews.domain.Service service1;
    private com.merigarage.reviews.domain.GarageService garageService1;

    @BeforeEach
    void setUp() {
        customer = new User("customer@example.com", "hash", "John Customer");
        customer.setId(100L);

        owner = new User("owner@example.com", "hash", "Bob Owner");
        owner.setId(200L);

        garage = new Garage();
        garage.setId(1L);
        garage.setName("Fast Car Repairs");
        garage.setSlug("fast-car-repairs");
        garage.setCity("Delhi");
        garage.setState("Delhi");
        garage.setAddressLine1("123 Workshop Road");
        garage.setPostalCode("110001");
        garage.setPhoneNumber("9876543210");
        garage.setApprovalStatus(GarageApprovalStatus.APPROVED);
        garage.setOwner(owner);

        service1 = new com.merigarage.reviews.domain.Service("Oil Change", "oil-change", ServiceCategory.PERIODIC_MAINTENANCE, "Synthetic oil");
        service1.setId(10);

        garageService1 = new com.merigarage.reviews.domain.GarageService(garage, service1, new BigDecimal("1200.00"), true);
    }

    @Test
    void createQuoteRequest_Succeeds_AndCalculatesIndicativePricing() {
        when(garageRepository.findById(1L)).thenReturn(Optional.of(garage));
        when(garageServiceRepository.findByGarageIdAndIsAvailableTrue(1L)).thenReturn(List.of(garageService1));
        when(quoteRequestRepository.existsByReferenceNumber(any())).thenReturn(false);
        when(quoteRequestRepository.save(any(GarageQuoteRequest.class))).thenAnswer(inv -> {
            GarageQuoteRequest r = inv.getArgument(0);
            r.setId(50L);
            return r;
        });

        CreateQuoteRequest req = new CreateQuoteRequest(
                1L,
                List.of(10),
                "CAR",
                "Tata",
                "Nexon",
                2022,
                "PETROL",
                "DL01AB1234",
                30000,
                "Engine making knocking noise",
                "Please check asap",
                "9876543210",
                "customer@example.com",
                LocalDate.now().plusDays(2)
        );

        QuoteRequestDto result = quoteService.createQuoteRequest(req, customer);

        assertThat(result).isNotNull();
        assertThat(result.referenceNumber()).startsWith("MG-Q-");
        assertThat(result.status()).isEqualTo(QuoteRequestStatus.PENDING);
        assertThat(result.estimatedMinPrice()).isEqualByComparingTo("1200.00");
        verify(quoteRequestRepository).save(any(GarageQuoteRequest.class));
        verify(messageRepository).save(any(QuoteRequestMessage.class));
    }

    @Test
    void createQuoteRequest_RejectsUnapprovedGarage() {
        garage.setApprovalStatus(GarageApprovalStatus.PENDING);
        when(garageRepository.findById(1L)).thenReturn(Optional.of(garage));

        CreateQuoteRequest req = new CreateQuoteRequest(
                1L,
                List.of(10),
                "CAR",
                "Tata",
                "Nexon",
                null,
                null,
                null,
                null,
                "Engine making knocking noise",
                null,
                "9876543210",
                null,
                null
        );

        assertThatThrownBy(() -> quoteService.createQuoteRequest(req, customer))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("approved workshops");
    }

    @Test
    void processOwnerResponse_ProvidesQuotationSuccessfully() {
        GarageQuoteRequest request = new GarageQuoteRequest();
        request.setId(50L);
        request.setReferenceNumber("MG-Q-20261015-ABCD");
        request.setGarage(garage);
        request.setCustomerUser(customer);
        request.setStatus(QuoteRequestStatus.PENDING);

        when(quoteRequestRepository.findByIdWithDetails(50L)).thenReturn(Optional.of(request));
        when(garageRepository.findById(1L)).thenReturn(Optional.of(garage));
        when(quoteRequestRepository.save(any())).thenReturn(request);

        QuoteOwnerResponseRequest responseReq = new QuoteOwnerResponseRequest(
                "QUOTE",
                new BigDecimal("4500.00"),
                "Includes genuine oil filter and 4L synthetic engine oil"
        );

        QuoteRequestDto result = quoteService.processOwnerResponse(50L, responseReq, owner);

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo(QuoteRequestStatus.QUOTED);
        assertThat(result.proposedQuoteAmount()).isEqualByComparingTo("4500.00");
        assertThat(result.ownerNotes()).contains("synthetic engine oil");
    }

    @Test
    void processOwnerResponse_RejectsUnauthorizedOwner() {
        User anotherUser = new User("unauthorized@example.com", "hash", "Other User");
        anotherUser.setId(999L);

        GarageQuoteRequest request = new GarageQuoteRequest();
        request.setId(50L);
        request.setGarage(garage);
        request.setCustomerUser(customer);

        when(quoteRequestRepository.findByIdWithDetails(50L)).thenReturn(Optional.of(request));
        when(garageRepository.findById(1L)).thenReturn(Optional.of(garage));

        QuoteOwnerResponseRequest responseReq = new QuoteOwnerResponseRequest(
                "QUOTE",
                new BigDecimal("4500.00"),
                "Note"
        );

        assertThatThrownBy(() -> quoteService.processOwnerResponse(50L, responseReq, anotherUser))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void processCustomerAction_AcceptsQuotedRequest() {
        GarageQuoteRequest request = new GarageQuoteRequest();
        request.setId(50L);
        request.setGarage(garage);
        request.setCustomerUser(customer);
        request.setStatus(QuoteRequestStatus.QUOTED);
        request.setProposedQuoteAmount(new BigDecimal("4500.00"));

        when(quoteRequestRepository.findByIdWithDetails(50L)).thenReturn(Optional.of(request));
        when(quoteRequestRepository.save(any())).thenReturn(request);

        QuoteCustomerActionRequest actionReq = new QuoteCustomerActionRequest("ACCEPT", "Will arrive tomorrow");

        QuoteRequestDto result = quoteService.processCustomerAction(50L, actionReq, customer);

        assertThat(result.status()).isEqualTo(QuoteRequestStatus.ACCEPTED);
    }
}
