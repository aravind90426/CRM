import { apiClient } from './client';
import {
  ApiResponse,
  User,
  AuthResponse,
  Project,
  LeadSummary,
  LeadDetail,
  Call,
  CallSummaryStats,
  FollowUp,
  Note,
  Sale,
  DashboardSummary,
  GoogleSheetsSyncLog,
  AuditLog,
  PageResponse,
} from '../types';
import {
  normalizeCall,
  normalizeFollowUp,
  normalizeNote,
  normalizeAuditLog,
  normalizeSheetsLog,
  normalizeDashboardSummary,
  normalizeLeadSummary,
  normalizeLeadDetail,
} from './normalizers';

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<{ token: string; user: User }> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    const data = res.data.data;
    const user: User = data.user || {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
    };
    return {
      token: data.token,
      user,
    };
  },
  getCurrentUser: async () => {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const res = await apiClient.post<ApiResponse<void>>('/auth/change-password', data);
    return res.data;
  },
};

export const leadsApi = {
  getLeads: async (params?: {
    projectId?: number;
    status?: string;
    outcome?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<LeadSummary>> => {
    const res = await apiClient.get<ApiResponse<PageResponse<any>>>('/leads', { params });
    const data = res.data.data;
    return {
      ...data,
      content: (data?.content || []).map(normalizeLeadSummary),
    };
  },
  getLeadById: async (id: number): Promise<LeadDetail> => {
    const res = await apiClient.get<ApiResponse<any>>(`/leads/${id}`);
    return normalizeLeadDetail(res.data.data);
  },
  createLead: async (data: {
    projectId: number;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    source?: string;
    status?: string;
    businessOutcome?: string;
    additionalInfo?: string;
    assignedUserId?: number;
  }) => {
    const res = await apiClient.post<ApiResponse<LeadSummary>>('/leads', data);
    return res.data.data;
  },
  updateLead: async (id: number, data: Partial<LeadDetail>) => {
    const res = await apiClient.put<ApiResponse<LeadSummary>>(`/leads/${id}`, data);
    return res.data.data;
  },
  updateOutcome: async (id: number, data: { businessOutcome: string; status?: string }) => {
    const res = await apiClient.patch<ApiResponse<LeadSummary>>(`/leads/${id}/outcome`, data);
    return res.data.data;
  },
  deleteLead: async (id: number) => {
    const res = await apiClient.delete<ApiResponse<void>>(`/leads/${id}`);
    return res.data;
  },
  assignLead: async (leadId: number, userId: number) => {
    const res = await apiClient.post<ApiResponse<void>>(`/leads/${leadId}/assign`, { userId });
    return res.data;
  },
  reassignLead: async (leadId: number, userId: number, reason?: string) => {
    const res = await apiClient.post<ApiResponse<void>>(`/leads/${leadId}/reassign`, { userId, reason });
    return res.data;
  },
};

export const projectsApi = {
  getProjects: async (): Promise<Project[]> => {
    const res = await apiClient.get<ApiResponse<any>>('/projects');
    const data = res.data.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.content)) return data.content;
    return [];
  },
  getProjectById: async (id: number): Promise<Project> => {
    const res = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`);
    return res.data.data;
  },
  createProject: async (data: { name: string; description?: string; status?: string }): Promise<Project> => {
    const res = await apiClient.post<ApiResponse<Project>>('/projects', data);
    return res.data.data;
  },
  updateProject: async (id: number, data: { name: string; description?: string; status?: string }): Promise<Project> => {
    const res = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return res.data.data;
  },
  toggleStatus: async (id: number, status?: string): Promise<Project> => {
    const res = await apiClient.patch<ApiResponse<Project>>(`/projects/${id}/status`, null, {
      params: status ? { status } : undefined,
    });
    return res.data.data;
  },
  deleteProject: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};

export const usersApi = {
  getUsers: async (params?: { role?: string; status?: string; search?: string; page?: number; size?: number }): Promise<PageResponse<User>> => {
    const res = await apiClient.get<ApiResponse<PageResponse<User>>>('/users', { params });
    const data = res.data.data;
    return {
      ...data,
      content: data?.content || [],
    };
  },
  createUser: async (data: { name: string; email: string; phone?: string; password: string; role: string }): Promise<User> => {
    const res = await apiClient.post<ApiResponse<User>>('/users', data);
    return res.data.data;
  },
  updateUser: async (id: number, data: { name: string; phone?: string; role?: string }): Promise<User> => {
    const res = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
    return res.data.data;
  },
  toggleStatus: async (id: number, status?: string): Promise<User> => {
    const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}/status`, status ? { status } : undefined);
    return res.data.data;
  },
  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};

export const callsApi = {
  getCalls: async (params?: { leadId?: number; userId?: number; page?: number; size?: number }): Promise<PageResponse<Call>> => {
    const res = await apiClient.get<ApiResponse<PageResponse<any>>>('/calls', { params });
    const data = res.data.data;
    return {
      ...data,
      content: (data?.content || []).map(normalizeCall),
    };
  },
  getCallsByLead: async (leadId: number): Promise<Call[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>(`/leads/${leadId}/calls`);
    const data = res.data.data;
    return (data || []).map(normalizeCall);
  },
  logCall: async (data: {
    leadId?: number;
    phoneNumber?: string;
    startTime?: string;
    endTime?: string;
    durationSeconds: number;
    callStatus?: string;
    isConnected?: boolean;
    businessOutcome?: string;
    notes?: string;
  }): Promise<Call> => {
    const res = await apiClient.post<ApiResponse<any>>('/calls', data);
    return normalizeCall(res.data.data);
  },
  getCallSummary: async (leadId: number): Promise<CallSummaryStats> => {
    const res = await apiClient.get<ApiResponse<CallSummaryStats>>(`/leads/${leadId}/calls/summary`);
    return res.data.data;
  },
};

