import { apiClient } from './client';
import { ApiResponse, User, JwtAuthResponse } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<JwtAuthResponse> => {
    const res = await apiClient.post<any>('/auth/login', {
      email: email.toLowerCase().trim(),
      password,
    });
    const payload = res.data?.data || res.data;
    return payload;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<string> => {
    const res = await apiClient.post<ApiResponse<string>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data.message || 'Password changed successfully';
  },
};
