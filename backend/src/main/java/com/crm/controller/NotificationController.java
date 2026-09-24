package com.crm.controller;

import com.crm.dto.response.AdminAccessRequestResponse;
import com.crm.dto.response.ApiResponse;
import com.crm.dto.response.NotificationResponse;
import com.crm.exception.ResourceNotFoundException;
import com.crm.model.AdminAccessRequest;
import com.crm.model.AuditLog;
import com.crm.model.Role;
import com.crm.model.User;
import com.crm.repository.AdminAccessRequestRepository;
import com.crm.repository.AuditLogRepository;
import com.crm.repository.RoleRepository;
import com.crm.repository.UserRepository;
import com.crm.security.CurrentUser;
import com.crm.security.UserPrincipal;
import com.crm.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final AdminAccessRequestRepository adminAccessRequestRepository;
    private final com.crm.repository.ShiftChangeRequestRepository shiftChangeRequestRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getUserNotifications(@CurrentUser UserPrincipal principal) {
        List<NotificationResponse> list = notificationService.getUserNotifications(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<String>> markAsRead(
            @PathVariable Long id,
            @CurrentUser UserPrincipal principal) {
        notificationService.markNotificationAsRead(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Notification marked as read", null));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<String>> markAllAsRead(@CurrentUser UserPrincipal principal) {
        notificationService.markAllNotificationsAsRead(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read", null));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getAdminNotifications() {
        List<NotificationResponse> list = new ArrayList<>();

        // 1. Admin Access Requests (Permission approval requests)
        List<AdminAccessRequest> requests = adminAccessRequestRepository.findAll();
        for (AdminAccessRequest req : requests) {
            String requesterName = req.getUser() != null ? req.getUser().getName() : "A user";
            String title = "PENDING".equalsIgnoreCase(req.getStatus())
                    ? "Admin Access Request: " + requesterName
                    : "Permission Request (" + req.getStatus() + "): " + requesterName;

            String desc = requesterName + " requested Admin privileges. Reason: " +
                    (req.getReason() != null ? req.getReason() : "No details provided");

            list.add(NotificationResponse.builder()
                    .id("req-" + req.getId())
                    .type("PERMISSION_REQUEST")
                    .title(title)
                    .message(desc)
                    .createdAt(req.getRequestedAt() != null ? req.getRequestedAt() : LocalDateTime.now())
                    .read(!"PENDING".equalsIgnoreCase(req.getStatus()))
                    .status(req.getStatus())
                    .referenceId(req.getId())
                    .referenceType("AdminAccessRequest")
                    .build());
        }

        // 2. Shift Change Requests
        List<com.crm.model.ShiftChangeRequest> shiftRequests = shiftChangeRequestRepository.findAllByOrderByRequestedAtDesc();
        for (com.crm.model.ShiftChangeRequest sr : shiftRequests) {
            String requesterName = sr.getUser() != null ? sr.getUser().getName() : "A user";
            String curShift = sr.getCurrentShift() != null ? sr.getCurrentShift().getDisplayName() : "Current Shift";
            String reqShift = sr.getRequestedShift() != null ? sr.getRequestedShift().getDisplayName() : "New Shift";

            String title = "PENDING".equalsIgnoreCase(sr.getStatus())
                    ? "Shift Change Request: " + requesterName
                    : "Shift Change (" + sr.getStatus() + "): " + requesterName;

            String desc = requesterName + " has requested a shift change from " + curShift + " to " + reqShift + "."
                    + (sr.getReason() != null && !sr.getReason().isBlank() ? " Reason: " + sr.getReason() : "");

            list.add(NotificationResponse.builder()
                    .id("shift-req-" + sr.getId())
                    .type("SHIFT_CHANGE_REQUEST")
                    .title(title)
                    .message(desc)
                    .createdAt(sr.getRequestedAt() != null ? sr.getRequestedAt() : LocalDateTime.now())
                    .read(!"PENDING".equalsIgnoreCase(sr.getStatus()))
                    .status(sr.getStatus())
                    .referenceId(sr.getId())
                    .referenceType("ShiftChangeRequest")
                    .build());
        }

        // 2. Audit Logs (lead assignments, reassignments, project creations, system actions)
        List<AuditLog> recentLogs = auditLogRepository.searchAuditLogs(null, null, null, PageRequest.of(0, 40)).getContent();
        for (AuditLog log : recentLogs) {
            String actorName = log.getUser() != null ? log.getUser().getName() : "System";
            String type = "SYSTEM_EVENT";
            String action = log.getAction() != null ? log.getAction() : "ACTION";

            if ("ASSIGN".equalsIgnoreCase(action) || "REASSIGN".equalsIgnoreCase(action)) {
                type = "REASSIGN".equalsIgnoreCase(action) ? "LEAD_REASSIGNMENT" : "LEAD_ASSIGNMENT";
            } else if ("CREATE".equalsIgnoreCase(action) && "Project".equalsIgnoreCase(log.getEntityName())) {
                type = "PROJECT_EVENT";
            }

            String title = action + " " + (log.getEntityName() != null ? log.getEntityName() : "");
            String message = actorName + " performed " + action + " on " + log.getEntityName() +
                    (log.getNewValue() != null ? " (" + log.getNewValue() + ")" : "");

            list.add(NotificationResponse.builder()
                    .id("audit-" + log.getId())
                    .type(type)
                    .title(title)
                    .message(message)
                    .createdAt(log.getCreatedAt() != null ? log.getCreatedAt() : LocalDateTime.now())
                    .read(true)
                    .status("INFO")
                    .referenceId(log.getEntityId())
                    .referenceType(log.getEntityName())
                    .build());
        }

        // Sort descending by creation date
        list.sort(Comparator.comparing(NotificationResponse::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        if (list.size() > 50) {
            list = list.subList(0, 50);
        }

        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PostMapping("/admin/review-access/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<AdminAccessRequestResponse>> reviewAdminAccess(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String adminNotes,
            @CurrentUser UserPrincipal principal) {

        AdminAccessRequest req = adminAccessRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin access request not found with id: " + id));

        String newStatus = status.toUpperCase();
        if (!"APPROVED".equals(newStatus) && !"REJECTED".equals(newStatus)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Status must be either APPROVED or REJECTED"));
        }

        req.setStatus(newStatus);
        req.setReviewedAt(LocalDateTime.now());
        req.setAdminNotes(adminNotes);

        User reviewer = userRepository.findById(principal.getId()).orElse(null);
        req.setReviewedBy(reviewer);

        if ("APPROVED".equals(newStatus) && req.getUser() != null) {
            User targetUser = req.getUser();
            Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                    .orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_ADMIN").build()));
            targetUser.setRole(adminRole);
            userRepository.save(targetUser);
        }

        AdminAccessRequest saved = adminAccessRequestRepository.save(req);

        // Notify requesting user
        if (saved.getUser() != null) {
            notificationService.createPromotionDecisionNotification(
                    saved.getUser(),
                    "APPROVED".equals(newStatus),
                    adminNotes,
                    saved.getId()
            );
        }

        AdminAccessRequestResponse response = AdminAccessRequestResponse.builder()
                .id(saved.getId())
                .userId(saved.getUser() != null ? saved.getUser().getId() : null)
                .userName(saved.getUser() != null ? saved.getUser().getName() : null)
                .userEmail(saved.getUser() != null ? saved.getUser().getEmail() : null)
                .status(saved.getStatus())
                .reason(saved.getReason())
                .requestedAt(saved.getRequestedAt())
                .reviewedAt(saved.getReviewedAt())
                .adminNotes(saved.getAdminNotes())
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Access request updated to " + newStatus, response));
    }
}
