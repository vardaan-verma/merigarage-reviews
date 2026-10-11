package com.merigarage.reviews.domain.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class GarageServiceId implements Serializable {

    @Column(name = "garage_id")
    private Long garageId;

    @Column(name = "service_id")
    private Integer serviceId;

    public GarageServiceId() {
    }

    public GarageServiceId(Long garageId, Integer serviceId) {
        this.garageId = garageId;
        this.serviceId = serviceId;
    }

    public Long getGarageId() {
        return garageId;
    }

    public void setGarageId(Long garageId) {
        this.garageId = garageId;
    }

    public Integer getServiceId() {
        return serviceId;
    }

    public void setServiceId(Integer serviceId) {
        this.serviceId = serviceId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GarageServiceId that = (GarageServiceId) o;
        return Objects.equals(garageId, that.garageId) && Objects.equals(serviceId, that.serviceId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(garageId, serviceId);
    }
}
