import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Users,
  PhoneCall,
  Briefcase,
  Award,
  TrendingUp,
  DollarSign,
  Clock,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { reportsApi, projectsApi } from '../../api';
import { Project } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatusBadge, OutcomeBadge, CallStatusBadge } from '../../components/common/Badge';
import { getErrorMessage } from '../../api/client';
import { formatDuration } from '../../api/normalizers';

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'leads' | 'calls' | 'employees' | 'projects' | 'sales'>('leads');
  const [reportData, setReportData] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projectsApi.getProjects()
      .then((data) => setProjects(Array.isArray(data) ? data : ((data as any)?.content || [])))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadReport();
  }, [activeReport, selectedProjectId]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: any;
      if (activeReport === 'leads') {
        data = await reportsApi.getLeadReport({
          projectId: selectedProjectId ? Number(selectedProjectId) : undefined,
        });
      } else if (activeReport === 'calls') {
        data = await reportsApi.getCallReport();
      } else if (activeReport === 'employees') {
        data = await reportsApi.getEmployeeReport();
      } else if (activeReport === 'projects') {
        data = await reportsApi.getProjectReport();
      } else if (activeReport === 'sales') {
        data = await reportsApi.getSalesReport();
      }
      setReportData(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Reports & Analytics Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
            In-depth CRM intelligence across leads, call durations, employee performance, and conversion pipelines.
          </p>
        </div>

        {activeReport === 'leads' && projects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Project:</span>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px' }}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="card" style={{ padding: '12px 18px' }}>
        <div className="tabs-nav" style={{ margin: 0, padding: 0, border: 'none' }}>
          <button
            type="button"
            onClick={() => setActiveReport('leads')}
            className={`tab-btn ${activeReport === 'leads' ? 'active' : ''}`}
          >
            <Users size={15} style={{ display: 'inline', marginRight: '6px' }} />
            Lead Report
          </button>
          <button
            type="button"
            onClick={() => setActiveReport('calls')}
            className={`tab-btn ${activeReport === 'calls' ? 'active' : ''}`}
          >
            <PhoneCall size={15} style={{ display: 'inline', marginRight: '6px' }} />
            Call Report
          </button>
          <button
            type="button"
            onClick={() => setActiveReport('employees')}
            className={`tab-btn ${activeReport === 'employees' ? 'active' : ''}`}
          >
            <BarChart3 size={15} style={{ display: 'inline', marginRight: '6px' }} />
            Employee Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveReport('projects')}
            className={`tab-btn ${activeReport === 'projects' ? 'active' : ''}`}
          >
            <Briefcase size={15} style={{ display: 'inline', marginRight: '6px' }} />
            Project Performance
          </button>
          <button
            type="button"
            onClick={() => setActiveReport('sales')}
            className={`tab-btn ${activeReport === 'sales' ? 'active' : ''}`}
          >
            <Award size={15} style={{ display: 'inline', marginRight: '6px' }} />
            Sales & Conversions
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '36px' }}>
            <LoadingSpinner message="Generating analytics dataset..." />
          </div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '32px' }}>{error}</div>
        ) : !reportData ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
            No data available for this report.
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            {/* 1. Leads Report Table */}
            {activeReport === 'leads' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Lead Pipeline Distribution</h3>
                  <span className="badge badge-primary">
                    Total Records: {reportData.totalElements ?? (reportData.content?.length || 0)}
                  </span>
                </div>
                {(!reportData.content || reportData.content.length === 0) ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No leads found for this criteria.</div>
                ) : (
                  <div className="table-container" style={{ border: 'none' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Lead Name</th>
                          <th>Contact Phone</th>
                          <th>Project</th>
                          <th>Status</th>
                          <th>Outcome</th>
                          <th>Current Owner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.content.map((l: any, index: number) => (
                          <tr key={l.id ?? index}>
                            <td style={{ fontWeight: 700 }}>{l.name}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{l.phone}</td>
                            <td>{l.projectName || '—'}</td>
                            <td><StatusBadge status={l.status} /></td>
                            <td><OutcomeBadge outcome={l.businessOutcome} /></td>
                            <td>
                              <span style={{ fontWeight: 600, color: l.currentOwner ? 'var(--primary)' : 'var(--text-muted)' }}>
                                {l.currentOwner?.name || 'Unassigned'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. Calls Report Table */}
            {activeReport === 'calls' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Call Telephony Log Dataset</h3>
                  <span className="badge badge-primary">
                    Total Calls: {reportData.totalElements ?? (reportData.content?.length || 0)}
                  </span>
                </div>
                {(!reportData.content || reportData.content.length === 0) ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No calls logged.</div>
                ) : (
                  <div className="table-container" style={{ border: 'none' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Lead</th>
                          <th>Agent / Caller</th>
                          <th>Duration</th>
                          <th>Call Status</th>
                          <th>Outcome</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.content.map((c: any, index: number) => (
                          <tr key={c.id ?? index}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                              {c.startedAt ? new Date(c.startedAt).toLocaleString() : '—'}
                            </td>
                            <td style={{ fontWeight: 600 }}>{c.leadName || `Lead #${c.leadId}`}</td>
                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.userName || 'Agent'}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatDuration(c.durationSeconds)}</td>
                            <td><CallStatusBadge status={c.callStatus} /></td>
                            <td><OutcomeBadge outcome={c.businessOutcome} /></td>
                            <td style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>{c.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. Employee Activity Table */}
            {activeReport === 'employees' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Sales Agent Performance & Telephony Output</h3>
                </div>
                {(!Array.isArray(reportData) || reportData.length === 0) ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No employee data available.</div>
                ) : (
                  <div className="table-container" style={{ border: 'none' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Employee Name</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Assigned Leads</th>
                          <th>Total Calls</th>
                          <th>Total Talk Time</th>
                          <th>Conversions</th>
                          <th>Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((emp: any, index: number) => (
                          <tr key={emp.userId ?? index}>
                            <td style={{ fontWeight: 700 }}>{emp.userName}</td>
                            <td>
                              <span className={`badge ${emp.role === 'ROLE_ADMIN' ? 'badge-primary' : 'badge-info'}`}>
                                {emp.role === 'ROLE_ADMIN' ? 'ADMIN' : 'AGENT'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                                {emp.status}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{emp.assignedLeads ?? 0}</td>
                            <td style={{ fontWeight: 600 }}>{emp.totalCalls ?? 0}</td>
                            <td style={{ fontFamily: 'monospace' }}>{formatDuration(emp.totalDurationSeconds)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--success)' }}>{emp.conversions ?? 0}</td>
                            <td style={{ fontWeight: 700, color: '#fbbf24' }}>{formatCurrency(emp.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. Projects Performance Table */}
            {activeReport === 'projects' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Project Campaign Conversion Ratios</h3>
                </div>
                {(!Array.isArray(reportData) || reportData.length === 0) ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No project metrics available.</div>
                ) : (
                  <div className="table-container" style={{ border: 'none' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Campaign / Project</th>
                          <th>Status</th>
                          <th>Total Leads</th>
                          <th>Total Conversions</th>
                          <th>Conversion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((p: any, index: number) => (
                          <tr key={p.projectId ?? index}>
                            <td style={{ fontWeight: 700 }}>{p.projectName}</td>
                            <td>
                              <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{p.totalLeads ?? 0}</td>
                            <td style={{ fontWeight: 700, color: 'var(--success)' }}>{p.conversions ?? 0}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      width: `${Math.min(100, Math.round(p.conversionRate ?? 0))}%`,
                                      height: '100%',
                                      background: 'linear-gradient(90deg, var(--primary) 0%, #10b981 100%)',
                                    }}
                                  />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                                  {Math.round(p.conversionRate ?? 0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 5. Sales & Conversions Summary */}
            {activeReport === 'sales' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Sales Conversions & Deal Value</h3>
                </div>
                {(!Array.isArray(reportData) || reportData.length === 0) ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No sales summary available.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div
                      style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <Award size={16} />
                        <span>Closed Deals</span>
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: '#fff' }}>
                        {reportData[0]?.totalConversions ?? 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Verified customer conversions
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fcd34d', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <DollarSign size={16} />
                        <span>Total Revenue</span>
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px', color: '#fff' }}>
                        {formatCurrency(reportData[0]?.totalRevenue)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Aggregated sales deal pipeline value
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '20px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <Calendar size={16} />
                        <span>Reporting Period</span>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '10px', color: 'var(--text-primary)' }}>
                        Past 30 Days (Trailing)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Auto-aggregated from conversion timestamps
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
