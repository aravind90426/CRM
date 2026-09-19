package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoogleSheetsSyncResponse {
    private Long syncId;
    private String status; // IN_PROGRESS, SUCCESS, FAILED
    private int recordsSynced;
    private String message;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}
