package com.crm.service.impl;

import com.crm.dto.request.ChangePasswordRequest;
import com.crm.dto.request.UserCreateRequest;
import com.crm.dto.request.UserStatusRequest;
import com.crm.dto.request.UserUpdateRequest;
import com.crm.dto.response.UserResponse;
import com.crm.exception.BusinessException;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.UserMapper;
import com.crm.model.AuditLog;
import com.crm.model.LeadAssignment;
import com.crm.model.Role;
import com.crm.model.Sale;
import com.crm.model.User;
import com.crm.repository.*;
import com.crm.service.AuditService;
import com.crm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final LeadAssignmentRepository leadAssignmentRepository;
    private final CallRepository callRepository;
    private final NoteRepository noteRepository;
    private final FollowUpRepository followUpRepository;
    private final SalesRepository salesRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final AuditService auditService;

    @Override
    @Transactional
    public UserResponse createUser(UserCreateRequest request, Long currentUserId) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User already exists with email: " + request.getEmail());
        }

        String roleName = request.getRole() != null ? request.getRole().toUpperCase() : "USER";
        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName;
        }

        String finalRoleName = roleName;
        Role role = roleRepository.findByName(finalRoleName)
                .orElseGet(() -> roleRepository.save(Role.builder().name(finalRoleName).build()));

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase().trim())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .status(request.getStatus() != null ? request.getStatus().toUpperCase() : "ACTIVE")
                .build();

        User saved = userRepository.save(user);

        auditService.logAction(currentUserId, "User", saved.getId(), "CREATE", null,
                "Name: " + saved.getName() + ", Role: " + saved.getRole().getName());

        return userMapper.toResponse(saved, 0, 0);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request, Long currentUserId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        String oldDetails = "Name: " + user.getName() + ", Role: " + user.getRole().getName() + ", Status: " + user.getStatus();

        user.setName(request.getName());
        user.setPhone(request.getPhone());

        if (request.getRole() != null) {
            String roleName = request.getRole().toUpperCase();
            if (!roleName.startsWith("ROLE_")) {
                roleName = "ROLE_" + roleName;
            }
            String finalRole = roleName;
            Role role = roleRepository.findByName(finalRole)
                    .orElseGet(() -> roleRepository.save(Role.builder().name(finalRole).build()));
            user.setRole(role);
        }

        if (request.getStatus() != null) {
            user.setStatus(request.getStatus().toUpperCase());
        }

        User updated = userRepository.save(user);

        String newDetails = "Name: " + updated.getName() + ", Role: " + updated.getRole().getName() + ", Status: " + updated.getStatus();
        auditService.logAction(currentUserId, "User", updated.getId(), "UPDATE", oldDetails, newDetails);

        long activeLeads = leadAssignmentRepository.countByUserIdAndIsActiveTrue(updated.getId());
        long totalCalls = callRepository.countByUserIdAndCreatedAtBetween(updated.getId(), java.time.LocalDateTime.MIN, java.time.LocalDateTime.MAX);

        return userMapper.toResponse(updated, activeLeads, totalCalls);
    }

    @Override
    @Transactional
    public UserResponse toggleUserStatus(Long id, UserStatusRequest request, Long currentUserId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        String oldStatus = user.getStatus();
        String newStatus = (request != null && request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().toUpperCase()
                : ("ACTIVE".equalsIgnoreCase(oldStatus) ? "INACTIVE" : "ACTIVE");

        user.setStatus(newStatus);
        User updated = userRepository.save(user);

        auditService.logAction(currentUserId, "User", updated.getId(), "STATUS_CHANGE", oldStatus, updated.getStatus());

        long activeLeads = leadAssignmentRepository.countByUserIdAndIsActiveTrue(updated.getId());
        return userMapper.toResponse(updated, activeLeads, 0);
    }

    @Override
    @Transactional
    public void deleteUser(Long id, Long currentUserId) {
        if (id.equals(currentUserId)) {
            throw new BusinessException("You cannot delete your own account.");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // 1. Clean up lead assignments where assigned_by is this user
        List<LeadAssignment> createdAssignments = leadAssignmentRepository.findByAssignedById(id);
        User currentAdmin = userRepository.findById(currentUserId).orElse(null);
        if (currentAdmin != null) {
            for (LeadAssignment a : createdAssignments) {
                a.setAssignedBy(currentAdmin);
            }
            leadAssignmentRepository.saveAll(createdAssignments);
        }

        // 2. Unassign or delete assignments for this user
        List<LeadAssignment> userAssignments = leadAssignmentRepository.findByUserId(id);
        leadAssignmentRepository.deleteAll(userAssignments);

        // 3. Clear audit logs user reference
        List<AuditLog> auditLogs = auditLogRepository.findByUserId(id);
        for (AuditLog log : auditLogs) {
            log.setUser(null);
        }
        auditLogRepository.saveAll(auditLogs);

        // 4. Delete follow-ups assigned to this user
        followUpRepository.deleteByUserId(id);

        // 5. Delete calls made by this user
        callRepository.deleteByUserId(id);

        // 6. Delete notes authored by this user
        noteRepository.deleteByUserId(id);

        // 7. Clean up sales where user is this user
        List<Sale> sales = salesRepository.findByUserIdOrderByConvertedAtDesc(id);
        salesRepository.deleteAll(sales);

        // 8. Delete user
        userRepository.delete(user);
        auditService.logAction(currentUserId, "User", id, "DELETE", user.getEmail(), "DELETED");
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        long activeLeads = leadAssignmentRepository.countByUserIdAndIsActiveTrue(user.getId());
        return userMapper.toResponse(user, activeLeads, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        long activeLeads = leadAssignmentRepository.countByUserIdAndIsActiveTrue(user.getId());
        return userMapper.toResponse(user, activeLeads, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(String search, String role, String status, Pageable pageable) {
        if (role != null && !role.startsWith("ROLE_") && !role.isEmpty()) {
            role = "ROLE_" + role.toUpperCase();
        }
        return userRepository.searchUsers(search, role, status, pageable)
                .map(user -> {
                    long activeLeads = leadAssignmentRepository.countByUserIdAndIsActiveTrue(user.getId());
                    return userMapper.toResponse(user, activeLeads, 0);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getActiveUsers() {
        return userRepository.findByStatus("ACTIVE").stream()
                .map(user -> {
                    long activeLeads = leadAssignmentRepository.countByUserIdAndIsActiveTrue(user.getId());
                    return userMapper.toResponse(user, activeLeads, 0);
                })
                .toList();
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BusinessException("Current password does not match");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        auditService.logAction(userId, "User", userId, "PASSWORD_CHANGE", null, "Password updated successfully");
    }
}
