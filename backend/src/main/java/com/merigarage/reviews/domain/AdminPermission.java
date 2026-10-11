package com.merigarage.reviews.domain;

import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Objects;

@Entity
@Table(name = "admin_permissions")
public class AdminPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Byte id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private AdminPermissionCode code;

    @NotBlank
    @Size(max = 255)
    @Column(name = "description", nullable = false, length = 255)
    private String description;

    public AdminPermission() {
    }

    public AdminPermission(AdminPermissionCode code, String description) {
        this.code = code;
        this.description = description;
    }

    public Byte getId() {
        return id;
    }

    public void setId(Byte id) {
        this.id = id;
    }

    public AdminPermissionCode getCode() {
        return code;
    }

    public void setCode(AdminPermissionCode code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AdminPermission that = (AdminPermission) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
