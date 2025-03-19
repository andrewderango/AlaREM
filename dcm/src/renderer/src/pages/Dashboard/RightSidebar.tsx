import React, { useState, useEffect, useRef } from 'react'
import { Info, HardDriveUpload, ClipboardX, Menu, HeartPulse, FileText } from 'lucide-react'
import { is } from '@electron-toolkit/utils'
import { useToast } from '../../context/ToastContext'

interface RightSidebarProps {
  showHelp: boolean
  handleModeSelect: (
    mode:
      | 'VOO'
      | 'AOO'
      | 'VVI'
      | 'AAI'
      | 'OFF'
      | 'DDDR'
      | 'DDD'
      | 'AOOR'
      | 'AAIR'
      | 'VOOR'
      | 'VVIR',
  ) => void
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.MouseEvent<HTMLButtonElement>) => void
  handleDiscard: () => void
  atriumAmpError: boolean
  ventricleAmpError: boolean
  atrialPWError: boolean
  ventriclePWError: boolean
  atrialRPError: boolean
  ventricleRPError: boolean
  lowerRateLimitError: boolean
  upperRateLimitError: boolean
  rateFactorError: boolean
  reactionTimeError: boolean
  recoveryTimeError: boolean
  activityThresholdError: boolean
  avDelayError: boolean
  isAtriumDisabled: boolean
  isVentricleDisabled: boolean
  isRateFactorDisabled: boolean
  isAvDelayDisabled: boolean
  isRateLimitDisabled: boolean
  telemetryStatus: string
  currentMode:
    | 'VOO'
    | 'AOO'
    | 'VVI'
    | 'AAI'
    | 'OFF'
    | 'DDDR'
    | 'DDD'
    | 'AOOR'
    | 'AAIR'
    | 'VOOR'
    | 'VVIR'
    | null
  modes: any
  isVisible: boolean
  username: string | null
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  showHelp,
  handleModeSelect,
  handleInputChange,
  handleDiscard,
  atriumAmpError,
  ventricleAmpError,
  atrialPWError,
  ventriclePWError,
  atrialRPError,
  ventricleRPError,
  lowerRateLimitError,
  upperRateLimitError,
  rateFactorError,
  reactionTimeError,
  recoveryTimeError,
  activityThresholdError,
  avDelayError,
  isAtriumDisabled,
  isVentricleDisabled,
  isRateFactorDisabled,
  isAvDelayDisabled,
  isRateLimitDisabled,
  telemetryStatus,
  currentMode,
  modes,
  isVisible,
  username,
  handleSubmit,
}) => {
  const [view, setView] = useState<'PARAMETERS' | 'REPORTS'>('PARAMETERS')
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [activityThreshold, setActivityThreshold] = useState(modes[currentMode]?.activityThreshold ?? 1)
  const [submitCount, setSubmitCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const helpRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()

  const inputInfo = {
    atriumAmp: { name: 'Atrium Amplitude', range: '0.5 - 10 mV' },
    ventricleAmp: { name: 'Ventricle Amplitude', range: '0.5 - 25 mV' },
    atrialPW: { name: 'Atrial Pulse Width', range: '0.05 - 1.9 ms' },
    ventriclePW: { name: 'Ventricular Pulse Width', range: '0.05 - 1.9 ms' },
    atrialRP: { name: 'Atrial Refractory Period', range: '150 - 500 ms' },
    ventricleRP: { name: 'Ventricular Refractory Period', range: '150 - 500 ms' },
    lowerRateLimit: { name: 'Lower Rate Limit', range: '30 - 175 bpm' },
    upperRateLimit: { name: 'Upper Rate Limit', range: '50 - 175 bpm' },
    rateFactor: { name: 'Rate Factor', range: '1 - 16' },
    reactionTime: { name: 'Reaction Time', range: '10 - 50 s' },
    recoveryTime: { name: 'Recovery Time', range: '10 - 240 s' },
    activityThreshold: { name: 'Activity Threshold', range: '1 - 7' },
    avDelay: { name: 'Atrioventricular Delay', range: '30 - 300 ms' },
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setMenuOpen(false)
    }
    if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
      setHelpOpen(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const inputs = document.querySelectorAll('.input-field')
    inputs.forEach((input) => {
      if (input.value) {
        input.classList.add('filled')
      } else {
        input.classList.remove('filled')
      }
    })
  }, [isAtriumDisabled, isVentricleDisabled, isAvDelayDisabled, isRateFactorDisabled, isRateLimitDisabled])

  useEffect(() => {
    if (view === 'PARAMETERS') {
      const inputs = document.querySelectorAll('.input-field')
      inputs.forEach((input) => {
        if (input.value) {
          input.classList.add('filled')
        } else {
          input.classList.remove('filled')
        }
      })
    }
  }, [view])

  useEffect(() => {
    setActivityThreshold(modes[currentMode]?.activityThreshold ?? 1);
  }, [currentMode, modes]);

  const handleViewChange = (newView: 'PARAMETERS' | 'REPORTS') => {
    setView(newView)
  }

  const activityThresholdLabels = [
    'Very Low',
    'Low',
    'Low Medium',
    'Medium',
    'Medium High',
    'High',
    'Very High',
  ];

  const downloadParameterLog = async () => {
    if (!username) {
      addToast('Username is not defined', 'error')
      return
    }
    const result = await window.api.downloadParameterLog(username)
    if (result.success) {
      addToast(`Parameter log downloaded to ${result.directory}`, 'success')
    } else {
      addToast(result.message ?? 'An unknown error occurred', 'error')
    }
  }

  const downloadLoginHistory = async () => {
    if (!username) {
      addToast('Username is not defined', 'error')
      return
    }
    const result = await window.api.downloadLoginHistory(username)
    if (result.success) {
      addToast(`Login history downloaded to ${result.directory}`, 'success')
    } else {
      addToast(result.message ?? 'An unknown error occurred', 'error')
    }
  }

  return (
    <div className={`right-sidebar ${isVisible ? 'visible' : 'hidden'}`}>
      {/* Menu Button */}
      <div className="menu-button-container" ref={menuRef}>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={20} />
        </button>
        {menuOpen && (
          <div className="menu-popup">
            <button
              className={`menu-item ${view === 'PARAMETERS' ? 'selected' : ''}`}
              onClick={() => {
                handleViewChange('PARAMETERS')
                setMenuOpen(false)
              }}
            >
              <HeartPulse size={16} style={{ marginRight: '8px' }} />
              PARAMETERS
            </button>
            <button
              className={`menu-item ${view === 'REPORTS' ? 'selected' : ''}`}
              onClick={() => {
                handleViewChange('REPORTS')
                setMenuOpen(false)
              }}
            >
              <FileText size={16} style={{ marginRight: '8px' }} />
              REPORTS
            </button>
          </div>
        )}
      </div>

      {/* HEADER */}
      <h2>{view}</h2>

      {view === 'PARAMETERS' && (
        <>
          {/* Mode Selection */}
          <div className="mode-container">
            <h3>Mode Selection</h3>
            <div className="button-grid">
              {(
                [
                  'AOO',
                  'AAI',
                  'VOO',
                  'VVI',
                  'AOOR',
                  'AAIR',
                  'VOOR',
                  'VVIR',
                  'OFF',
                  'DDD',
                  'DDDR',
                ] as const
              ).map((mode) => (
                <button
                  key={mode}
                  className={`mode-button ${currentMode === mode ? 'selected' : ''}`}
                  onClick={() => handleModeSelect(mode)}
                  style={{ flex: '1 1 20%' }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="header-with-help">
            <h3>Pacing Parameters</h3>
            {/* <button className="help-button" onClick={() => setHelpOpen(!helpOpen)}>
              <Info size={14} />
            </button> */}
          </div>
          {/* Continuous Parameters */}
          <div className="parameter-container scrollable no-scrollbar">
            {helpOpen && (
              <div className="help-popup" ref={helpRef}>
                <div className="help-header">
                  <h3>Pulse Parameters</h3>
                </div>
                <ul>
                  <li>
                    <strong>Atrium Amp:</strong> Amplitude of the atrial pulse (mV)
                  </li>
                  <li>
                    <strong>Ventricle Amp:</strong> Amplitude of the ventricular pulse (mV)
                  </li>
                  <li>
                    <strong>Atrial PW:</strong> Pulse width of the atrial pulse (ms)
                  </li>
                  <li>
                    <strong>Ventricle PW:</strong> Pulse width of the ventricular pulse (ms)
                  </li>
                  <li>
                    <strong>Atrial RP:</strong> Refractory period of the atrial pulse (ms)
                  </li>
                  <li>
                    <strong>Ventricular RP:</strong> Refractory period of the ventricular pulse (ms)
                  </li>
                  <li>
                    <strong>Lower Rate Limit:</strong> Minimum heart rate (bpm)
                  </li>
                  <li>
                    <strong>Upper Rate Limit:</strong> Maximum heart rate (bpm)
                  </li>
                </ul>
              </div>
            )}
            <div className="input-row">
              <div className={`input-container double ${lowerRateLimitError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isRateLimitDisabled}
                  value={isRateLimitDisabled ? '' : (modes[currentMode]?.lowerRateLimit ?? '')}
                  name="lowerRateLimit"
                />
                <label className={isRateLimitDisabled ? 'disabled-label' : ''}>
                  Lower Rate Limit
                </label>
                {!isRateLimitDisabled && (
                  <button className="info-button" data-title={`${inputInfo.lowerRateLimit.name}: ${inputInfo.lowerRateLimit.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container double ${upperRateLimitError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isRateLimitDisabled}
                  value={isRateLimitDisabled ? '' : (modes[currentMode]?.upperRateLimit ?? '')}
                  name="upperRateLimit"
                />
                <label className={isRateLimitDisabled ? 'disabled-label' : ''}>
                  Upper Rate Limit
                </label>
                {!isRateLimitDisabled && (
                  <button className="info-button" data-title={`${inputInfo.upperRateLimit.name}: ${inputInfo.upperRateLimit.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="input-row">
              <div className={`input-container triple ${atriumAmpError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isAtriumDisabled}
                  value={isAtriumDisabled ? '' : (modes[currentMode]?.atrialAmplitude ?? '')}
                  name="atriumAmp"
                />
                <label className={isAtriumDisabled ? 'disabled-label' : ''}>AAMP</label>
                {!isAtriumDisabled && (
                  <button className="info-button" data-title={`${inputInfo.atriumAmp.name}: ${inputInfo.atriumAmp.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container triple ${atrialPWError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isAtriumDisabled}
                  value={isAtriumDisabled ? '' : (modes[currentMode]?.atrialPulseWidth ?? '')}
                  name="atrialPW"
                />
                <label className={isAtriumDisabled ? 'disabled-label' : ''}>APW</label>
                {!isAtriumDisabled && (
                  <button className="info-button" data-title={`${inputInfo.atrialPW.name}: ${inputInfo.atrialPW.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container triple ${atrialRPError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isAtriumDisabled}
                  value={isAtriumDisabled ? '' : (modes[currentMode]?.atrialRefractoryPeriod ?? '')}
                  name="atrialRP"
                />
                <label className={isAtriumDisabled ? 'disabled-label' : ''}>ARP</label>
                {!isAtriumDisabled && (
                  <button className="info-button" data-title={`${inputInfo.atrialRP.name}: ${inputInfo.atrialRP.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="input-row">
              <div className={`input-container triple ${ventricleAmpError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isVentricleDisabled}
                  value={
                    isVentricleDisabled ? '' : (modes[currentMode]?.ventricularAmplitude ?? '')
                  }
                  name="ventricleAmp"
                />
                <label className={isVentricleDisabled ? 'disabled-label' : ''}>VAMP</label>
                {!isVentricleDisabled && (
                  <button className="info-button" data-title={`${inputInfo.ventricleAmp.name}: ${inputInfo.ventricleAmp.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container triple ${ventriclePWError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isVentricleDisabled}
                  value={
                    isVentricleDisabled ? '' : (modes[currentMode]?.ventricularPulseWidth ?? '')
                  }
                  name="ventriclePW"
                />
                <label className={isVentricleDisabled ? 'disabled-label' : ''}>VPW</label>
                {!isVentricleDisabled && (
                  <button className="info-button" data-title={`${inputInfo.ventriclePW.name}: ${inputInfo.ventriclePW.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container triple ${ventricleRPError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isVentricleDisabled}
                  value={
                    isVentricleDisabled
                      ? ''
                      : (modes[currentMode]?.ventricularRefractoryPeriod ?? '')
                  }
                  name="ventricleRP"
                />
                <label className={isVentricleDisabled ? 'disabled-label' : ''}>VRP</label>
                {!isVentricleDisabled && (
                  <button className="info-button" data-title={`${inputInfo.ventricleRP.name}: ${inputInfo.ventricleRP.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="input-row">
              <div className={`input-container quad ${reactionTimeError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isRateFactorDisabled}
                  value={isRateFactorDisabled ? '' : (modes[currentMode]?.reactionTime ?? '')}
                  name="reactionTime"
                />
                <label className={isRateFactorDisabled ? 'disabled-label' : ''}>RXNT</label>
                {!isRateFactorDisabled && (
                  <button className="info-button" data-title={`${inputInfo.reactionTime.name}: ${inputInfo.reactionTime.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container quad ${recoveryTimeError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isRateFactorDisabled}
                  value={isRateFactorDisabled ? '' : (modes[currentMode]?.recoveryTime ?? '')}
                  name="recoveryTime"
                />
                <label className={isRateFactorDisabled ? 'disabled-label' : ''}>RCVT</label>
                {!isRateFactorDisabled && (
                  <button className="info-button" data-title={`${inputInfo.recoveryTime.name}: ${inputInfo.recoveryTime.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container quad ${rateFactorError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isRateFactorDisabled}
                  value={isRateFactorDisabled ? '' : (modes[currentMode]?.rateFactor ?? '')}
                  name="rateFactor"
                />
                <label className={isRateFactorDisabled ? 'disabled-label' : ''}>RF</label>
                {!isRateFactorDisabled && (
                  <button className="info-button" data-title={`${inputInfo.rateFactor.name}: ${inputInfo.rateFactor.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container quad ${avDelayError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isAvDelayDisabled}
                  value={isAvDelayDisabled ? '' : (modes[currentMode]?.avDelay ?? '')}
                  name="avDelay"
                />
                <label className={isAvDelayDisabled ? 'disabled-label' : ''}>AVD</label>
                {!isAvDelayDisabled && (
                  <button className="info-button" data-title={`${inputInfo.avDelay.name}: ${inputInfo.avDelay.range}`}>
                    <Info size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="input-row">
              <div className="activity-threshold-container">
                <label className={`label-slider ${isRateFactorDisabled ? 'disabled' : ''}`}>
                  Activity Threshold
                </label>
                <div className={`input-container long ${activityThresholdError ? 'validation-error' : ''}`}>
                  <input
                    type="range"
                    className="input-field"
                    onChange={(e) => {
                      handleInputChange(e);
                      setActivityThreshold(e.target.value);
                    }}
                    disabled={isRateFactorDisabled}
                    value={isRateFactorDisabled ? '' : activityThreshold}
                    name="activityThreshold"
                    min="1"
                    max="7"
                  />
                  <span className="slider-value">{isRateFactorDisabled ? '' : activityThresholdLabels[activityThreshold - 1]}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit and Discard Buttons */}
          <div className="button-container">
            <button className="submit-button" type="button" onClick={handleSubmit}>
              <HardDriveUpload size={16} />
              <span>Submit</span>
            </button>
            <button className="discard-button" type="button" onClick={handleDiscard}>
              <ClipboardX size={16} />
              <span>Discard</span>
            </button>
          </div>
        </>
      )}

      {/* Reports */}
      {view === 'REPORTS' && (
        <div className="reports-container full-height">
          <button className="full-height-button electrogram-report" type="button">
            <span className="report-title">Electrogram Report</span>
            <span className="report-subtitle">Detailed tabular electrogram data</span>
          </button>
          <button className="full-height-button parameter-log" type="button" onClick={downloadParameterLog}>
            <span className="report-title">Parameter Log</span>
            <span className="report-subtitle">Full history of mode and parameter changes</span>
          </button>
          <button className="full-height-button serial-log" type="button">
            <span className="report-title">Serial Log</span>
            <span className="report-subtitle">Log of serial communication transmissions</span>
          </button>
          <button className="full-height-button activity-log" type="button" onClick={downloadLoginHistory}>
            <span className="report-title">Activity Log</span>
            <span className="report-subtitle">Full history of user account activity</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default RightSidebar
