import { useState, useEffect } from 'react';
import { usePulseStream } from './hooks/usePulseStream';
import { PulseChart } from './components/PulseChart';
import { MetricsStrip } from './components/MetricsStrip';
import { FlaggedCaseList } from './components/FlaggedCaseList';
import { TransactionFeed } from './components/TransactionFeed';
import { ShowcaseModal } from './components/ShowcaseModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { MetricsReportView } from './components/MetricsReportView';
import { AuditTrailView } from './components/AuditTrailView';
import { LiveMetricsView } from './components/LiveMetricsView';
import { StoryModeWalkthrough } from './components/StoryModeWalkthrough';
import { ScenarioModal } from './components/ScenarioModal';
import type { MetricsReport } from './types';
import { 
  Play, Pause, FastForward, RotateCcw, Sliders, Presentation, 
  History, AlertTriangle, Sparkles, Zap, Activity
} from 'lucide-react';

export function App() {
  const {
    isConnected,
    isPaused,
    speed,
    streamIndex,
    totalTransactions,
    recentTxns,
    vitalsHistory,
    flags,
    activeSpikeAlert,
    config,
    togglePause,
    stepForward,
    resetReplay,
    changeSpeed,
    injectSpike,
    setFlags,
    updateConfig
  } = usePulseStream();

  const [metrics, setMetrics] = useState<MetricsReport | null>(null);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [metricsReportOpen, setMetricsReportOpen] = useState(false);
  const [liveMetricsOpen, setLiveMetricsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [storyModeActive, setStoryModeActive] = useState(false);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error("Error loading metrics", err));
  }, []);

  const handleTakeAction = async (flagId: string, action: string) => {
    try {
      const res = await fetch(`/api/flags/${flagId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, analyst: 'Risk Operations Lead' })
      });
      if (res.ok) {
        setFlags(prev => prev.map(f => f.id === flagId ? { ...f, resolved: true, resolved_action: action, status: 'resolved' } : f));
      }
    } catch (e) {
      console.error("Action error", e);
    }
  };

  const progressPercent = totalTransactions > 0 ? (streamIndex / totalTransactions) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F5EFEB] text-[#18181B] flex flex-col font-body selection:bg-[#2563EB] selection:text-white">
      {/* Top Header / Brand Bar */}
      <header className="border-b-2 border-[#18181B] bg-[#FFFFFF] sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Brand Metadata */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-13 rounded-lg flex items-center justify-center bg-[#0C0E12] border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] px-1.5 py-1 overflow-hidden shrink-0">
              <img src="/logo.svg" alt="Pulse" className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(36,238,93,0.45)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-black tracking-tight text-[#18181B]">Pulse</h1>
                <span className="neo-badge neo-badge-blue text-[10px]">
                  AI SENTINEL
                </span>

              </div>
              <p className="text-[11px] font-mono text-[#52525B]">
                Transaction Risk Manager · Clinical Rolling Vitals & Spike Detector
              </p>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
            {/* Live Solid Indicator Dot */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF6F0] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]">
              <span className={`h-2.5 w-2.5 rounded-full border border-[#18181B] ${isConnected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}></span>
              <span className="text-[11px] font-bold text-[#18181B]">{isConnected ? 'FEED LIVE' : 'RECONNECTING'}</span>
            </div>

            {/* 90s Story Mode Demo Preset */}
            <button
              onClick={() => setStoryModeActive(!storyModeActive)}
              className={`neo-btn px-3.5 py-1.5 text-xs font-bold ${
                storyModeActive
                  ? 'neo-btn-primary'
                  : 'bg-[#10B981] text-white hover:bg-[#059669]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{storyModeActive ? 'Story Active' : '90s Story Mode'}</span>
            </button>

            {/* Pitch Showcase Walkthrough */}
            <button
              onClick={() => setShowcaseOpen(true)}
              className="neo-btn neo-btn-white px-3 py-1.5 text-xs text-[#18181B]"
            >
              <Presentation className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden md:inline">Pitch Showcase</span>
            </button>

            {/* Live Telemetry & Vitals Report */}
            <button
              onClick={() => setLiveMetricsOpen(true)}
              className="neo-btn neo-btn-white px-3 py-1.5 text-xs text-[#18181B]"
              title="View Real-Time Vitals, Risk Score Distribution & Session Telemetry"
            >
              <Activity className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="hidden lg:inline">Live Telemetry</span>
            </button>

            {/* Full Action & Decision Report */}
            <button
              onClick={() => setAuditOpen(true)}
              className="neo-btn neo-btn-white px-3 py-1.5 text-xs text-[#18181B]"
              title="View Full Operational Action & Decision Audit Report"
            >
              <History className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="hidden lg:inline">Action Report</span>
            </button>

            {/* Tuning Drawer */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="neo-btn neo-btn-white p-2 text-[#18181B]"
              title="Detector Parameters & Replay Telemetry"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Story Mode Walkthrough Banner (when active) */}
      <StoryModeWalkthrough
        isActive={storyModeActive}
        onClose={() => setStoryModeActive(false)}
        onInjectSpike={injectSpike}
        onOpenMetricsReport={() => setMetricsReportOpen(true)}
        onOpenShowcase={() => setShowcaseOpen(true)}
      />

      {/* Replay Control Bar */}
      <div className="bg-[#FAF6F0] border-b-2 border-[#18181B] px-4 sm:px-6 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          {/* Left Playback Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={togglePause}
              className={`neo-btn px-3.5 py-1.5 text-xs ${
                isPaused ? 'neo-btn-primary' : 'neo-btn-white text-[#18181B]'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              <span>{isPaused ? 'Resume Replay' : 'Pause Stream'}</span>
            </button>

            <button
              onClick={stepForward}
              disabled={!isPaused}
              className="neo-btn neo-btn-white px-2.5 py-1.5 text-xs"
              title="Advance exactly 1 transaction"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Step</span>
            </button>

            <button
              onClick={resetReplay}
              className="neo-btn neo-btn-white p-1.5 text-xs text-[#D97706]"
              title="Reset Replay Stream"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 ml-1 bg-white p-1 rounded-lg border-2 border-[#18181B]">
              <span className="text-[10px] text-[#52525B] font-bold px-1.5">Speed:</span>
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    speed === s ? 'bg-[#2563EB] text-white shadow-[1px_1px_0px_#18181B]' : 'text-[#52525B] hover:text-[#18181B]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Right Attack Trigger Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-[#52525B]">Simulate Attack:</span>
            
            <button
              onClick={() => injectSpike('card_testing_bot_burst')}
              className="neo-btn neo-btn-danger px-3 py-1 text-[11px]"
            >
              + Bot Testing Burst
            </button>

            <button
              onClick={() => injectSpike('credential_stuffing_ring')}
              className="neo-btn px-3 py-1 bg-[#F59E0B] text-white hover:bg-[#D97706] text-[11px] hidden sm:inline-flex"
            >
              + ATO Ring Cluster
            </button>

            <button
              onClick={() => setScenarioModalOpen(true)}
              className="neo-btn neo-btn-white px-3 py-1 text-[11px] text-[#2563EB]"
            >
              <Zap className="w-3 h-3 text-[#2563EB]" />
              <span>Scenarios ▾</span>
            </button>

            {/* Stream Position Indicator */}
            <div className="text-[11px] font-bold text-[#52525B] ml-2 hidden md:block border-l-2 border-[#18181B] pl-3">
              Txn <strong className="text-[#18181B]">{streamIndex}</strong> / {totalTransactions} ({progressPercent.toFixed(0)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Critical Active Alert Banner */}
      {activeSpikeAlert && (
        <div className="bg-[#FEE2E2] border-b-2 border-[#18181B] px-6 py-2.5 shadow-[0_3px_0_#EF4444] transition-all">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 font-mono text-xs flex-wrap">
            <div className="flex items-center gap-2 text-[#991B1B]">
              <AlertTriangle className="w-4 h-4 animate-bounce shrink-0 stroke-[2.5]" />
              <span>
                <strong className="font-black">CRITICAL ARRHYTHMIA ALERT:</strong> Coordinated transaction velocity breakout (+{activeSpikeAlert.deviation_sigma}σ above rolling baseline) initiated at #{activeSpikeAlert.first_anomalous_txn_id}.
              </span>
            </div>
            <button
              onClick={() => handleTakeAction(activeSpikeAlert.id, 'act')}
              className="neo-btn neo-btn-danger px-4 py-1.5 text-xs text-white"
            >
              Enforce Cluster Step-Up
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 flex-1 w-full space-y-6">
        {/* Top-Level KPI Benchmarks Strip */}
        <MetricsStrip
          metrics={metrics}
          onOpenDetailedReport={() => setMetricsReportOpen(true)}
        />

        {/* 2-Column Operational Grid */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Vitals Monitor + Live Transactions Feed (Cols 1-7 on desktop) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
            {/* Vitals Monitor */}
            <PulseChart
              vitals={vitalsHistory}
              activeAlert={activeSpikeAlert}
              windowSize={config.window_size || 25}
            />

            {/* Live Transaction Feed Table */}
            <TransactionFeed
              transactions={recentTxns}
            />
          </div>

          {/* Right Column: Flagged Cases Queue (Cols 8-12 on desktop) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
            <FlaggedCaseList
              flags={flags}
              onTakeAction={handleTakeAction}
              onOpenActionReport={() => setAuditOpen(true)}
            />

            {/* Quick Attack Simulator Panel */}
            <div className="bg-[#FAF6F0] p-4 border-2 border-[#18181B] shadow-[4px_4px_0px_#18181B] rounded-xl flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#18181B]/20">
                <div className="flex items-center gap-1.5 font-bold text-[#18181B]">
                  <Zap className="w-4 h-4 text-[#EF4444]" />
                  <span className="uppercase">Attack Injection Deck</span>
                </div>
                <button
                  onClick={() => setScenarioModalOpen(true)}
                  className="text-[#2563EB] hover:underline font-bold text-[11px]"
                >
                  Configure Suite ▾
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => injectSpike('card_testing_bot_burst')}
                  className="neo-btn neo-btn-danger p-2 text-left flex flex-col justify-between text-xs"
                >
                  <span className="font-black text-[11px]">Card Testing</span>
                  <span className="text-[10px] opacity-90">16 micro-txns</span>
                </button>

                <button
                  onClick={() => injectSpike('credential_stuffing_ring')}
                  className="neo-btn p-2 text-left flex flex-col justify-between text-xs bg-[#F59E0B] text-white hover:bg-[#D97706]"
                >
                  <span className="font-black text-[11px]">ATO Ring</span>
                  <span className="text-[10px] opacity-90">14 credential txns</span>
                </button>

                <button
                  onClick={() => injectSpike('high_velocity_ato_surge')}
                  className="neo-btn neo-btn-primary p-2 text-left flex flex-col justify-between text-xs"
                >
                  <span className="font-black text-[11px]">Crypto Storm</span>
                  <span className="text-[10px] opacity-90">20 high-value txns</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals & Drawers */}
      <ShowcaseModal
        isOpen={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
      />

      <MetricsReportView
        isOpen={metricsReportOpen}
        onClose={() => setMetricsReportOpen(false)}
      />

      <LiveMetricsView
        isOpen={liveMetricsOpen}
        onClose={() => setLiveMetricsOpen(false)}
        vitalsHistory={vitalsHistory}
        activeSpikeAlert={activeSpikeAlert}
        flags={flags}
        recentTxns={recentTxns}
        streamIndex={streamIndex}
        totalTransactions={totalTransactions}
        speed={speed}
        config={config}
        isConnected={isConnected}
      />

      <AuditTrailView
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
      />

      <ScenarioModal
        isOpen={scenarioModalOpen}
        onClose={() => setScenarioModalOpen(false)}
        onRunScenario={(arch, size) => injectSpike(arch, size)}
      />

      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        isPaused={isPaused}
        speed={speed}
        onTogglePause={togglePause}
        onStepForward={stepForward}
        onReset={resetReplay}
        onChangeSpeed={changeSpeed}
        onInjectSpike={injectSpike}
        onUpdateConfig={updateConfig}
      />
    </div>
  );
}

export default App;
