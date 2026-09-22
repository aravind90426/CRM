package com.crm.controller;

import com.crm.dto.response.ApiResponse;
import com.crm.dto.response.AttendanceMonthlyResponse;
import com.crm.dto.response.AttendanceResponse;
import com.crm.security.CurrentUser;
import com.crm.security.UserPrincipal;
import com.crm.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<AttendanceResponse>> getTodayAttendance(@CurrentUser UserPrincipal principal) {
        AttendanceResponse response = attendanceService.getTodayAttendance(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/clock-in")
    public ResponseEntity<ApiResponse<AttendanceResponse>> clockIn(@CurrentUser UserPrincipal principal) {
        AttendanceResponse response = attendanceService.clockIn(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Clocked in successfully", response));
    }

    @PostMapping("/clock-out")
    public ResponseEntity<ApiResponse<AttendanceResponse>> clockOut(@CurrentUser UserPrincipal principal) {
        AttendanceResponse response = attendanceService.clockOut(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Clocked out successfully", response));
    }

    @GetMapping("/monthly")
    public ResponseEntity<ApiResponse<AttendanceMonthlyResponse>> getMonthlyAttendance(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @CurrentUser UserPrincipal principal) {

        int targetYear = (year != null) ? year : LocalDate.now().getYear();
        int targetMonth = (month != null) ? month : LocalDate.now().getMonthValue();

        AttendanceMonthlyResponse response = attendanceService.getMonthlyAttendance(principal.getId(), targetYear, targetMonth);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
