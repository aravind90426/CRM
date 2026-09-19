package com.crm.service.impl;

import com.crm.dto.response.CallResponse;
import com.crm.dto.response.LeadSummaryResponse;
import com.crm.model.Project;
import com.crm.model.User;
import com.crm.repository.*;
import com.crm.service.CallService;
import com.crm.service.LeadService;
import com.crm.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final LeadService leadService;
    private final CallService callService;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final LeadAssignmentRepository leadAssignmentRepository;
    private final CallRepository callRepository;
    private final FollowUpRepository followUpRepository;
    private final SalesRepository salesRepository;
    private final LeadRepository leadRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<LeadSummaryResponse> getLeadReport(Long projectId, String status, String outcome, Pageable pageable) {
        return leadService.searchLeads(projectId, status, outcome, null, null, true, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CallResponse> getCallReport(Long userId, Long projectId, String status, LocalDateTime start, LocalDateTime end, Pageable pageable) {
        return callService.searchCalls(userId, null, projectId, status, null, start, end, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getEmployeeActivityReport() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> report = new ArrayList<>();

        for (User user : users) {
            Map<String, Object> map = new HashMap<>();
            map.put("userId", user.getId());
            map.put("userName", user.getName());
            map.put("role", user.getRole().getName());
            map.put("status", user.getStatus());

            long assignedLeads = leadAssignmentRepository.countByUserIdAndIsActiveTrue(user.getId());
            long totalCalls = callRepository.countByUserIdAndCreatedAtBetween(user.getId(), LocalDateTime.MIN, LocalDateTime.MAX);
            long totalDuration = callRepository.sumDurationByUserId(user.getId());
            long conversions = salesRepository.countByUserId(user.getId());
            BigDecimal totalRevenue = salesRepository.sumDealValueByUserId(user.getId());

            map.put("assignedLeads", assignedLeads);
            map.put("totalCalls", totalCalls);
            map.put("totalDurationSeconds", totalDuration);
            map.put("conversions", conversions);
            map.put("totalRevenue", totalRevenue);

            report.add(map);
        }

        return report;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProjectReport() {
        List<Project> projects = projectRepository.findAll();
        List<Map<String, Object>> report = new ArrayList<>();

        for (Project project : projects) {
            Map<String, Object> map = new HashMap<>();
            map.put("projectId", project.getId());
            map.put("projectName", project.getName());
            map.put("status", project.getStatus());

            long totalLeads = leadRepository.countByProjectId(project.getId());
            long conversions = salesRepository.countByProjectId(project.getId());

            map.put("totalLeads", totalLeads);
            map.put("conversions", conversions);
            map.put("conversionRate", totalLeads > 0 ? ((double) conversions / totalLeads) * 100.0 : 0.0);

            report.add(map);
        }

        return report;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSalesReport(LocalDateTime start, LocalDateTime end) {
        LocalDateTime s = start != null ? start : LocalDateTime.now().minusMonths(1);
        LocalDateTime e = end != null ? end : LocalDateTime.now();

        List<Map<String, Object>> report = new ArrayList<>();
        Map<String, Object> map = new HashMap<>();
        map.put("totalConversions", salesRepository.countByConvertedAtBetween(s, e));
        map.put("totalRevenue", salesRepository.sumTotalDealValue());
        map.put("startDate", s);
        map.put("endDate", e);
        report.add(map);

        return report;
    }
}
