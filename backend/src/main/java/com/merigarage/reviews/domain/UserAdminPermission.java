package com.merigarage.reviews.domain;

import com.merigarage.reviews.domain.id.UserAdminPermissionId;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "user_admin_permissions")
public class UserAdminPermission {

    @EmbeddedId
    private UserAdminPermissionId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("permissionId")
    @JoinColumn(name = "permission_id", nullable = false)
    private AdminPermission permission;

    @Column(name = "granted_at", nullable = false)
    private LocalDateTime grantedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_by_user_id", nullable = false)
    private User grantedBy;

    public UserAdminPermission() {
    }

    public UserAdminPermission(User user, AdminPermission permission, User grantedBy) {
        this.user = user;
        this.permission = permission;
        this.grantedBy = grantedBy;
        this.id = new UserAdminPermissionId(user.getId(), permission.getId());
        this.grantedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (grantedAt == null) {
            grantedAt = LocalDateTime.now();
        }
    }

    public UserAdminPermissionId getId() {
        return id;
    }

    public void setId(UserAdminPermissionId id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public AdminPermission getPermission() {
        return permission;
    }

    public void setPermission(AdminPermission permission) {
        this.permission = permission;
    }

    public LocalDateTime getGrantedAt() {
        return grantedAt;
    }

    public void setGrantedAt(LocalDateTime grantedAt) {
        this.grantedAt = grantedAt;
    }

    public User getGrantedBy() {
        return grantedBy;
    }

    public void setGrantedBy(User grantedBy) {
        this.grantedBy = grantedBy;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserAdminPermission that = (UserAdminPermission) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