export const followUpsApi = {
  getFollowUps: async (params?: { status?: string; period?: 'overdue' | 'today' | 'upcoming'; page?: number; size?: number }): Promise<PageResponse<FollowUp>> => {
    if (params?.period && ['today', 'upcoming', 'overdue'].includes(params.period)) {
      const res = await apiClient.get<ApiResponse<any[]>>(`/follow-ups/${params.period}`);
      const list = res.data.data || [];
      const normalizedList = list.map(normalizeFollowUp);
      return {
        content: normalizedList,
        totalElements: normalizedList.length,
        totalPages: 1,
        pageNumber: 0,
        pageSize: normalizedList.length,
        last: true,
      };
    }
    const res = await apiClient.get<ApiResponse<PageResponse<any>>>('/follow-ups', { params });
    const data = res.data.data;
    return {
      ...data,
      content: (data?.content || []).map(normalizeFollowUp),
    };
  },
  getFollowUpsByLead: async (leadId: number): Promise<FollowUp[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>(`/leads/${leadId}/follow-ups`);
    const data = res.data.data;
    return (data || []).map(normalizeFollowUp);
  },
  createFollowUp: async (data: { leadId: number; followUpDate: string; notes?: string }): Promise<FollowUp> => {
    // Format to ISO without trailing Z/millis and with seconds for Jackson LocalDateTime compatibility
    let cleanDate = data.followUpDate;
    if (cleanDate) {
      cleanDate = cleanDate.replace(/Z$/, '');
      if (cleanDate.includes('.')) {
        cleanDate = cleanDate.split('.')[0];
      }
      if (cleanDate.length === 16) {
        cleanDate = cleanDate + ':00';
      }
    }
    const payload = {
      leadId: data.leadId,
      scheduledTime: cleanDate,
      notes: data.notes,
    };
    const res = await apiClient.post<ApiResponse<any>>('/follow-ups', payload);
    return normalizeFollowUp(res.data.data);
  },
  updateStatus: async (id: number, status: string): Promise<FollowUp> => {
    const res = await apiClient.patch<ApiResponse<any>>(`/follow-ups/${id}/status`, { status });
    return normalizeFollowUp(res.data.data);
  },
};

export const notesApi = {
  getNotesByLead: async (leadId: number): Promise<Note[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>(`/leads/${leadId}/notes`);
    const data = res.data.data;
    return (data || []).map(normalizeNote);
  },
  addNote: async (leadId: number, content: string): Promise<Note> => {
    const res = await apiClient.post<ApiResponse<any>>(`/leads/${leadId}/notes`, { content });
    return normalizeNote(res.data.data);
  },
};

export const salesApi = {
  convertLead: async (data: { leadId: number; dealValue: number; notes?: string }): Promise<Sale> => {
    const res = await apiClient.post<ApiResponse<Sale>>('/sales/convert', data);
    return res.data.data;
  },
  getSaleByLead: async (leadId: number): Promise<Sale> => {
    const res = await apiClient.get<ApiResponse<Sale>>(`/leads/${leadId}/sale`);
    return res.data.data;
  },
};

export const dashboardApi = {
  getAdminDashboard: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get<ApiResponse<any>>('/dashboard/admin');
    return normalizeDashboardSummary(res.data.data);
  },
  getUserDashboard: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get<ApiResponse<any>>('/dashboard/user');
    return normalizeDashboardSummary(res.data.data);
  },
};

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

export const sheetsApi = {
  triggerSync: async (): Promise<GoogleSheetsSyncLog> => {
    const res = await apiClient.post<ApiResponse<any>>('/google-sheets/sync', {}, { timeout: 120000 });
    return normalizeSheetsLog(res.data.data);
  },
  getSyncStatus: async (): Promise<GoogleSheetsSyncLog> => {
    const res = await apiClient.get<ApiResponse<any>>('/google-sheets/status');
    return normalizeSheetsLog(res.data.data);
  },
  getSyncHistory: async (params?: { page?: number; size?: number }): Promise<PageResponse<GoogleSheetsSyncLog>> => {
    const res = await apiClient.get<ApiResponse<PageResponse<any>>>('/google-sheets/history', { params });
    const data = res.data.data;
    return {
      ...data,
      content: (data?.content || []).map(normalizeSheetsLog),
    };
  },
};

export const auditApi = {
  getAuditLogs: async (params?: { entityName?: string; action?: string; page?: number; size?: number }): Promise<PageResponse<AuditLog>> => {
    const res = await apiClient.get<ApiResponse<PageResponse<any>>>('/audit-logs', { params });
    const data = res.data.data;
    return {
      ...data,
      content: (data?.content || []).map(normalizeAuditLog),
    };
  },
};
