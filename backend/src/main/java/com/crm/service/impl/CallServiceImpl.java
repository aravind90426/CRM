package com.crm.service.impl;

import com.crm.dto.request.CallCreateRequest;
import com.crm.dto.request.FollowUpCreateRequest;
import com.crm.dto.response.CallResponse;
import com.crm.dto.response.CallSummaryStats;
import com.crm.exception.ForbiddenException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.CallMapper;
import com.crm.model.Call;
import com.crm.model.Lead;
import com.crm.model.User;
import com.crm.repository.CallRepository;
import com.crm.repository.LeadRepository;
import com.crm.repository.UserRepository;
import com.crm.service.AuditService;
import com.crm.service.CallService;
import com.crm.service.FollowUpService;
import com.crm.service.LeadAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CallServiceImpl implements CallService {

    private final CallRepository callRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final LeadAssignmentService leadAssignmentService;
    private final FollowUpService followUpService;
    private final CallMapper callMapper;
    private final AuditService auditService;

    @Override
    @Transactional
    public CallResponse logCall(CallCreateRequest request, Long userId, boolean isAdmin) {
        Lead lead = leadRepository.findById(request.getLeadId())
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + request.getLeadId()));

        if (!leadAssignmentService.isUserAllowedToAccessLead(request.getLeadId(), userId, isAdmin)) {
            throw new ForbiddenException("Access denied: You are not authorized to log calls for this lead");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        LocalDateTime started = request.getStartedAt() != null ? request.getStartedAt() : LocalDateTime.now().minusSeconds(request.getDurationSeconds());
        LocalDateTime ended = request.getEndedAt() != null ? request.getEndedAt() : LocalDateTime.now();

        Call call = Call.builder()
                .lead(lead)
                .user(user)
                .startedAt(started)
                .endedAt(ended)
                .durationSeconds(request.getDurationSeconds())
                .callStatus(request.getCallStatus() != null ? request.getCallStatus().toUpperCase() : "CONNECTED")
                .businessOutcome(request.getBusinessOutcome())
                .notes(request.getNotes())
                .build();

        Call saved = callRepository.save(call);

        // Update lead outcome and status if provided
        if (request.getBusinessOutcome() != null && !request.getBusinessOutcome().isBlank()) {
            lead.setBusinessOutcome(request.getBusinessOutcome());
            if ("CONVERTED".equalsIgnoreCase(request.getBusinessOutcome())) {
                lead.setStatus("CONVERTED");
            } else if ("FOLLOW_UP".equalsIgnoreCase(request.getBusinessOutcome())) {
                lead.setStatus("FOLLOW_UP");
            } else if ("NEW".equalsIgnoreCase(lead.getStatus())) {
                lead.setStatus("CONTACTED");
            }
            leadRepository.save(lead);
        }

        // Optional immediate follow-up creation
        if (request.isCreateFollowUp() && request.getFollowUpTime() != null) {
            FollowUpCreateRequest fuReq = new FollowUpCreateRequest(lead.getId(), request.getFollowUpTime(), request.getFollowUpNotes());
            followUpService.createFollowUp(fuReq, userId);
        }

        auditService.logAction(userId, "Call", saved.getId(), "LOG_CALL", null,
                "Status: " + saved.getCallStatus() + ", Duration: " + saved.getDurationSeconds() + "s on Lead: " + lead.getName());

        return callMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CallSummaryStats getCallSummaryStats(Long leadId) {
        long totalCalls = callRepository.countByLeadId(leadId);
        long connectedCalls = callRepository.countByLeadIdAndCallStatus(leadId, "CONNECTED");
        long noAnswerCalls = callRepository.countByLeadIdAndCallStatus(leadId, "NO_ANSWER");
        long busyCalls = callRepository.countByLeadIdAndCallStatus(leadId, "BUSY");
        long missedCalls = callRepository.countByLeadIdAndCallStatus(leadId, "MISSED");
        long totalDurationSeconds = callRepository.sumDurationByLeadId(leadId);

        List<Call> calls = callRepository.findByLeadIdOrderByCreatedAtDesc(leadId);
        Call latest = calls.isEmpty() ? null : calls.get(0);

        return CallSummaryStats.builder()
                .totalCalls(totalCalls)
                .connectedCalls(connectedCalls)
                .noAnswerCalls(noAnswerCalls)
                .busyCalls(busyCalls)
                .missedCalls(missedCalls)
                .totalDurationSeconds(totalDurationSeconds)
                .lastCallDate(latest != null ? latest.getCreatedAt() : null)
                .lastCallBy(latest != null && latest.getUser() != null ? latest.getUser().getName() : null)
                .lastCallStatus(latest != null ? latest.getCallStatus() : null)
                .lastBusinessOutcome(latest != null ? latest.getBusinessOutcome() : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Call> getCallsByLead(Long leadId) {
        if (!leadRepository.existsById(leadId)) {
            throw new ResourceNotFoundException("Lead not found with id: " + leadId);
        }
        return callRepository.findByLeadIdOrderByCreatedAtDesc(leadId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Call> getCallsByLead(Long leadId, Long userId, boolean isAdmin) {
        if (!leadRepository.existsById(leadId)) {
            throw new ResourceNotFoundException("Lead not found with id: " + leadId);
        }
        if (!leadAssignmentService.isUserAllowedToAccessLead(leadId, userId, isAdmin)) {
            throw new ForbiddenException("Access denied: You are not authorized to view call history for this lead");
        }
        return callRepository.findByLeadIdOrderByCreatedAtDesc(leadId);
    }

    @Override
    @Transactional(readOnly = true)
    public CallSummaryStats getCallSummaryStats(Long leadId, Long userId, boolean isAdmin) {
        if (!leadRepository.existsById(leadId)) {
            throw new ResourceNotFoundException("Lead not found with id: " + leadId);
        }
        if (!leadAssignmentService.isUserAllowedToAccessLead(leadId, userId, isAdmin)) {
            throw new ForbiddenException("Access denied: You are not authorized to view call stats for this lead");
        }
        return getCallSummaryStats(leadId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CallResponse> searchCalls(Long userId, Long leadId, Long projectId, String status, String outcome,
                                          LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        return callRepository.searchCalls(userId, leadId, projectId, status, outcome, startDate, endDate, pageable)
                .map(callMapper::toResponse);
    }
}
