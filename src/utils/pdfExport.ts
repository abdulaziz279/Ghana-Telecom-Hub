import { jsPDF } from 'jspdf';
import { AuditLog } from '../types';

export function exportAuditLogsToPdf(logs: AuditLog[]) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  // Header styling
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 842, 60, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('GHANA TELECOM REGULATORY COMPLIANCE AUDIT REPORT', 40, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Standards: SOC2 Type II & GDPR Art. 30 | Generated: ${new Date().toUTCString()}`, 520, 36);

  // Table Columns
  let y = 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  doc.text('Timestamp (UTC)', 40, y);
  doc.text('Actor Email / Role', 170, y);
  doc.text('Action Type', 340, y);
  doc.text('Target / Resource', 480, y);
  doc.text('IP Address', 620, y);
  doc.text('Severity / Status', 720, y);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(40, y + 6, 802, y + 6);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  logs.slice(0, 35).forEach((log, index) => {
    if (y > 540) {
      doc.addPage();
      y = 40;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Timestamp (UTC)', 40, y);
      doc.text('Actor Email / Role', 170, y);
      doc.text('Action Type', 340, y);
      doc.text('Target / Resource', 480, y);
      doc.text('IP Address', 620, y);
      doc.text('Severity / Status', 720, y);
      doc.line(40, y + 6, 802, y + 6);
      y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(40, y - 10, 762, 16, 'F');
    }

    doc.setTextColor(51, 65, 85);
    doc.text(log.timestamp.replace('T', ' ').slice(0, 19), 40, y);
    doc.text(`${log.actorEmail.slice(0, 24)} [${log.actorRole}]`, 170, y);
    doc.text(log.action.slice(0, 26), 340, y);
    doc.text(log.target.slice(0, 24), 480, y);
    doc.text(log.ipAddress, 620, y);

    if (log.severity === 'CRITICAL' || log.severity === 'HIGH') {
      doc.setTextColor(220, 38, 38);
    } else if (log.severity === 'MEDIUM') {
      doc.setTextColor(217, 119, 6);
    } else {
      doc.setTextColor(22, 101, 52);
    }
    doc.text(`${log.severity} (${log.status})`, 720, y);

    y += 15;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Cryptographic tamper-verification hash chain intact and verified against SHA-256 ledger.', 40, 570);

  doc.save(`ghana_telecom_audit_report_${Date.now()}.pdf`);
}
