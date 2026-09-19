export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string; // ROLE_ADMIN, ROLE_USER
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  type?: string;
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  user?: User;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface LeadSummary {
  id: number;
  name: string;
  phone: string;
  email?: string;
  projectId?: number;
  projectName?: string;
  project?: {
    id: number;
    name: string;
  };
  status: 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'FOLLOW_UP' | 'CONVERTED' | 'CLOSED';
  businessOutcome?: 'INTERESTED' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'WRONG_NUMBER' | 'JUNK' | 'CONVERTED';
  currentOwnerId?: number;
  currentOwnerName?: string;
  currentOwner?: {
    id: number;
    name: string;
    email?: string;
  };
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreviousOwner {
  id: number;
  name: string;
  email: string;
}

export interface AssignmentHistory {
  id: number;
  assignedUser: {
    id: number;
    name: string;
    email: string;
  };
  assignedBy?: {
    id: number;
    name: string;
  };
  assignedAt: string;
  unassignedAt?: string;
  active: boolean;
}

export interface CallSummaryStats {
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  noAnswerCalls: number;
  busyCalls: number;
  failedCalls: number;
  totalDurationSeconds: number;
  formattedTotalDuration: string;
  lastCallAt?: string;
  lastCallBy?: string;
  lastCallStatus?: string;
  lastBusinessOutcome?: string;
}

export interface Call {
  id: number;
  leadId?: number;
  leadName?: string;
  user: {
    id: number;
    name: string;
  };
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  formattedDuration: string;
  callStatus: 'CONNECTED' | 'MISSED' | 'NO_ANSWER' | 'BUSY' | 'FAILED';
  businessOutcome?: 'INTERESTED' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'WRONG_NUMBER' | 'JUNK' | 'CONVERTED';
  notes?: string;
  createdAt: string;
}

export interface FollowUp {
  id: number;
  leadId: number;
  leadName: string;
  leadPhone: string;
  projectName: string;
  user: {
    id: number;
    name: string;
  };
  followUpDate: string; // ISO string
  notes?: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  isOverdue: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Note {
  id: number;
  content: string;
  user: {
    id: number;
    name: string;
  };
  createdAt: string;
}

export interface Sale {
  id: number;
  dealValue: number;
  notes?: string;
  convertedBy: {
    id: number;
    name: string;
  };
  convertedAt: string;
}

export interface LeadDetail {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  source?: string;
  projectId?: number;
  projectName?: string;
  project?: {
    id: number;
    name: string;
    description?: string;
  };
  status: 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'FOLLOW_UP' | 'CONVERTED' | 'CLOSED';
  businessOutcome?: 'INTERESTED' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'WRONG_NUMBER' | 'JUNK' | 'CONVERTED';
  additionalInfo?: string;
  currentOwnerId?: number;
  currentOwnerName?: string;
  currentOwner?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  previousOwners: PreviousOwner[];
  assignmentHistory: AssignmentHistory[];
  callSummary: CallSummaryStats;
  calls: Call[];
  followUps: FollowUp[];
  notes: Note[];
  sale?: Sale;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  noAnswerCalls: number;
  interestedLeads: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  convertedLeads: number;
  totalSalesValue: number;
}

export interface GoogleSheetsSyncLog {
  id: number;
  triggeredBy: {
    id: number;
    name: string;
  };
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  recordsSynced: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  entityName: string;
  entityId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
