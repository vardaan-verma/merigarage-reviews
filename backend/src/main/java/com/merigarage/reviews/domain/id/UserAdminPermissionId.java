package com.merigarage.reviews.domain.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class UserAdminPermissionId implements Serializable {

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "permission_id")
    private Byte permissionId;

    public UserAdminPermissionId() {
    }

    public UserAdminPermissionId(Long userId, Byte permissionId) {
        this.userId = userId;
        this.permissionId = permissionId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Byte getPermissionId() {
        return permissionId;
    }

    public void setPermissionId(Byte permissionId) {
        this.permissionId = permissionId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserAdminPermissionId that = (UserAdminPermissionId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(permissionId, that.permissionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, permissionId);
    }
}
