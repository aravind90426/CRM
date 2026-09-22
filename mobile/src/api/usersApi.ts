import { apiClient } from './client';
import { ApiResponse, User, PageResponse } from '../types';

export const usersApi = {
  getUsers: async (params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<User>> => {
    const res = await apiClient.get<ApiResponse<PageResponse<User>>>('/users', { params });
    return res.data.data;
  },

  getActiveUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<ApiResponse<User[]>>('/users/active');
    return res.data.data;
  },

  createUser: async (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
  }): Promise<User> => {
    const res = await apiClient.post<ApiResponse<User>>('/users', data);
    return res.data.data;
  },

  updateUser: async (
    id: number,
    data: { name: string; phone?: string; role?: string }
  ): Promise<User> => {
    const res = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
    return res.data.data;
  },

  toggleStatus: async (id: number, status?: string): Promise<User> => {
    const res = await apiClient.patch<ApiResponse<User>>(
      `/users/${id}/status`,
      status ? { status } : undefined
    );
    return res.data.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  requestAdminAccess: async (reason?: string): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/users/request-admin-access', { reason });
    return res.data.data;
  },

  getAdminAccessStatus: async (): Promise<any> => {
    const res = await apiClient.get<ApiResponse<any>>('/users/admin-access-status');
    return res.data.data;
  },
};
