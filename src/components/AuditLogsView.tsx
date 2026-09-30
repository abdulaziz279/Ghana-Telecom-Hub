import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { AuditLog, SecurityAlert, UserAccount } from '../types';
import { exportAuditLogsToPdf } from '../utils/pdfExport';

interface AuditLogsViewProps {
  currentUser?: UserAccount | null;
  authToken?: string | null;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  currentUser,
  authToken,
  onShowToast,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getHeaders = () => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Actor-Email': currentUser?.email || 'juniorazigiza@gmail.com',
      'X-Actor-Role': 'ADMIN',
    };
    if (authToken) {
      h['Authorization'] = `Bearer ${authToken}`;
    }
    return h;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const headers = getHeaders();
      const [logsRes, alertsRes] = await Promise.all([
        fetch(
          `/api/audit-logs?severity=${selectedSeverity !== 'ALL' ? selectedSeverity : ''}&search=${encodeURIComponent(
            searchQuery
          )}`,
          { headers }
        ),
        fetch('/api/security/alerts', { headers }),
      ]);

      const logsData = await logsRes.json();
      const alertsData = await alertsRes.json();

      if (Array.isArray(logsData)) setLogs(logsData);
      if (Array.isArray(alertsData)) setAlerts(alertsData);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSeverity, searchQuery]);

  const handleExportCsv = () => {
    window.location.href = '/api/audit-logs/export-csv';
    onShowToast('success', 'CSV Export Started', 'Compliance CSV report downloading.');
  };

  const handleExportPdf = () => {
    if (logs.length === 0) {
      onShowToast('warning', 'No Logs', 'No audit log entries to export.');
      return;
    }
    exportAuditLogsToPdf(logs);
    onShowToast('success', 'PDF Generated', 'SOC2 / GDPR Regulatory compliance PDF downloaded.');
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetch('/api/security/resolve-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
      );
      onShowToast('success', 'Alert Resolved', 'Security incident marked as resolved.');
    } catch (err: any) {
      onShowToast('error', 'Error', 'Failed to resolve alert.');
    }
  };

  const getSeverityBadge = (sev: string) => {
    if (sev === 'CRITICAL') return 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    if (sev === 'HIGH') return 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    if (sev === 'MEDIUM') return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  };

  return (
    <div id="audit-logs-view-container" className="space-y-6">
      {/* Compliance Header */}
      <div className="bg-slate-900 dark:bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg font-['Outfit',sans-serif]">
              Centralized Audit Ledger & Incident Sentinel
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Strict adherence to SOC2 Type II and GDPR regulatory standards with immutable SHA-256
            cryptographic chaining, AES-256-GCM data encryption at rest, and automated real-time alerts.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            id="export-audit-csv-btn"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>

          <button
            id="export-audit-pdf-btn"
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-950" />
            Export Compliance PDF
          </button>
        </div>
      </div>

      {/* Security Incident Alerts Banner */}
      {alerts.some((a) => !a.resolved) && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-900 rounded-2xl p-4 shadow-sm space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
              Real-Time Security Sentinel: Active Unauthorized Access Alerts
            </div>
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
              {alerts.filter((a) => !a.resolved).length} Pending
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {alerts
              .filter((a) => !a.resolved)
              .map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{alert.type}</span>
                      <span className="text-slate-400">• IP: {alert.ipAddress}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    Acknowledge & Resolve
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="audit-log-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, email, target, IP..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold">Severity:</span>
            <div className="flex gap-1">
              {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  id={`filter-severity-${sev}`}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSeverity === sev
                      ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={loadData}
            title="Refresh logs"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor Email & Role</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target / Resource</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Severity / Status</th>
                <th className="py-3 px-4">Tamper Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No matching audit log records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{log.actorEmail}</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[140px]">
                      {log.target}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getSeverityBadge(
                          log.severity
                        )}`}
                      >
                        {log.severity} • {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                      <span title={log.tamperHash}>{log.tamperHash.slice(0, 10)}...</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
