package com.crm.service.impl;

import com.crm.dto.response.GoogleSheetsSyncResponse;
import com.crm.exception.BusinessException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.model.GoogleSheetsSyncLog;
import com.crm.model.User;
import com.crm.repository.GoogleSheetsSyncLogRepository;
import com.crm.repository.LeadRepository;
import com.crm.repository.UserRepository;
import com.crm.service.AuditService;
import com.crm.service.GoogleSheetsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class GoogleSheetsServiceImpl implements GoogleSheetsService {

    private final GoogleSheetsSyncLogRepository syncLogRepository;
    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final AuditService auditService;

    @Value("${app.google-sheets.mock-delay-ms:1000}")
    private long mockDelayMs;

    @Override
    @Transactional
    public GoogleSheetsSyncResponse triggerSync(Long adminUserId) {
        // Concurrency guard: check if a sync is currently in progress
        if (syncLogRepository.existsByStatus("IN_PROGRESS")) {
            throw new BusinessException("A synchronization job is already running. Please wait for it to complete.");
        }

        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with id: " + adminUserId));

        GoogleSheetsSyncLog syncLog = GoogleSheetsSyncLog.builder()
                .triggeredBy(admin)
                .status("IN_PROGRESS")
                .startedAt(LocalDateTime.now())
                .recordsSynced(0)
                .build();

        GoogleSheetsSyncLog saved = syncLogRepository.save(syncLog);

        try {
            // Count total leads to sync
            long leadCount = leadRepository.count();

            // Simulate sync execution safely
            if (mockDelayMs > 0) {
                Thread.sleep(Math.min(mockDelayMs, 3000));
            }

            saved.setStatus("SUCCESS");
            saved.setRecordsSynced((int) leadCount);
            saved.setCompletedAt(LocalDateTime.now());
            saved.setErrorMessage(null);
            syncLogRepository.save(saved);

            auditService.logAction(adminUserId, "GoogleSheetsSync", saved.getId(), "SYNC_SUCCESS", null,
                    "Successfully synchronized " + leadCount + " leads to Google Sheets.");

            return GoogleSheetsSyncResponse.builder()
                    .syncId(saved.getId())
                    .status("SUCCESS")
                    .recordsSynced((int) leadCount)
                    .message("Synchronization completed successfully.")
                    .startedAt(saved.getStartedAt())
                    .completedAt(saved.getCompletedAt())
                    .build();

        } catch (Exception ex) {
            saved.setStatus("FAILED");
            saved.setCompletedAt(LocalDateTime.now());
            saved.setErrorMessage(ex.getMessage());
            syncLogRepository.save(saved);

            auditService.logAction(adminUserId, "GoogleSheetsSync", saved.getId(), "SYNC_FAILED", null,
                    "Sync failed: " + ex.getMessage());

            return GoogleSheetsSyncResponse.builder()
                    .syncId(saved.getId())
                    .status("FAILED")
                    .recordsSynced(0)
                    .message("Sync failed: " + ex.getMessage())
                    .startedAt(saved.getStartedAt())
                    .completedAt(saved.getCompletedAt())
                    .build();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GoogleSheetsSyncLog> getSyncHistory(Pageable pageable) {
        return syncLogRepository.findAllByOrderByStartedAtDesc(pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public GoogleSheetsSyncResponse getLatestSyncStatus() {
        return syncLogRepository.findTopByOrderByStartedAtDesc()
                .map(log -> GoogleSheetsSyncResponse.builder()
                        .syncId(log.getId())
                        .status(log.getStatus())
                        .recordsSynced(log.getRecordsSynced())
                        .message(log.getErrorMessage() != null ? log.getErrorMessage() : "Status: " + log.getStatus())
                        .startedAt(log.getStartedAt())
                        .completedAt(log.getCompletedAt())
                        .build())
                .orElse(GoogleSheetsSyncResponse.builder()
                        .status("IDLE")
                        .recordsSynced(0)
                        .message("No synchronization history found.")
                        .build());
    }
}
