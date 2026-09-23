import { apiClient } from './client';
import { ApiResponse, AdminNotification } from '../types';

export const notificationApi = {
  getUserNotifications: async (): Promise<AdminNotification[]> => {
    const res = await apiClient.get<ApiResponse<AdminNotification[]>>('/notifications');
    return res.data.data;
  },

  getAdminNotifications: async (): Promise<AdminNotification[]> => {
    const res = await apiClient.get<ApiResponse<AdminNotification[]>>('/notifications/admin');
    return res.data.data;
  },

  markAsRead: async (id: string | number): Promise<void> => {
    await apiClient.patch<ApiResponse<any>>(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch<ApiResponse<any>>('/notifications/read-all');
  },

  reviewAccessRequest: async (
    id: number,
    status: 'APPROVED' | 'REJECTED',
    adminNotes?: string
  ): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>(
      `/notifications/admin/review-access/${id}`,
      null,
      {
        params: { status, adminNotes },
      }
    );
    return res.data.data;
  },
};
