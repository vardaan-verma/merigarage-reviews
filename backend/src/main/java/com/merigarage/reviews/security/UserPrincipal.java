package com.merigarage.reviews.security;

import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.enums.UserStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.*;

public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String passwordHash;
    private final String fullName;
    private final String phoneNumber;
    private final String profilePhotoUrl;
    private final UserStatus status;
    private final Set<RoleName> roles;
    private final Set<AdminPermissionCode> permissions;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(Long id,
                         String email,
                         String passwordHash,
                         String fullName,
                         UserStatus status,
                         Set<RoleName> roles,
                         Set<AdminPermissionCode> permissions) {
        this(id, email, passwordHash, fullName, null, null, status, roles, permissions);
    }

    public UserPrincipal(Long id,
                         String email,
                         String passwordHash,
                         String fullName,
                         String phoneNumber,
                         UserStatus status,
                         Set<RoleName> roles,
                         Set<AdminPermissionCode> permissions) {
        this(id, email, passwordHash, fullName, phoneNumber, null, status, roles, permissions);
    }

    public UserPrincipal(Long id,
                         String email,
                         String passwordHash,
                         String fullName,
                         String phoneNumber,
                         String profilePhotoUrl,
                         UserStatus status,
                         Set<RoleName> roles,
                         Set<AdminPermissionCode> permissions) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.profilePhotoUrl = profilePhotoUrl;
        this.status = status;
        this.roles = Collections.unmodifiableSet(roles != null ? roles : Collections.emptySet());
        this.permissions = Collections.unmodifiableSet(permissions != null ? permissions : Collections.emptySet());

        Set<GrantedAuthority> auths = new HashSet<>();
        if (roles != null) {
            for (RoleName role : roles) {
                auths.add(new SimpleGrantedAuthority(role.name()));
            }
        }
        if (permissions != null) {
            for (AdminPermissionCode permission : permissions) {
                auths.add(new SimpleGrantedAuthority(permission.name()));
            }
        }
        this.authorities = Collections.unmodifiableSet(auths);
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getProfilePhotoUrl() {
        return profilePhotoUrl;
    }

    public UserStatus getStatus() {
        return status;
    }

    public Set<RoleName> getRoles() {
        return roles;
    }

    public Set<AdminPermissionCode> getPermissions() {
        return permissions;
    }

    public boolean hasRole(RoleName roleName) {
        return roles.contains(roleName);
    }

    public boolean hasAdminPermission(AdminPermissionCode code) {
        return permissions.contains(code);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return status != UserStatus.DEACTIVATED;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != UserStatus.SUSPENDED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserPrincipal that = (UserPrincipal) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
