package com.crm.controller;

import com.crm.dto.response.ApiResponse;
import com.crm.dto.response.GoogleSheetsSyncResponse;
import com.crm.dto.response.PageResponse;
import com.crm.model.GoogleSheetsSyncLog;
import com.crm.security.CurrentUser;
import com.crm.security.UserPrincipal;
import com.crm.service.GoogleSheetsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/google-sheets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class GoogleSheetsController {

    private final GoogleSheetsService googleSheetsService;

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<GoogleSheetsSyncResponse>> triggerSync(@CurrentUser UserPrincipal principal) {
        GoogleSheetsSyncResponse response = googleSheetsService.triggerSync(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Synchronization completed", response));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<GoogleSheetsSyncResponse>> getSyncStatus() {
        return ResponseEntity.ok(ApiResponse.ok(googleSheetsService.getLatestSyncStatus()));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<PageResponse<GoogleSheetsSyncLog>>> getSyncHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<GoogleSheetsSyncLog> result = googleSheetsService.getSyncHistory(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }
}
