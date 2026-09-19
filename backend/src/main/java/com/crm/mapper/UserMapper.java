package com.crm.mapper;

import com.crm.dto.response.UserResponse;
import com.crm.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User user, long activeLeadsCount, long totalCallsCount) {
        if (user == null) return null;

        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .activeLeadsCount(activeLeadsCount)
                .totalCallsCount(totalCallsCount)
                .build();
    }

    public UserResponse toResponse(User user) {
        return toResponse(user, 0, 0);
    }
}
