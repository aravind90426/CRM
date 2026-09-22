import { apiClient } from './client';
import { ApiResponse } from '../types';

export const reportsApi = {
  getLeadReport: async (params?: { projectId?: number; startDate?: string; endDate?: string }) => {
    const res = await apiClient.get<ApiResponse<any>>('/reports/leads', { params });
    return res.data.data;
  },

  getCallReport: async (params?: { userId?: number; startDate?: string; endDate?: string }) => {
    const res = await apiClient.get<ApiResponse<any>>('/reports/calls', { params });
    return res.data.data;
  },

  getEmployeeReport: async (params?: { startDate?: string; endDate?: string }) => {
    const res = await apiClient.get<ApiResponse<any>>('/reports/employees', { params });
    return res.data.data;
  },

  getProjectReport: async () => {
    const res = await apiClient.get<ApiResponse<any>>('/reports/projects');
    return res.data.data;
  },

  getSalesReport: async (params?: { startDate?: string; endDate?: string }) => {
    const res = await apiClient.get<ApiResponse<any>>('/reports/sales', { params });
    return res.data.data;
  },
};
