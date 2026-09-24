export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string; // ROLE_ADMIN, ROLE_USER
  status: 'ACTIVE' | 'INACTIVE';
  shift?: string;
  shiftDisplayName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
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
  totalLeads?: number;
  assignedLeads?: number;
  assignedLeadsCount?: number;
  convertedLeads?: number;
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
  leadPhone?: string;
  phoneNumber?: string;
  isConnected?: boolean;
  user: {
    id: number;
    name: string;
  };
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  formattedDuration: string;
  callStatus: string;
  businessOutcome?: string;
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

export interface GoogleSheetsSyncSummary {
  users: number;
  projects: number;
  leads: number;
  assignments: number;
  calls: number;
  followUps: number;
  sales: number;
}

export interface GoogleSheetsSyncLog {
  id: number;
  syncId?: string;
  syncCode?: string;
  triggeredBy: {
    id: number;
    name: string;
  };
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'STARTED' | 'PARTIAL';
  recordsSynced: number;
  usersCount?: number;
  projectsCount?: number;
  leadsCount?: number;
  assignmentsCount?: number;
  callsCount?: number;
  followupsCount?: number;
  salesCount?: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  summary?: GoogleSheetsSyncSummary;
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

export interface ShiftOption {
  id: string;
  displayName: string;
  startTime: string;
  endTime: string;
  isDefault: boolean;
}

export interface ShiftChangeRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  currentShift: string;
  currentShiftDisplayName: string;
  requestedShift: string;
  requestedShiftDisplayName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  adminNotes?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedById?: number;
  reviewedByName?: string;
}

export interface AttendanceRecord {
  id?: number;
  userId?: number;
  userName?: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  durationMinutes: number;
  status: string;
  notes?: string;
  clockedIn: boolean;
  clockedOut: boolean;
  shift?: string;
  shiftDisplayName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  checkInOverdue?: boolean;
  serverTime?: string;
}

