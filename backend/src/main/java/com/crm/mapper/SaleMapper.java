package com.crm.mapper;

import com.crm.dto.response.SaleResponse;
import com.crm.model.Sale;
import org.springframework.stereotype.Component;

@Component
public class SaleMapper {

    public SaleResponse toResponse(Sale sale) {
        if (sale == null) return null;

        return SaleResponse.builder()
                .id(sale.getId())
                .leadId(sale.getLead() != null ? sale.getLead().getId() : null)
                .userId(sale.getUser() != null ? sale.getUser().getId() : null)
                .userName(sale.getUser() != null ? sale.getUser().getName() : null)
                .dealValue(sale.getDealValue())
                .notes(sale.getNotes())
                .convertedAt(sale.getConvertedAt())
                .createdAt(sale.getCreatedAt())
                .build();
    }
}
