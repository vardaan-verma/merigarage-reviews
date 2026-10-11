package com.merigarage.reviews.domain;

import com.merigarage.reviews.domain.id.GarageServiceId;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Objects;

@Entity
@Table(name = "garage_services")
public class GarageService {

    @EmbeddedId
    private GarageServiceId id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("garageId")
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("serviceId")
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    @Column(name = "starting_price", precision = 10, scale = 2)
    private BigDecimal startingPrice;

    @NotNull
    @Column(name = "is_available", nullable = false)
    private Boolean isAvailable = true;

    public GarageService() {
    }

    public GarageService(Garage garage, Service service, BigDecimal startingPrice, Boolean isAvailable) {
        this.garage = garage;
        this.service = service;
        this.startingPrice = startingPrice;
        this.isAvailable = isAvailable != null ? isAvailable : true;
        this.id = new GarageServiceId(garage.getId(), service.getId());
    }

    public GarageServiceId getId() {
        return id;
    }

    public void setId(GarageServiceId id) {
        this.id = id;
    }

    public Garage getGarage() {
        return garage;
    }

    public void setGarage(Garage garage) {
        this.garage = garage;
    }

    public Service getService() {
        return service;
    }

    public void setService(Service service) {
        this.service = service;
    }

    public BigDecimal getStartingPrice() {
        return startingPrice;
    }

    public void setStartingPrice(BigDecimal startingPrice) {
        this.startingPrice = startingPrice;
    }

    public Boolean getIsAvailable() {
        return isAvailable;
    }

    public void setIsAvailable(Boolean isAvailable) {
        this.isAvailable = isAvailable;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GarageService that = (GarageService) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
