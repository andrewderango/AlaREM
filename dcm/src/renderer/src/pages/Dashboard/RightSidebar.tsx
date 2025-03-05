import React, { useState, useEffect, useRef } from 'react'
import { Info, HardDriveUpload, ClipboardX, Menu, HeartPulse, FileText } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import useStore from '@renderer/store/mainStore'
import { SerialConnectionResponse } from 'src/common/types'

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
  atrialSensError: boolean
  ventricularSensError: boolean
  lowerRateLimitError: boolean
  upperRateLimitError: boolean
  rateFactorError: boolean
  reactionTimeError: boolean
  recoveryTimeError: boolean
  activityThresholdError: boolean
  avDelayError: boolean
  isAtriumDisabled: boolean
  isVentricleDisabled: boolean
  isAtrialSensDisabled: boolean
  isVentricularSensDisabled: boolean
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
  handleSubmit,
  handleDiscard,
  atriumAmpError,
  ventricleAmpError,
  atrialPWError,
  ventriclePWError,
  atrialRPError,
  ventricleRPError,
  atrialSensError,
  ventricularSensError,
  lowerRateLimitError,
  upperRateLimitError,
  rateFactorError,
  reactionTimeError,
  recoveryTimeError,
  activityThresholdError,
  avDelayError,
  isAtriumDisabled,
  isVentricleDisabled,
  isAtrialSensDisabled,
  isVentricularSensDisabled,
  isRateFactorDisabled,
  isAvDelayDisabled,
  isRateLimitDisabled,
  telemetryStatus,
  currentMode,
  modes,
  isVisible,
  username,
}) => {
  const [view, setView] = useState<'PARAMETERS' | 'REPORTS'>('PARAMETERS')
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [activityThreshold, setActivityThreshold] = useState(
    modes[currentMode]?.activityThreshold ?? 1,
  )
  const [disableSubmit, setDisableSubmit] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const helpRef = useRef<HTMLDivElement>(null)
  const { connectionStatus } = useStore()
  const { addToast } = useToast()

  window.api.onSerialConnectionMessage((message: SerialConnectionResponse) => {
    if (message.type === 'connection') {
      if (message.connectionType === 'initialize' && message.status === 'success') {
        setDisableSubmit(false)
      } else if (message.connectionType === 'initialize' && message.status === 'failed') {
        setDisableSubmit(true)
      } else if (message.connectionType === 'reconnect' && message.status === 'reconnecting') {
        setDisableSubmit(true)
      } else if (message.connectionType === 'reconnect' && message.status === 'success') {
        setDisableSubmit(false)
      }
    }
  })

  useEffect(() => {
    if (connectionStatus === 'CONNECTED') {
      setDisableSubmit(false)
    } else if (connectionStatus === 'DISCONNECTED') {
      setDisableSubmit(true)
    } else if (connectionStatus === 'RECONNECTING') {
      setDisableSubmit(true)
    }
  }, [setDisableSubmit, connectionStatus])

  const inputInfo = {
    atriumAmp: { name: 'Atrium Amplitude', range: '0.5 - 5 V' },
    ventricleAmp: { name: 'Ventricle Amplitude', range: '0.5 - 5 V' },
    atrialPW: { name: 'Atrial Pulse Width', range: '1 - 30 ms' },
    ventriclePW: { name: 'Ventricular Pulse Width', range: '1 - 30 ms' },
    atrialRP: { name: 'Atrial Refractory Period', range: '150 - 500 ms' },
    ventricleRP: { name: 'Ventricular Refractory Period', range: '150 - 500 ms' },
    atrialSensitivity: { name: 'Atrial Sensitivity', range: '0 - 5 V' },
    ventricularSensitivity: { name: 'Ventricular Sensitivity', range: '0 - 5 V' },
    lowerRateLimit: { name: 'Lower Rate Limit', range: '30 - 175 bpm' },
    upperRateLimit: { name: 'Upper Rate Limit', range: '50 - 175 bpm' },
    rateFactor: { name: 'Rate Factor', range: '1 - 16' },
    reactionTime: { name: 'Reaction Time', range: '1 - 50 s' },
    recoveryTime: { name: 'Recovery Time', range: '1 - 240 s' },
    activityThreshold: { name: 'Activity Threshold', range: '1 - 7' },
    avDelay: { name: 'Atrioventricular Delay', range: '30 - 300 ms' },
  }

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
  }, [
    isAtriumDisabled,
    isVentricleDisabled,
    isAvDelayDisabled,
    isRateFactorDisabled,
    isRateLimitDisabled,
    isAtrialSensDisabled,
    isVentricularSensDisabled,
  ])

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
    setActivityThreshold(modes[currentMode]?.activityThreshold ?? 1)
  }, [currentMode, modes])

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
  ]

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
            <h3>Continuous Parameters</h3>
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
                    <strong>Atrium Amp:</strong> Amplitude of the atrial pulse (V)
                  </li>
                  <li>
                    <strong>Ventricle Amp:</strong> Amplitude of the ventricular pulse (V)
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
              <div
                className={`input-container double ${lowerRateLimitError ? 'validation-error' : ''}`}
              >
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.lowerRateLimit.name}: ${inputInfo.lowerRateLimit.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div
                className={`input-container double ${upperRateLimitError ? 'validation-error' : ''}`}
              >
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.upperRateLimit.name}: ${inputInfo.upperRateLimit.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="input-row">
              <div className={`input-container quad ${atriumAmpError ? 'validation-error' : ''}`}>
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.atriumAmp.name}: ${inputInfo.atriumAmp.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container quad ${atrialPWError ? 'validation-error' : ''}`}>
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.atrialPW.name}: ${inputInfo.atrialPW.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container quad ${atrialRPError ? 'validation-error' : ''}`}>
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.atrialRP.name}: ${inputInfo.atrialRP.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container quad ${atrialSensError ? 'validation-error' : ''}`}>
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isAtrialSensDisabled}
                  value={isAtrialSensDisabled ? '' : (modes[currentMode]?.atrialSensitivity ?? '')}
                  name="atrialSens"
                />
                <label className={isAtrialSensDisabled ? 'disabled-label' : ''}>ASN</label>
                {!isAtrialSensDisabled && (
                  <button
                    className="info-button"
                    data-title={`${inputInfo.atrialSensitivity.name}: ${inputInfo.atrialSensitivity.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="input-row">
              <div
                className={`input-container quad ${ventricleAmpError ? 'validation-error' : ''}`}
              >
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.ventricleAmp.name}: ${inputInfo.ventricleAmp.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container quad ${ventriclePWError ? 'validation-error' : ''}`}>
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.ventriclePW.name}: ${inputInfo.ventriclePW.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div className={`input-container quad ${ventricleRPError ? 'validation-error' : ''}`}>
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.ventricleRP.name}: ${inputInfo.ventricleRP.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div
                className={`input-container quad ${ventricularSensError ? 'validation-error' : ''}`}
              >
                <input
                  type="number"
                  className="input-field"
                  onChange={handleInputChange}
                  disabled={isVentricularSensDisabled}
                  value={
                    isVentricularSensDisabled
                      ? ''
                      : (modes[currentMode]?.ventricularSensitivity ?? '')
                  }
                  name="ventricularSens"
                />
                <label className={isVentricularSensDisabled ? 'disabled-label' : ''}>VSN</label>
                {!isVentricularSensDisabled && (
                  <button
                    className="info-button"
                    data-title={`${inputInfo.ventricularSensitivity.name}: ${inputInfo.ventricularSensitivity.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="input-row">
              <div
                className={`input-container quad ${reactionTimeError ? 'validation-error' : ''}`}
              >
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.reactionTime.name}: ${inputInfo.reactionTime.range}`}
                  >
                    <Info size={12} />
                  </button>
                )}
              </div>
              <div
                className={`input-container quad ${recoveryTimeError ? 'validation-error' : ''}`}
              >
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.recoveryTime.name}: ${inputInfo.recoveryTime.range}`}
                  >
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.rateFactor.name}: ${inputInfo.rateFactor.range}`}
                  >
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
                  <button
                    className="info-button"
                    data-title={`${inputInfo.avDelay.name}: ${inputInfo.avDelay.range}`}
                  >
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
                <div
                  className={`input-container long ${activityThresholdError ? 'validation-error' : ''}`}
                >
                  <input
                    type="range"
                    className="input-field"
                    onChange={(e) => {
                      handleInputChange(e)
                      setActivityThreshold(e.target.value)
                    }}
                    disabled={isRateFactorDisabled}
                    value={isRateFactorDisabled ? '' : activityThreshold}
                    name="activityThreshold"
                    min="1"
                    max="7"
                  />
                  <span className="slider-value">
                    {isRateFactorDisabled ? '' : activityThresholdLabels[activityThreshold - 1]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit and Discard Buttons */}
          <div className="button-container">
            <button
              className="submit-button"
              type="button"
              onClick={handleSubmit}
              disabled={disableSubmit}
            >
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
          {/*
          <button className="full-height-button electrogram-report" type="button">
            <span className="report-title">Electrogram Report</span>
            <span className="report-subtitle">Detailed tabular electrogram data</span>
          </button>
          */}
          <button
            className="full-height-button parameter-log"
            type="button"
            onClick={downloadParameterLog}
          >
            <span className="report-title">Parameter Log</span>
            <span className="report-subtitle">Full history of mode and parameter changes</span>
          </button>
          {/*
          <button className="full-height-button serial-log" type="button">
            <span className="report-title">Serial Log</span>
            <span className="report-subtitle">Log of serial communication transmissions</span>
          </button>
          */}
          <button
            className="full-height-button activity-log"
            type="button"
            onClick={downloadLoginHistory}
          >
            <span className="report-title">Activity Log</span>
            <span className="report-subtitle">Full history of user account activity</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default RightSidebar
