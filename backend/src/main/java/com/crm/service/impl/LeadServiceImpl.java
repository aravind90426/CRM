package com.crm.service.impl;

import com.crm.dto.request.LeadCreateRequest;
import com.crm.dto.request.LeadOutcomeRequest;
import com.crm.dto.request.LeadUpdateRequest;
import com.crm.dto.response.CallSummaryStats;
import com.crm.dto.response.LeadDetailResponse;
import com.crm.dto.response.LeadSummaryResponse;
import com.crm.exception.DuplicateResourceException;
import com.crm.exception.ForbiddenException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.LeadMapper;
import com.crm.model.*;
import com.crm.repository.CallRepository;
import com.crm.repository.FollowUpRepository;
import com.crm.repository.LeadAssignmentRepository;
import com.crm.repository.LeadRepository;
import com.crm.repository.NoteRepository;
import com.crm.repository.ProjectRepository;
import com.crm.repository.SalesRepository;
import com.crm.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LeadServiceImpl implements LeadService {

    private final LeadRepository leadRepository;
    private final ProjectRepository projectRepository;
    private final LeadAssignmentRepository leadAssignmentRepository;
    private final LeadAssignmentService leadAssignmentService;
    private final CallRepository callRepository;
    private final FollowUpRepository followUpRepository;
    private final NoteRepository noteRepository;
    private final SalesRepository salesRepository;
    private final CallService callService;
    private final FollowUpService followUpService;
    private final NoteService noteService;
    private final SalesService salesService;
    private final LeadMapper leadMapper;
    private final AuditService auditService;

    @Override
    @Transactional
    public LeadSummaryResponse createLead(LeadCreateRequest request, Long currentUserId) {
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + request.getProjectId()));

        // Check duplicate phone in SAME project
        if (leadRepository.existsByProjectIdAndPhone(project.getId(), request.getPhone())) {
            throw new DuplicateResourceException("A lead with phone number " + request.getPhone() +
                    " already exists in project: " + project.getName());
        }

        Lead lead = Lead.builder()
                .project(project)
                .name(request.getName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .source(request.getSource())
                .status(request.getStatus() != null ? request.getStatus().toUpperCase() : "NEW")
                .businessOutcome(request.getBusinessOutcome())
                .additionalInfo(request.getAdditionalInfo())
                .build();

        Lead saved = leadRepository.save(lead);

        auditService.logAction(currentUserId, "Lead", saved.getId(), "CREATE", null,
                "Lead: " + saved.getName() + " in Project: " + project.getName());

        LeadAssignment activeAssignment = null;
        if (request.getAssignedUserId() != null) {
            leadAssignmentService.assignLead(saved.getId(), request.getAssignedUserId(), currentUserId);
            activeAssignment = leadAssignmentRepository.findByLeadIdAndIsActiveTrue(saved.getId()).orElse(null);
        }

        return leadMapper.toSummaryResponse(saved, activeAssignment);
    }

    @Override
    @Transactional
    public LeadSummaryResponse updateLead(Long id, LeadUpdateRequest request, Long currentUserId, boolean isAdmin) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + id));

        if (!leadAssignmentService.isUserAllowedToAccessLead(id, currentUserId, isAdmin)) {
            throw new ForbiddenException("Access denied: You are not authorized to update this lead");
        }

        // Check phone uniqueness if phone is changing
        if (!lead.getPhone().equals(request.getPhone())) {
            if (leadRepository.existsByProjectIdAndPhone(lead.getProject().getId(), request.getPhone())) {
                throw new DuplicateResourceException("A lead with phone number " + request.getPhone() +
                        " already exists in project: " + lead.getProject().getName());
            }
            lead.setPhone(request.getPhone());
        }

        lead.setName(request.getName());
        lead.setEmail(request.getEmail());
        lead.setAddress(request.getAddress());
        lead.setCity(request.getCity());
        lead.setState(request.getState());
        lead.setSource(request.getSource());

        if (request.getStatus() != null) {
            lead.setStatus(request.getStatus().toUpperCase());
        }
        if (request.getBusinessOutcome() != null) {
            lead.setBusinessOutcome(request.getBusinessOutcome());
        }
        lead.setAdditionalInfo(request.getAdditionalInfo());

        Lead updated = leadRepository.save(lead);

        auditService.logAction(currentUserId, "Lead", updated.getId(), "UPDATE", null,
                "Updated demographics for lead: " + updated.getName());

        LeadAssignment activeAssignment = leadAssignmentRepository.findByLeadIdAndIsActiveTrue(updated.getId()).orElse(null);
        return leadMapper.toSummaryResponse(updated, activeAssignment);
    }

    @Override
    @Transactional
    public LeadSummaryResponse updateLeadOutcome(Long id, LeadOutcomeRequest request, Long currentUserId, boolean isAdmin) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + id));

        if (!leadAssignmentService.isUserAllowedToAccessLead(id, currentUserId, isAdmin)) {
            throw new ForbiddenException("Access denied: You are not authorized to update this lead");
        }

        String oldOutcome = lead.getBusinessOutcome();
        lead.setBusinessOutcome(request.getBusinessOutcome());

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            lead.setStatus(request.getStatus().toUpperCase());
        } else if ("CONVERTED".equalsIgnoreCase(request.getBusinessOutcome())) {
            lead.setStatus("CONVERTED");
        } else if ("FOLLOW_UP".equalsIgnoreCase(request.getBusinessOutcome())) {
            lead.setStatus("FOLLOW_UP");
        }

        Lead updated = leadRepository.save(lead);

        auditService.logAction(currentUserId, "Lead", updated.getId(), "OUTCOME_CHANGE",
                "Outcome: " + oldOutcome, "Outcome: " + updated.getBusinessOutcome() + ", Status: " + updated.getStatus());

        LeadAssignment activeAssignment = leadAssignmentRepository.findByLeadIdAndIsActiveTrue(updated.getId()).orElse(null);
        return leadMapper.toSummaryResponse(updated, activeAssignment);
    }

    @Override
    @Transactional(readOnly = true)
    public LeadDetailResponse getLeadDetails(Long id, Long currentUserId, boolean isAdmin) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + id));

        if (!leadAssignmentService.isUserAllowedToAccessLead(id, currentUserId, isAdmin)) {
            throw new ForbiddenException("Access denied: You are not authorized to view this lead");
        }

        LeadAssignment activeAssignment = leadAssignmentRepository.findByLeadIdAndIsActiveTrue(id).orElse(null);
        List<User> previousOwners = leadAssignmentService.getPreviousOwners(id);
        List<LeadAssignment> assignmentHistory = leadAssignmentRepository.findByLeadIdOrderByAssignedAtDesc(id);

        CallSummaryStats callSummary = callService.getCallSummaryStats(id);
        List<Call> calls = callService.getCallsByLead(id);
        List<FollowUp> followUps = followUpService.getFollowUpsByLead(id);
        List<Note> notes = noteService.getNotesByLead(id);
        Sale sale = salesService.getSaleByLead(id).orElse(null);

        return leadMapper.toDetailResponse(lead, activeAssignment, previousOwners, assignmentHistory,
                callSummary, calls, followUps, notes, sale);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LeadSummaryResponse> searchLeads(Long projectId, String status, String outcome, String search,
                                                Long currentUserId, boolean isAdmin, Pageable pageable) {
        Page<Lead> leads;
        if (isAdmin) {
            leads = leadRepository.searchLeads(projectId, status, outcome, search, pageable);
        } else {
            leads = leadRepository.searchAssignedLeads(currentUserId, projectId, status, outcome, search, pageable);
        }

        return leads.map(lead -> {
            LeadAssignment active = leadAssignmentRepository.findByLeadIdAndIsActiveTrue(lead.getId()).orElse(null);
            return leadMapper.toSummaryResponse(lead, active);
        });
    }

    @Override
    @Transactional
    public void deleteLead(Long id, Long currentUserId) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + id));

        salesRepository.findByLeadId(id).ifPresent(salesRepository::delete);
        noteRepository.deleteAll(noteRepository.findByLeadIdOrderByCreatedAtDesc(id));
        followUpRepository.deleteAll(followUpRepository.findByLeadIdOrderByScheduledTimeDesc(id));
        callRepository.deleteAll(callRepository.findByLeadIdOrderByCreatedAtDesc(id));
        leadAssignmentRepository.deleteAll(leadAssignmentRepository.findByLeadIdOrderByAssignedAtDesc(id));

        leadRepository.delete(lead);
        auditService.logAction(currentUserId, "Lead", id, "DELETE", "Lead: " + lead.getName(), null);
    }
}
