package com.crm.service.impl;

import com.crm.dto.response.AttendanceMonthlyResponse;
import com.crm.dto.response.AttendanceResponse;
import com.crm.exception.BusinessException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.model.Attendance;
import com.crm.model.User;
import com.crm.repository.AttendanceRepository;
import com.crm.repository.UserRepository;
import com.crm.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AttendanceResponse getTodayAttendance(Long userId) {
        LocalDate today = LocalDate.now();
        Optional<Attendance> attendanceOpt = attendanceRepository.findByUserIdAndDate(userId, today);
        return attendanceOpt.map(this::toResponse).orElseGet(() -> AttendanceResponse.builder()
                .userId(userId)
                .date(today)
                .status("NOT_CLOCKED_IN")
                .clockedIn(false)
                .clockedOut(false)
                .durationMinutes(0)
                .build());
    }

    @Override
    @Transactional
    public AttendanceResponse clockIn(Long userId) {
        LocalDate today = LocalDate.now();
        Optional<Attendance> existing = attendanceRepository.findByUserIdAndDate(userId, today);

        if (existing.isPresent() && existing.get().getClockInTime() != null) {
            throw new BusinessException("You have already clocked in today at " + existing.get().getClockInTime().toLocalTime());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Attendance attendance = existing.orElseGet(() -> Attendance.builder()
                .user(user)
                .date(today)
                .build());

        attendance.setClockInTime(LocalDateTime.now());
        attendance.setStatus("PRESENT");
        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public AttendanceResponse clockOut(Long userId) {
        LocalDate today = LocalDate.now();
        Attendance attendance = attendanceRepository.findByUserIdAndDate(userId, today)
                .orElseThrow(() -> new BusinessException("You must clock in before clocking out."));

        if (attendance.getClockInTime() == null) {
            throw new BusinessException("You have not clocked in today.");
        }

        if (attendance.getClockOutTime() != null) {
            throw new BusinessException("You have already clocked out today at " + attendance.getClockOutTime().toLocalTime());
        }

        LocalDateTime now = LocalDateTime.now();
        attendance.setClockOutTime(now);

        long minutes = Duration.between(attendance.getClockInTime(), now).toMinutes();
        attendance.setDurationMinutes((int) minutes);

        // If working duration is less than 4 hours (240 minutes), classify as HALF_DAY
        if (minutes < 240) {
            attendance.setStatus("HALF_DAY");
        } else {
            attendance.setStatus("PRESENT");
        }

        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceMonthlyResponse getMonthlyAttendance(Long userId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        List<Attendance> records = attendanceRepository.findByUserIdAndDateBetweenOrderByDateAsc(userId, start, end);

        long presentCount = 0;
        long halfDayCount = 0;
        long leaveCount = 0;
        long holidayCount = 0;
        long totalMinutes = 0;

        for (Attendance a : records) {
            if ("PRESENT".equalsIgnoreCase(a.getStatus())) {
                presentCount++;
            } else if ("HALF_DAY".equalsIgnoreCase(a.getStatus())) {
                halfDayCount++;
            } else if ("LEAVE".equalsIgnoreCase(a.getStatus())) {
                leaveCount++;
            } else if ("HOLIDAY".equalsIgnoreCase(a.getStatus())) {
                holidayCount++;
            }
            if (a.getDurationMinutes() != null) {
                totalMinutes += a.getDurationMinutes();
            }
        }

        List<AttendanceResponse> responseList = records.stream().map(this::toResponse).toList();

        return AttendanceMonthlyResponse.builder()
                .year(year)
                .month(month)
                .presentDays(presentCount)
                .halfDays(halfDayCount)
                .leaveDays(leaveCount)
                .holidayDays(holidayCount)
                .totalWorkingHours(totalMinutes / 60)
                .records(responseList)
                .build();
    }

    private AttendanceResponse toResponse(Attendance a) {
        return AttendanceResponse.builder()
                .id(a.getId())
                .userId(a.getUser() != null ? a.getUser().getId() : null)
                .userName(a.getUser() != null ? a.getUser().getName() : null)
                .date(a.getDate())
                .clockInTime(a.getClockInTime())
                .clockOutTime(a.getClockOutTime())
                .durationMinutes(a.getDurationMinutes() != null ? a.getDurationMinutes() : 0)
                .status(a.getStatus())
                .notes(a.getNotes())
                .clockedIn(a.getClockInTime() != null)
                .clockedOut(a.getClockOutTime() != null)
                .build();
    }
}
