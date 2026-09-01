import React, { useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { Smartphone, CreditCard, Landmark, Wallet, Filter, ShieldAlert, X } from 'lucide-react';

interface TransactionFeedProps {
  transactions: Transaction[];
  onSelectTxn?: (txn: Transaction) => void;
}

export const TransactionFeed: React.FC<TransactionFeedProps> = ({ transactions, onSelectTxn }) => {
  const [filterRisky, setFilterRisky] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const uniqueTransactions = useMemo(() => {
    const seen = new Set<string>();
    const list: Transaction[] = [];
    for (const t of transactions) {
      if (!seen.has(t.txn_id)) {
        seen.add(t.txn_id);
        list.push(t);
      }
    }
    return list;
  }, [transactions]);

  const displayedTxns = filterRisky ? uniqueTransactions.filter(t => t.score >= 0.50) : uniqueTransactions;

  const getMethodIcon = (method: string, isRisky: boolean) => {
    const colorClass = isRisky ? 'text-[#EF4444]' : 'text-[#52525B] group-hover:text-[#2563EB]';
    switch (method) {
      case 'UPI':
        return <Smartphone className={`w-3.5 h-3.5 ${colorClass} stroke-[2] transition-colors`} />;
      case 'Credit Card':
      case 'Debit Card':
        return <CreditCard className={`w-3.5 h-3.5 ${colorClass} stroke-[2] transition-colors`} />;
      case 'Netbanking':
        return <Landmark className={`w-3.5 h-3.5 ${colorClass} stroke-[2] transition-colors`} />;
      default:
        return <Wallet className={`w-3.5 h-3.5 ${colorClass} stroke-[2] transition-colors`} />;
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.80) {
      return (
        <span className="neo-badge neo-badge-red text-[10px]">
          {(score * 100).toFixed(0)}% CRITICAL
        </span>
      );
    } else if (score >= 0.50) {
      return (
        <span className="neo-badge neo-badge-amber text-[10px]">
          {(score * 100).toFixed(0)}% ELEVATED
        </span>
      );
    } else {
      return (
        <span className="neo-badge neo-badge-green text-[10px]">
          {(score * 100).toFixed(0)}% NORMAL
        </span>
      );
    }
  };

  return (
    <div className="bg-white p-5 border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] rounded-xl flex flex-col h-[380px] relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#18181B]">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-sm tracking-wider uppercase text-[#18181B]">
            LIVE TRANSACTION STREAM
          </span>
          <span className="neo-badge neo-badge-blue text-[10px]">
            {uniqueTransactions.length} buffered
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterRisky(!filterRisky)}
            className={`neo-btn px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 ${
              filterRisky ? 'bg-[#EF4444] text-white' : 'neo-btn-white text-[#18181B]'
            }`}
          >
            <Filter className="w-3 h-3 stroke-[2.5]" />
            <span>Risky Only (&gt; 50%)</span>
          </button>
        </div>
      </div>

      {/* Table Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-mono font-black text-[#52525B] bg-[#FAF6F0] border-2 border-[#18181B] rounded-lg select-none mb-1.5">
        <div className="col-span-2">TXN ID</div>
        <div className="col-span-2">TIME</div>
        <div className="col-span-2">PAYMENT METHOD</div>
        <div className="col-span-2 text-right">AMOUNT (₹)</div>
        <div className="col-span-2">LOCATION</div>
        <div className="col-span-2 text-right">RISK SCORE</div>
      </div>

      {/* Rows List */}
      <div className="custom-scrollbar overflow-y-auto flex-1 flex flex-col gap-1 pr-1 font-mono text-xs">
        {displayedTxns.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono text-[#52525B] font-bold">
            No transactions match active filter. Replay stream active...
          </div>
        ) : (
          displayedTxns.map((t) => {
            const isSelected = selectedTxn?.txn_id === t.txn_id;
            const isRisky = t.score >= 0.50;

            return (
              <div
                key={t.txn_id}
                onClick={() => {
                  setSelectedTxn(t);
                  if (onSelectTxn) onSelectTxn(t);
                }}
                className={`group grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-md cursor-pointer transition-all border ${
                  t.score >= 0.80
                    ? 'bg-[#FFF5F5] border-[#EF4444] hover:shadow-[2px_2px_0px_#EF4444]'
                    : t.score >= 0.50
                    ? 'bg-[#FFFDF5] border-[#F59E0B] hover:shadow-[2px_2px_0px_#F59E0B]'
                    : 'bg-[#FFFFFF] border-[#E4E4E7] hover:border-[#18181B] hover:bg-[#FAF6F0]'
                } ${isSelected ? 'ring-2 ring-[#2563EB] shadow-[2px_2px_0px_#2563EB]' : ''}`}
              >
                <div className="col-span-2 flex items-center gap-1.5 font-bold text-[#18181B] truncate">
                  {t.score >= 0.80 && <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444] shrink-0 stroke-[2.5]" />}
                  <span>#{t.txn_id}</span>
                </div>

                <div className="col-span-2 text-[#52525B] text-[11px] truncate">
                  {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '12:00:00'}
                </div>

                <div className="col-span-2 flex items-center gap-1.5 text-[#18181B] font-medium">
                  {getMethodIcon(t.payment_method, isRisky)}
                  <span className="truncate text-[11px]">{t.payment_method}</span>
                </div>

                <div className="col-span-2 text-right font-black text-[#18181B]">
                  ₹{t.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>

                <div className="col-span-2 text-[#52525B] text-[11px] truncate">
                  {t.city || 'India'}
                </div>

                <div className="col-span-2 text-right">
                  {getScoreBadge(t.score)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transaction Detail Slide-Over Inspector */}
      {selectedTxn && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-[#FFFFFF] border-l-2 border-[#18181B] p-5 shadow-2xl z-20 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#18181B]">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-[#18181B]">#{selectedTxn.txn_id}</span>
                {getScoreBadge(selectedTxn.score)}
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded bg-[#FAF6F0] border border-[#18181B] text-[#18181B] hover:bg-[#EF4444] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 mt-4 font-mono text-xs">
              <div className="bg-[#FAF6F0] p-3.5 rounded-lg border-2 border-[#18181B] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#52525B] font-bold">Amount:</span>
                  <span className="text-[#18181B] font-black">
                    ₹{selectedTxn.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52525B] font-bold">Payment Method:</span>
                  <span className="text-[#18181B] font-medium">{selectedTxn.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52525B] font-bold">Location:</span>
                  <span className="text-[#18181B] font-medium">{selectedTxn.city || 'India'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52525B] font-bold">Timestamp:</span>
                  <span className="text-[#52525B]">{selectedTxn.timestamp ? new Date(selectedTxn.timestamp).toLocaleString() : 'N/A'}</span>
                </div>
              </div>

              {selectedTxn.top_features && selectedTxn.top_features.length > 0 && (
                <div>
                  <span className="micro-label text-[#52525B] block mb-2">SHAP Feature Attributions</span>
                  <div className="space-y-1.5">
                    {selectedTxn.top_features.map((feat, idx) => (
                      <div key={idx} className="bg-[#FAF6F0] p-2.5 rounded border border-[#18181B]">
                        <div className="flex justify-between items-center">
                          <span className="text-[#18181B] text-[11px] font-medium">{feat.detail || feat.description}</span>
                          <span className="neo-badge neo-badge-blue text-[10px]">
                            +{(feat.weight * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-[#18181B]">
            <button
              onClick={() => setSelectedTxn(null)}
              className="w-full py-2 neo-btn neo-btn-white text-xs"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
