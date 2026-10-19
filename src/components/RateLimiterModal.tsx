import React, { useState, useEffect } from 'react';
import { X, Gauge, ShieldCheck, ShieldAlert, Zap, RotateCcw, AlertTriangle, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { 
  RateLimiterConfig, 
  RateLimiterPresetKey,
  RATE_LIMITER_PRESETS, 
  checkRateLimit, 
  RateLimitCheckResult 
} from '../utils/rateLimiter';
import { cn } from '../utils';

interface RateLimiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RateLimiterConfig;
  onSaveConfig: (newConfig: RateLimiterConfig) => void;
  requestTimestamps: number[];
  onResetQuota: () => void;
}

export const RateLimiterModal: React.FC<RateLimiterModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  requestTimestamps,
  onResetQuota
}) => {
  const [localConfig, setLocalConfig] = useState<RateLimiterConfig>(config);
  const [status, setStatus] = useState<RateLimitCheckResult>(() => 
    checkRateLimit(requestTimestamps, config)
  );

  // Sync with prop changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Live ticker for status in modal
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setStatus(checkRateLimit(requestTimestamps, localConfig));
    }, 250);
    return () => clearInterval(interval);
  }, [isOpen, requestTimestamps, localConfig]);

  if (!isOpen) return null;

  const handleToggleEnabled = () => {
    const updated: RateLimiterConfig = { ...localConfig, enabled: !localConfig.enabled };
    setLocalConfig(updated);
    onSaveConfig(updated);
  };

  const handleSelectPreset = (presetKey: RateLimiterPresetKey) => {
    const preset = RATE_LIMITER_PRESETS[presetKey];
    const updated: RateLimiterConfig = {
      ...localConfig,
      preset: presetKey,
      maxRequests: preset.maxRequests,
      windowSeconds: preset.windowSeconds
    };
    setLocalConfig(updated);
    onSaveConfig(updated);
  };

  const handleUpdateField = <K extends keyof RateLimiterConfig>(key: K, value: RateLimiterConfig[K]) => {
    const updated: RateLimiterConfig = {
      ...localConfig,
      preset: 'custom',
      [key]: value
    };
    setLocalConfig(updated);
    onSaveConfig(updated);
  };

  const usagePercent = localConfig.maxRequests > 0 
    ? Math.min(100, Math.round((status.currentCount / localConfig.maxRequests) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border",
              localConfig.enabled 
                ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]" 
                : "bg-[var(--bg-hover)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            )}>
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                Request Rate Limiter
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  localConfig.enabled 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                    : "bg-gray-500/10 border-gray-500/30 text-[var(--text-secondary)]"
                )}>
                  {localConfig.enabled ? 'ACTIVE' : 'OFF'}
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Mimic real-world network constraints and API usage limits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* Master Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
            <div className="flex items-center gap-3">
              {localConfig.enabled ? (
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold block">Enforce Rate Limiting</span>
                <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed block">
                  Throttle rapid request bursts to simulate realistic client-server traffic patterns.
                </span>
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                localConfig.enabled ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                  localConfig.enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Live Quota Bar */}
          <div className="p-3.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                Live Sliding Window Status
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs">
                  {status.currentCount} / {localConfig.maxRequests} req
                </span>
                <button
                  onClick={onResetQuota}
                  title="Clear sliding window history"
                  className="px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--bg-panel)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
              <div
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  usagePercent >= 100 ? "bg-red-500" :
                  usagePercent >= 75 ? "bg-amber-500" : "bg-[var(--primary)]"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span>{status.remaining} remaining in {localConfig.windowSeconds}s window</span>
              {status.resetInSeconds > 0 ? (
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Resets in {status.resetInSeconds}s
                </span>
              ) : (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Quota Ready
                </span>
              )}
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
              Constraint Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(RATE_LIMITER_PRESETS) as RateLimiterPresetKey[]).map((key) => {
                const preset = RATE_LIMITER_PRESETS[key];
                const isSelected = localConfig.preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPreset(key)}
                    className={cn(
                      "p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1",
                      isSelected
                        ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--text-primary)] shadow-sm"
                        : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{preset.name}</span>
                      {isSelected && <Zap className="w-3.5 h-3.5 text-[var(--primary)]" />}
                    </div>
                    <p className="text-[10px] opacity-80 leading-tight">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Constraints Configuration */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
              Parameters ({localConfig.preset === 'custom' ? 'Customized' : 'Preset active'})
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[var(--text-secondary)] mb-1 block">
                  Max Requests
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={localConfig.maxRequests}
                    onChange={(e) => handleUpdateField('maxRequests', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)] shrink-0">req</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--text-secondary)] mb-1 block">
                  Window Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={localConfig.windowSeconds}
                    onChange={(e) => handleUpdateField('windowSeconds', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--primary)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)] shrink-0">sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enforcement Behavior / Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
              Behavior When Limit Exceeded
            </label>
            <div className="space-y-2">
              <label
                onClick={() => handleUpdateField('mode', 'block')}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  localConfig.mode === 'block'
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
                )}
              >
                <input
                  type="radio"
                  name="rate_limiter_mode"
                  checked={localConfig.mode === 'block'}
                  onChange={() => handleUpdateField('mode', 'block')}
                  className="mt-0.5 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block">
                    🛡️ Block & Show Cooldown Countdown
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Halts request execution before dispatch, showing remaining cooldown seconds on the Send button and displaying an inline countdown banner with bypass controls.
                  </p>
                </div>
              </label>

              <label
                onClick={() => handleUpdateField('mode', 'simulate_429')}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  localConfig.mode === 'simulate_429'
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
                )}
              >
                <input
                  type="radio"
                  name="rate_limiter_mode"
                  checked={localConfig.mode === 'simulate_429'}
                  onChange={() => handleUpdateField('mode', 'simulate_429')}
                  className="mt-0.5 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Simulate HTTP 429 Too Many Requests
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Outputs an authentic 429 response in the Response Panel with RFC standard headers (<code className="text-xs font-mono">Retry-After</code>, <code className="text-xs font-mono">X-RateLimit-*</code>) and JSON error body. Ideal for validating error handling in client apps.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-secondary)]">
            Changes are saved automatically and persist across requests
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--primary)] hover:bg-[#e65a2d] text-white transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
