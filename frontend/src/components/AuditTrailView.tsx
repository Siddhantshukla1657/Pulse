import React, { useState, useEffect, useMemo } from 'react';
import type { AuditEntry } from '../types';
import { XCircle, ShieldCheck, X, Filter, Clock, ShieldAlert } from 'lucide-react';

interface AuditTrailViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ isOpen, onClose }) => {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<'all' | 'act' | 'dismiss'>('all');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch('/api/audit')
      .then(res => res.json())
      .then(data => {
        if (active) setAuditLog(data);
      })
      .catch(err => console.error("Error loading audit trail", err))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  const stats = useMemo(() => {
    const total = auditLog.length;
    const stepUps = auditLog.filter(e => e.action === 'act').length;
    const dismissals = auditLog.filter(e => e.action === 'dismiss').length;
    const stepUpRate = total > 0 ? ((stepUps / total) * 100).toFixed(0) : '0';
    return { total, stepUps, dismissals, stepUpRate };
  }, [auditLog]);

  const filteredLog = useMemo(() => {
    if (filterAction === 'all') return auditLog;
    return auditLog.filter(e => e.action === filterAction);
  }, [auditLog, filterAction]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] border-3 border-[#18181B] shadow-[8px_8px_0px_#18181B] rounded-xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b-2 border-[#18181B] flex items-center justify-between bg-[#FAF6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#0C0E12] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] p-1 shrink-0">
              <img src="/logo.svg" alt="Pulse" className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(36,238,93,0.4)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="neo-badge neo-badge-yellow text-[10px]">
                  OPERATIONAL ACTION REPORT
                </span>
                <h3 className="font-display text-base font-black text-[#18181B]">Full Action & Decision Audit Report</h3>
              </div>
              <p className="text-xs text-[#52525B] font-mono mt-0.5">
                Real-time operational ledger of analyst interventions, step-up challenges, dismissed alerts, and defense notes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#EF4444] hover:text-white text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Action Performance Summary KPI Strip */}
        <div className="p-4 bg-[#F5EFEB] border-b-2 border-[#18181B] grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-white p-3 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
            <div className="text-[10px] uppercase font-bold text-[#52525B]">Total Decisions</div>
            <div className="text-lg font-black text-[#18181B] mt-0.5">{stats.total} logged</div>
          </div>
          <div className="bg-white p-3 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
            <div className="text-[10px] uppercase font-bold text-[#2563EB]">Step-Up Enforced</div>
            <div className="text-lg font-black text-[#2563EB] mt-0.5">{stats.stepUps} ({stats.stepUpRate}%)</div>
          </div>
          <div className="bg-white p-3 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
            <div className="text-[10px] uppercase font-bold text-[#52525B]">Dismissals</div>
            <div className="text-lg font-black text-[#18181B] mt-0.5">{stats.dismissals}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B]">
            <div className="text-[10px] uppercase font-bold text-[#10B981]">Protocol Integrity</div>
            <div className="text-lg font-black text-[#10B981] mt-0.5">100% Audited</div>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="px-6 pt-4 pb-2 bg-[#FFFFFF] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Filter className="w-3.5 h-3.5 text-[#52525B] mr-1" />
            <button
              onClick={() => setFilterAction('all')}
              className={`px-3 py-1 rounded-md border border-[#18181B] font-bold cursor-pointer transition-all ${
                filterAction === 'all'
                  ? 'bg-[#18181B] text-white shadow-[1.5px_1.5px_0px_#18181B]'
                  : 'bg-[#FAF6F0] text-[#18181B] hover:bg-[#F4EFEA]'
              }`}
            >
              All Actions ({stats.total})
            </button>
            <button
              onClick={() => setFilterAction('act')}
              className={`px-3 py-1 rounded-md border border-[#18181B] font-bold cursor-pointer transition-all ${
                filterAction === 'act'
                  ? 'bg-[#2563EB] text-white shadow-[1.5px_1.5px_0px_#18181B]'
                  : 'bg-[#FAF6F0] text-[#18181B] hover:bg-[#F4EFEA]'
              }`}
            >
              Step-Ups ({stats.stepUps})
            </button>
            <button
              onClick={() => setFilterAction('dismiss')}
              className={`px-3 py-1 rounded-md border border-[#18181B] font-bold cursor-pointer transition-all ${
                filterAction === 'dismiss'
                  ? 'bg-[#52525B] text-white shadow-[1.5px_1.5px_0px_#18181B]'
                  : 'bg-[#FAF6F0] text-[#18181B] hover:bg-[#F4EFEA]'
              }`}
            >
              Dismissals ({stats.dismissals})
            </button>
          </div>
          <span className="text-[11px] font-mono text-[#71717A]">
            Showing {filteredLog.length} record{filteredLog.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 font-mono text-xs bg-[#FFFFFF]">
          {isLoading ? (
            <div className="py-20 text-center text-[#52525B] font-bold">Loading action records...</div>
          ) : filteredLog.length === 0 ? (
            <div className="py-16 text-center text-[#52525B] space-y-2 bg-[#FAF6F0] border-2 border-dashed border-[#18181B] rounded-lg p-6">
              <ShieldCheck className="w-10 h-10 text-[#10B981] mx-auto stroke-[2]" />
              <p className="font-bold text-[#18181B] text-sm">No action decisions recorded in this view.</p>
              <p className="text-[11px] text-[#71717A] max-w-md mx-auto">
                When analysts review flagged cases and click <span className="font-bold text-[#2563EB]">Enforce Step-Up</span> or <span className="font-bold text-[#18181B]">Dismiss</span>, immutable action records will appear here live.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLog.map((entry, idx) => (
                <div key={idx} className="bg-[#FAF6F0] p-4 rounded-lg border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border-2 border-[#18181B] shrink-0 mt-0.5 ${
                      entry.action === 'act' ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#E4E4E7] text-[#52525B]'
                    }`}>
                      {entry.action === 'act' ? <ShieldAlert className="w-4 h-4 stroke-[2.5]" /> : <XCircle className="w-4 h-4 stroke-[2.5]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-[#18181B] text-xs">FLAG #{entry.flag_id}</span>
                        <span className={`neo-badge text-[10px] ${entry.action === 'act' ? 'neo-badge-blue' : 'neo-badge-dark'}`}>
                          {entry.action === 'act' ? 'STEP-UP CHALLENGE ENFORCED' : 'FALSE ALARM DISMISSED'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#52525B] mt-1">
                        <span className="font-bold text-[#18181B]">Analyst:</span> {entry.analyst} {entry.notes ? `· Justification: "${entry.notes}"` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-[#18181B] font-bold flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-[#52525B]" />
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[10px] text-[#71717A] mt-0.5">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF6F0] border-t-2 border-[#18181B] flex items-center justify-between font-mono text-xs">
          <div className="text-[11px] text-[#52525B]">
            All actions synchronized in persistent SQLite store.
          </div>
          <button
            onClick={onClose}
            className="neo-btn neo-btn-white px-4 py-2"
          >
            Close Action Report
          </button>
        </div>
      </div>
    </div>
  );
};
