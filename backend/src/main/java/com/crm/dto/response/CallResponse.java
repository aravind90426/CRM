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
public class CallResponse {
    private Long id;
    private Long leadId;
    private String leadName;
    private Long userId;
    private String userName;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Integer durationSeconds;
    private String callStatus;
    private String businessOutcome;
    private String notes;
    private LocalDateTime createdAt;
}
