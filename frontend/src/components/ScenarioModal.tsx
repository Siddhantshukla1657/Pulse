import React, { useState } from 'react';
import type { AttackScenario } from '../types';
import { X, Plus, Play, Check, Zap } from 'lucide-react';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunScenario: (archetype: string, burstSize: number) => void;
}

const DEFAULT_SCENARIOS: AttackScenario[] = [
  {
    id: 'sc-1',
    name: 'Card Testing Botnet Swarm',
    archetype: 'card_testing_bot_burst',
    description: 'Rapid 16-transaction micro-payment burst simulating card-enumeration bots testing stolen BINs.',
    burst_size: 16,
    expected_deviation: '+3.2σ'
  },
  {
    id: 'sc-2',
    name: 'Credential Stuffing ATO Surge',
    archetype: 'credential_stuffing_ring',
    description: 'Coordinated login failure storm followed by high-ticket orders across 8 merchant accounts.',
    burst_size: 14,
    expected_deviation: '+2.8σ'
  },
  {
    id: 'sc-3',
    name: 'Crypto Velocity Storm',
    archetype: 'high_velocity_ato_surge',
    description: 'Sudden high-ticket withdrawal spikes triggering immediate velocity anomaly thresholds.',
    burst_size: 20,
    expected_deviation: '+4.1σ'
  }
];

export const ScenarioModal: React.FC<ScenarioModalProps> = ({ isOpen, onClose, onRunScenario }) => {
  const [scenarios, setScenarios] = useState<AttackScenario[]>(DEFAULT_SCENARIOS);
  const [isCreating, setIsCreating] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customArchetype, setCustomArchetype] = useState('card_testing_bot_burst');
  const [customBurstSize, setCustomBurstSize] = useState(15);
  const [customDescription, setCustomDescription] = useState('');
  const [lastExecutedId, setLastExecutedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newSc: AttackScenario = {
      id: `sc-custom-${Date.now()}`,
      name: customName,
      archetype: customArchetype,
      description: customDescription || `Custom ${customArchetype} scenario with ${customBurstSize} txns.`,
      burst_size: customBurstSize,
      expected_deviation: `+${(customBurstSize / 5).toFixed(1)}σ`
    };

    setScenarios([...scenarios, newSc]);
    setIsCreating(false);
    setCustomName('');
    setCustomDescription('');
  };

  const handleExecute = (sc: AttackScenario) => {
    onRunScenario(sc.archetype, sc.burst_size);
    setLastExecutedId(sc.id);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] border-3 border-[#18181B] shadow-[8px_8px_0px_#18181B] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b-2 border-[#18181B] flex items-center justify-between bg-[#FAF6F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#0C0E12] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] p-1 shrink-0">
              <img src="/logo.svg" alt="Pulse" className="w-full h-full object-contain filter drop-shadow-[0_0_4px_rgba(36,238,93,0.4)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="neo-badge neo-badge-red text-[10px]">
                  <Zap className="w-3 h-3" /> ATTACK SCENARIO SUITE
                </span>
                <h3 className="font-display text-base font-black text-[#18181B]">Inject Coordinated Anomaly Influx</h3>
              </div>
              <p className="text-xs text-[#52525B] font-mono mt-0.5">
                Select or configure attack patterns to verify time-to-detection and Z-score deviation triggers live.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 font-mono text-xs bg-[#FFFFFF]">
          <div className="flex items-center justify-between">
            <span className="micro-label text-[#18181B]">Saved Attack Presets</span>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="neo-btn neo-btn-white px-2.5 py-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Cancel' : 'Create Custom Preset'}</span>
            </button>
          </div>

          {/* Custom Creation Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 bg-[#FAF6F0] rounded-lg border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] space-y-3">
              <div className="font-black text-[#18181B] uppercase text-xs">New Custom Attack Scenario</div>
              <div>
                <label className="block text-[11px] font-bold text-[#52525B] mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midnight ATO Velocity Cluster"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-[#FFFFFF] border-2 border-[#18181B] rounded px-3 py-1.5 text-[#18181B] text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#52525B] mb-1">Attack Archetype</label>
                  <select
                    value={customArchetype}
                    onChange={e => setCustomArchetype(e.target.value)}
                    className="w-full bg-[#FFFFFF] border-2 border-[#18181B] rounded px-3 py-1.5 text-[#18181B] text-xs focus:outline-none"
                  >
                    <option value="card_testing_bot_burst">Card Testing Bot Burst</option>
                    <option value="credential_stuffing_ring">Credential Stuffing ATO</option>
                    <option value="high_velocity_ato_surge">Crypto Velocity Storm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#52525B] mb-1">Burst Size ({customBurstSize} txns)</label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={customBurstSize}
                    onChange={e => setCustomBurstSize(Number(e.target.value))}
                    className="w-full accent-[#EF4444] cursor-pointer mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#52525B] mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Simulates rapid 20-card burst on payment gateway"
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                  className="w-full bg-[#FFFFFF] border-2 border-[#18181B] rounded px-3 py-1.5 text-[#18181B] text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 neo-btn neo-btn-danger text-xs text-white"
              >
                Save & Add Preset
              </button>
            </form>
          )}

          {/* Scenario Cards */}
          <div className="space-y-3">
            {scenarios.map(sc => {
              const isExecuted = lastExecutedId === sc.id;
              return (
                <div
                  key={sc.id}
                  className="p-4 bg-[#FAF6F0] rounded-lg border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] hover:shadow-[4px_4px_0px_#18181B] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-[#18181B]">{sc.name}</span>
                      <span className="neo-badge neo-badge-red text-[10px]">
                        {sc.burst_size} txns
                      </span>
                      <span className="neo-badge neo-badge-blue text-[10px]">
                        Exp. {sc.expected_deviation}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#52525B] leading-relaxed font-body">
                      {sc.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleExecute(sc)}
                    className={`neo-btn px-4 py-2 text-xs font-bold shrink-0 ${
                      isExecuted ? 'neo-btn-success text-white' : 'neo-btn-danger text-white'
                    }`}
                  >
                    {isExecuted ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isExecuted ? 'Injected!' : 'Run Attack'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF6F0] border-t-2 border-[#18181B] flex justify-end font-mono text-xs">
          <button
            onClick={onClose}
            className="neo-btn neo-btn-white px-4 py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
