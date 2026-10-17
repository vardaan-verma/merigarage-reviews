package com.merigarage.reviews.service;

import com.merigarage.reviews.domain.AdminPermission;
import com.merigarage.reviews.domain.Role;
import com.merigarage.reviews.domain.User;
import com.merigarage.reviews.domain.UserAdminPermission;
import com.merigarage.reviews.domain.UserRole;
import com.merigarage.reviews.domain.enums.AdminPermissionCode;
import com.merigarage.reviews.domain.enums.RoleName;
import com.merigarage.reviews.domain.id.UserAdminPermissionId;
import com.merigarage.reviews.domain.id.UserRoleId;
import com.merigarage.reviews.exception.ForbiddenOperationException;
import com.merigarage.reviews.exception.ResourceNotFoundException;
import com.merigarage.reviews.repository.AdminPermissionRepository;
import com.merigarage.reviews.repository.RoleRepository;
import com.merigarage.reviews.repository.UserAdminPermissionRepository;
import com.merigarage.reviews.repository.UserRepository;
import com.merigarage.reviews.repository.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserAuthorizationService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AdminPermissionRepository permissionRepository;
    private final UserAdminPermissionRepository userAdminPermissionRepository;
    private final AuditTrailService auditTrailService;

    public UserAuthorizationService(UserRepository userRepository,
                                    RoleRepository roleRepository,
                                    UserRoleRepository userRoleRepository,
                                    AdminPermissionRepository permissionRepository,
                                    UserAdminPermissionRepository userAdminPermissionRepository,
                                    AuditTrailService auditTrailService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.permissionRepository = permissionRepository;
        this.userAdminPermissionRepository = userAdminPermissionRepository;
        this.auditTrailService = auditTrailService;
    }

    public void grantRole(Long targetUserId, RoleName roleName, User callerAdmin) {
        verifyAdminCaller(callerAdmin);

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found with id: " + targetUserId));

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        if (!userRoleRepository.existsByUserIdAndRoleId(targetUserId, role.getId())) {
            userRoleRepository.save(new UserRole(targetUser, role));
            if (auditTrailService != null) {
                auditTrailService.recordAction(callerAdmin, "USER_ROLE_ASSIGNMENT", "USER", targetUserId,
                        "GRANTED", "Role granted: " + roleName.name(), "{\"role\":\"" + roleName.name() + "\"}");
            }
        }
    }

    public void revokeRole(Long targetUserId, RoleName roleName, User callerAdmin) {
        verifyAdminCaller(callerAdmin);

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        UserRoleId id = new UserRoleId(targetUserId, role.getId());
        if (userRoleRepository.existsById(id)) {
            userRoleRepository.deleteById(id);
            if (auditTrailService != null) {
                auditTrailService.recordAction(callerAdmin, "USER_ROLE_REVOCATION", "USER", targetUserId,
                        "REVOKED", "Role revoked: " + roleName.name(), "{\"role\":\"" + roleName.name() + "\"}");
            }
        }
    }

    public void grantAdminPermission(Long targetUserId, AdminPermissionCode permissionCode, User callerAdmin) {
        verifyAdminCaller(callerAdmin);

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found with id: " + targetUserId));

        AdminPermission permission = permissionRepository.findByCode(permissionCode)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionCode));

        if (!userAdminPermissionRepository.existsByUserIdAndPermissionId(targetUserId, permission.getId())) {
            userAdminPermissionRepository.save(new UserAdminPermission(targetUser, permission, callerAdmin));
            if (auditTrailService != null) {
                auditTrailService.recordAction(callerAdmin, "USER_PERMISSION_GRANT", "USER", targetUserId,
                        "GRANTED", "Permission granted: " + permissionCode.name(), "{\"permission\":\"" + permissionCode.name() + "\"}");
            }
        }
    }

    public void revokeAdminPermission(Long targetUserId, AdminPermissionCode permissionCode, User callerAdmin) {
        verifyAdminCaller(callerAdmin);

        AdminPermission permission = permissionRepository.findByCode(permissionCode)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionCode));

        UserAdminPermissionId id = new UserAdminPermissionId(targetUserId, permission.getId());
        if (userAdminPermissionRepository.existsById(id)) {
            userAdminPermissionRepository.deleteById(id);
            if (auditTrailService != null) {
                auditTrailService.recordAction(callerAdmin, "USER_PERMISSION_REVOKE", "USER", targetUserId,
                        "REVOKED", "Permission revoked: " + permissionCode.name(), "{\"permission\":\"" + permissionCode.name() + "\"}");
            }
        }
    }

    private void verifyAdminCaller(User caller) {
        if (caller == null) {
            throw new ForbiddenOperationException("Caller authentication required.");
        }
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("Role ROLE_ADMIN not found."));

        if (!userRoleRepository.existsByUserIdAndRoleId(caller.getId(), adminRole.getId())) {
            throw new ForbiddenOperationException("Only administrators can manage roles and permissions.");
        }
    }
}
