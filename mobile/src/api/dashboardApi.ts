import { apiClient } from './client';
import { ApiResponse, UserDashboardSummary, AdminDashboardSummary } from '../types';

export const dashboardApi = {
  getUserDashboard: async (): Promise<UserDashboardSummary> => {
    const res = await apiClient.get<ApiResponse<UserDashboardSummary>>('/dashboard/user');
    return res.data.data;
  },

  getAdminDashboard: async (): Promise<AdminDashboardSummary> => {
    const res = await apiClient.get<ApiResponse<AdminDashboardSummary>>('/dashboard/admin');
    return res.data.data;
  },
};
