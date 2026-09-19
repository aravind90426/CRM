package com.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallCreateRequest {
    @NotNull(message = "Lead ID is required")
    private Long leadId;

    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    @NotNull(message = "Duration in seconds is required")
    private Integer durationSeconds;

    @NotBlank(message = "Call status is required")
    private String callStatus; // CONNECTED, MISSED, NO_ANSWER, BUSY, FAILED

    private String businessOutcome; // INTERESTED, NOT_INTERESTED, FOLLOW_UP, WRONG_NUMBER, JUNK, CONVERTED
    private String notes;

    // Optional immediate follow-up creation
    private boolean createFollowUp;
    private LocalDateTime followUpTime;
    private String followUpNotes;
}
