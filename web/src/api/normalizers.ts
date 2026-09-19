import { Call, FollowUp, Note, AuditLog, GoogleSheetsSyncLog, DashboardSummary, LeadSummary, LeadDetail } from '../types';

export const formatDuration = (seconds: number | undefined | null): string => {
  const s = Math.max(0, seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const normalizeCall = (raw: any): Call => {
  if (!raw) return raw;
  const duration = raw.durationSeconds ?? raw.duration ?? 0;
  return {
    ...raw,
    id: raw.id,
    user: raw.user || {
      id: raw.userId ?? 0,
      name: raw.userName || 'Agent',
    },
    startTime: raw.startedAt || raw.startTime || raw.createdAt || new Date().toISOString(),
    endTime: raw.endedAt || raw.endTime,
    durationSeconds: duration,
    formattedDuration: raw.formattedDuration || formatDuration(duration),
    callStatus: raw.callStatus || 'CONNECTED',
    businessOutcome: raw.businessOutcome,
    leadId: raw.leadId,
    leadName: raw.leadName,
    notes: raw.notes,
    createdAt: raw.createdAt || raw.startedAt || new Date().toISOString(),
  };
};

export const normalizeFollowUp = (raw: any): FollowUp => {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id,
    leadId: raw.leadId,
    leadName: raw.leadName || 'Lead',
    leadPhone: raw.leadPhone || '',
    projectName: raw.projectName || '',
    user: raw.user || {
      id: raw.userId ?? 0,
      name: raw.userName || 'Agent',
    },
    followUpDate: raw.scheduledTime || raw.followUpDate || raw.createdAt || new Date().toISOString(),
    notes: raw.notes,
    status: raw.status || 'PENDING',
    isOverdue: Boolean(raw.isOverdue),
    createdAt: raw.createdAt || new Date().toISOString(),
    completedAt: raw.completedAt,
  };
};

export const normalizeNote = (raw: any): Note => {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id,
    content: raw.content || '',
    user: raw.user || {
      id: raw.userId ?? 0,
      name: raw.userName || 'Agent',
    },
    createdAt: raw.createdAt || new Date().toISOString(),
  };
};

export const normalizeAuditLog = (raw: any): AuditLog => {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id,
    user: raw.user || (raw.userName ? {
      id: raw.userId ?? 0,
      name: raw.userName,
      email: '',
    } : undefined),
    entityName: raw.entityName || '',
    entityId: raw.entityId || 0,
    action: raw.action || '',
    oldValue: raw.oldValue,
    newValue: raw.newValue,
    timestamp: raw.createdAt || raw.timestamp || new Date().toISOString(),
  };
};

export const normalizeSheetsLog = (raw: any): GoogleSheetsSyncLog => {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.syncId || raw.id || 0,
    triggeredBy: raw.triggeredBy || {
      id: 1,
      name: 'System Administrator',
    },
    status: raw.status || 'SUCCESS',
    recordsSynced: raw.recordsSynced ?? 0,
    errorMessage: raw.errorMessage || raw.message,
    startedAt: raw.startedAt || new Date().toISOString(),
    completedAt: raw.completedAt,
  };
};

export const normalizeDashboardSummary = (raw: any): DashboardSummary => {
  if (!raw) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalProjects: 0,
      totalLeads: 0,
      assignedLeads: 0,
      unassignedLeads: 0,
      totalCalls: 0,
      connectedCalls: 0,
      missedCalls: 0,
      noAnswerCalls: 0,
      interestedLeads: 0,
      pendingFollowUps: 0,
      overdueFollowUps: 0,
      convertedLeads: 0,
      totalSalesValue: 0,
    };
  }

  return {
    ...raw,
    totalUsers: raw.totalUsers ?? 0,
    activeUsers: raw.activeUsers ?? 0,
    totalProjects: raw.totalProjects ?? 0,
    totalLeads: raw.totalLeads ?? 0,
    assignedLeads: raw.assignedLeads ?? 0,
    unassignedLeads: raw.unassignedLeads ?? 0,
    totalCalls: raw.totalCalls ?? 0,
    connectedCalls: raw.connectedCalls ?? 0,
    missedCalls: raw.missedCalls ?? 0,
    noAnswerCalls: raw.noAnswerCalls ?? 0,
    interestedLeads: raw.interestedLeads ?? 0,
    pendingFollowUps: raw.followUpsPending ?? raw.pendingFollowUps ?? 0,
    overdueFollowUps: raw.overdueFollowUps ?? 0,
    convertedLeads: raw.convertedLeads ?? 0,
    totalSalesValue: raw.totalRevenue ?? raw.totalSalesValue ?? 0,
    recentCalls: Array.isArray(raw.recentCalls) ? raw.recentCalls.map(normalizeCall) : [],
    upcomingFollowUps: Array.isArray(raw.upcomingFollowUps) ? raw.upcomingFollowUps.map(normalizeFollowUp) : [],
  };
};

export const normalizeLeadSummary = (raw: any): LeadSummary => {
  if (!raw) return raw;
  const projName = raw.projectName || raw.project?.name || '—';
  const projId = raw.projectId ?? raw.project?.id ?? 0;
  const ownerName = raw.currentOwnerName || raw.currentOwner?.name || undefined;
  const ownerId = raw.currentOwnerId ?? raw.currentOwner?.id ?? undefined;

  return {
    ...raw,
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email,
    projectId: projId,
    projectName: projName,
    project: raw.project || {
      id: projId,
      name: projName,
    },
    status: raw.status || 'NEW',
    businessOutcome: raw.businessOutcome,
    currentOwnerId: ownerId,
    currentOwnerName: ownerName,
    currentOwner: raw.currentOwner || (ownerId ? {
      id: ownerId,
      name: ownerName || 'Agent',
      email: raw.currentOwnerEmail || '',
    } : undefined),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
};

export const normalizeLeadDetail = (raw: any): LeadDetail => {
  if (!raw) return raw;
  const projName = raw.projectName || raw.project?.name || '—';
  const projId = raw.projectId ?? raw.project?.id ?? 0;
  const ownerName = raw.currentOwnerName || raw.currentOwner?.name || undefined;
  const ownerId = raw.currentOwnerId ?? raw.currentOwner?.id ?? undefined;

  return {
    ...raw,
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email,
    project: raw.project || {
      id: projId,
      name: projName,
    },
    currentOwner: raw.currentOwner || (ownerId ? {
      id: ownerId,
      name: ownerName || 'Agent',
      email: '',
    } : undefined),
    calls: Array.isArray(raw.callHistory) ? raw.callHistory.map(normalizeCall) : (Array.isArray(raw.calls) ? raw.calls.map(normalizeCall) : []),
    followUps: Array.isArray(raw.followUps) ? raw.followUps.map(normalizeFollowUp) : [],
    notes: Array.isArray(raw.notes) ? raw.notes.map(normalizeNote) : [],
    previousOwners: raw.previousOwners || [],
    assignmentHistory: raw.assignmentHistory || [],
    callSummary: raw.callSummary || {
      totalCalls: 0,
      connectedCalls: 0,
      missedCalls: 0,
      noAnswerCalls: 0,
      busyCalls: 0,
      failedCalls: 0,
      totalDurationSeconds: 0,
      formattedTotalDuration: '0:00',
    },
  };
};
