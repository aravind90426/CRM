package com.crm.mapper;

import com.crm.dto.response.CallResponse;
import com.crm.model.Call;
import org.springframework.stereotype.Component;

@Component
public class CallMapper {

    public CallResponse toResponse(Call call) {
        if (call == null) return null;

        return CallResponse.builder()
                .id(call.getId())
                .leadId(call.getLead() != null ? call.getLead().getId() : null)
                .leadName(call.getLead() != null ? call.getLead().getName() : null)
                .userId(call.getUser() != null ? call.getUser().getId() : null)
                .userName(call.getUser() != null ? call.getUser().getName() : null)
                .startedAt(call.getStartedAt())
                .endedAt(call.getEndedAt())
                .durationSeconds(call.getDurationSeconds())
                .callStatus(call.getCallStatus())
                .businessOutcome(call.getBusinessOutcome())
                .notes(call.getNotes())
                .createdAt(call.getCreatedAt())
                .build();
    }
}
