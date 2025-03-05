import React, { useEffect, useState } from 'react'
import useStore from '@renderer/store/mainStore'
import { useToast } from '../../context/ToastContext'
import { Activity, HardDriveUpload, ClipboardX, Info, XCircle } from 'lucide-react'
import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'
import MainContent from './MainContent'
import './Dashboard.css'

function Dashboard(): JSX.Element {
  // set up states for the following:
  // - the current user via the UserContext
  // - function to add toasts via the ToastContext
  // - current time
  // - telemetry status
  // - whether the help popup is shown
  // - the selected mode
  // - the mode that was submitted
  // - whether the terminate button is disabled
  // - whether telemetry is terminated
  // - the natural heart rate
  // - the pacemaker heart rate

  // for now we'll only test the user state
  const {
    username,
    serialNumber,
    lastUsedMode,
    connectionStatus,
    telemetryStatus,
    telemetry,
    currentMode,
    modes,
    dispatch,
  } = useStore()

  const { addToast } = useToast()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showHelp, setShowHelp] = useState(false)
  const [submittedMode, setSubmittedMode] = useState<
    | 'VOO'
    | 'AOO'
    | 'VVI'
    | 'AAI'
    | 'VOOR'
    | 'AOOR'
    | 'VVIR'
    | 'AAIR'
    | 'DDDR'
    | 'DDD'
    | 'OFF'
    | null
  >(null)

  const [telemetryRate, _setTelemetryRate] = useState<number>(500)
  const [submitCount, setSubmitCount] = useState(0)

  // these states are for the error handling of the input fields
  // if an error is true, the input field will have a red border
  const [atriumAmpError, setAtriumAmpError] = useState<boolean>(false)
  const [ventricleAmpError, setVentricleAmpError] = useState<boolean>(false)
  const [atrialPWError, setAtrialPWError] = useState<boolean>(false)
  const [ventriclePWError, setVentriclePWError] = useState<boolean>(false)
  const [atrialRPError, setAtrialRPError] = useState<boolean>(false)
  const [ventricleRPError, setVentricleRPError] = useState<boolean>(false)
  const [lowerRateLimitError, setLowerRateLimitError] = useState<boolean>(false)
  const [upperRateLimitError, setUpperRateLimitError] = useState<boolean>(false)
  const [rateFactorError, setRateFactorError] = useState<boolean>(false)
  const [reactionTimeError, setReactionTimeError] = useState<boolean>(false)
  const [recoveryTimeError, setRecoveryTimeError] = useState<boolean>(false)
  const [activityThresholdError, setActivityThresholdError] = useState<boolean>(false)
  const [avDelayError, setAvDelayError] = useState<boolean>(false)

  // have to convert the variables to state variables to force a rerender
  const [isAtriumDisabled, setIsAtriumDisabled] = useState<boolean>(false)
  const [isVentricleDisabled, setIsVentricleDisabled] = useState<boolean>(false)
  const [isRateLimitDisabled, setIsRateLimitDisabled] = useState<boolean>(false)
  const [isRateFactorDisabled, setIsRateFactorDisabled] = useState<boolean>(false)
  const [isAvDelayDisabled, setIsAvDelayDisabled] = useState<boolean>(false)
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true)

  const toggleRightSidebar = () => {
    setIsRightSidebarVisible(!isRightSidebarVisible)
  }

  useEffect(() => {
    setIsAtriumDisabled(
      currentMode === 'VOO' ||
        currentMode === 'VVI' ||
        currentMode === 'OFF' ||
        currentMode === 'VOOR' ||
        currentMode === 'VVIR',
    )
    setIsVentricleDisabled(
      currentMode === 'AOO' ||
        currentMode === 'AAI' ||
        currentMode === 'OFF' ||
        currentMode === 'AOOR' ||
        currentMode === 'AAIR',
    )
    setIsAvDelayDisabled(currentMode !== 'DDDR' && currentMode !== 'DDD')
    setIsRateFactorDisabled(currentMode !== 'DDDR' && currentMode !== 'AOOR' && currentMode !== 'AAIR' && currentMode !== 'VOOR' && currentMode !== 'VVIR')
    setIsRateLimitDisabled(currentMode === 'OFF')
  }, [currentMode])

  // set up a timer to update the current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return (): void => clearInterval(timer)
  }, [])

  // effect hook runs when user changes
  // sets the selected mode and submitted mode to the last used mode
  useEffect(() => {
    if (lastUsedMode) {
      setSubmittedMode(lastUsedMode)
      dispatch({ type: 'UPDATE_CURRENT_MODE', payload: lastUsedMode })
      dispatch({ type: 'UPDATE_TELEMETRY_STATUS', payload: 'ON' })
      dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'CONNECTED' })
    }
  }, [lastUsedMode])

  // handles the mode selection
  const handleModeSelect = (
    mode:
      | 'VOO'
      | 'AOO'
      | 'VVI'
      | 'AAI'
      | 'VOOR'
      | 'AOOR'
      | 'VVIR'
      | 'AAIR'
      | 'DDDR'
      | 'DDD'
      | 'OFF',
  ): void => {
    // set the selected mode, enable terminate button, and set telemetry not terminated
    dispatch({ type: 'UPDATE_CURRENT_MODE', payload: mode })

    // reset error states
    setAtriumAmpError(false)
    setVentricleAmpError(false)
    setAtrialPWError(false)
    setVentriclePWError(false)
    setAtrialRPError(false)
    setVentricleRPError(false)
    setLowerRateLimitError(false)
    setUpperRateLimitError(false)
    setRateFactorError(false)
    setReactionTimeError(false)
    setRecoveryTimeError(false)
    setActivityThresholdError(false)
    setAvDelayError(false)
  }

  // helper function to get appropriate icon based on communication status
  const getStatusIcon = (): JSX.Element => {
    return connectionStatus === 'CONNECTED' ? (
      <Activity size={16} className="activity-icon" />
    ) : (
      <XCircle size={16} className="disconnected-icon" />
    )
  }

  // helper function to get appropriate class based on communication status
  const getStatusClass = (): string => {
    return connectionStatus === 'CONNECTED'
      ? 'communication-status'
      : 'communication-status disconnected'
  }

  const normalizeInput = (value: string) => {
    // check if the value is a decimal number
    if (/^0\.\d+$/.test(value)) {
      return value
    }
    // remove leading zeros for integers
    return value.replace(/^0+/, '') || '0'
  }

  // handles the input change for the input fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // get the name and value from the event
    const { name, value } = e.target
    const normalizedValue = normalizeInput(value)
    e.target.value = normalizedValue
  
    // check if only numbers are entered for lower and upper rate limits
    if ((name === 'lowerRateLimit' || name === 'upperRateLimit') && !/^\d*$/.test(normalizedValue)) {
      return
    }
  
    // check if only numbers and decimals are entered for other inputs
    if (
      name !== 'lowerRateLimit' && 
      name !== 'upperRateLimit' && 
      name !== 'reactionTime' &&
      name !== 'recoveryTime' &&
      name !== 'rateFactor' &&
      name !== 'avDelay' &&
      !/^\d*\.?\d*$/.test(normalizedValue)) {
      return
    }
  
    switch (name) {
      case 'atriumAmp':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { atrialAmplitude: parseFloat(normalizedValue) || 0 },
          },
        })
        break
      case 'ventricleAmp':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { ventricularAmplitude: parseFloat(normalizedValue) || 0 },
          },
        })
        break
      case 'atrialPW':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { atrialPulseWidth: parseFloat(normalizedValue) || 0 },
          },
        })
        break
      case 'ventriclePW':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { ventricularPulseWidth: parseFloat(normalizedValue) || 0 },
          },
        })
        break
      case 'atrialRP':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { atrialRefractoryPeriod: parseFloat(normalizedValue) || 0 },
          },
        })
        break
      case 'ventricleRP':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { ventricularRefractoryPeriod: parseFloat(normalizedValue) || 0 },
          },
        })
        break
      case 'lowerRateLimit':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { lowerRateLimit: parseInt(normalizedValue) || 0 },
          },
        })
        break
      case 'upperRateLimit':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { upperRateLimit: parseInt(normalizedValue) || 0 },
          },
        })
        break
      case 'rateFactor':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { rateFactor: parseInt(normalizedValue) || 0 },
          },
        })
        break
      case 'avDelay':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { avDelay: parseInt(normalizedValue) || 0 },
          },
        })
        break
      case 'reactionTime':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { reactionTime: parseInt(normalizedValue) || 0 },
          },
        })
        break
      case 'recoveryTime':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { recoveryTime: parseInt(normalizedValue) || 0 },
          },
        })
        break
      case 'activityThreshold':
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: currentMode,
            settings: { activityThreshold: parseInt(normalizedValue) || 0 },
          },
        })
        break
      default:
        break
    }
  }

  // handles the discard button click
  const handleDiscard = async (): Promise<void> => {
    // reset error states
    setAtriumAmpError(false)
    setVentricleAmpError(false)
    setAtrialPWError(false)
    setVentriclePWError(false)
    setAtrialRPError(false)
    setVentricleRPError(false)
    setLowerRateLimitError(false)
    setUpperRateLimitError(false)
    setRateFactorError(false)
    setReactionTimeError(false)
    setRecoveryTimeError(false)
    setActivityThresholdError(false)
    setAvDelayError(false)

    // just set the values back to previous values based on the submitted mode
    switch (submittedMode) {
      case 'AOO': {
        // get the settings for the mode via ipc
        const aooSettings = await window.api.getSettingsForMode(username ?? '', 'AOO')
        // then update appropriate state variables, converted to strings
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'AOO' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'AOO',
            settings: {
              atrialAmplitude: aooSettings.settings?.atrialAmplitude ?? 0,
              atrialPulseWidth: aooSettings.settings?.atrialPulseWidth ?? 0,
              atrialRefractoryPeriod: aooSettings.settings?.atrialRefractoryPeriod ?? 0,
              lowerRateLimit: aooSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: aooSettings.settings?.upperRateLimit ?? 0,
            },
          },
        })

        break
      }
      case 'VOO': {
        // get the settings for the mode via ipc
        const vooSettings = await window.api.getSettingsForMode(username ?? '', 'VOO')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'VOO' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'VOO',
            settings: {
              ventricularAmplitude: vooSettings.settings?.ventricularAmplitude ?? 0,
              ventricularPulseWidth: vooSettings.settings?.ventricularPulseWidth ?? 0,
              ventricularRefractoryPeriod: vooSettings.settings?.ventricularRefractoryPeriod ?? 0,
              lowerRateLimit: vooSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: vooSettings.settings?.upperRateLimit ?? 0,
            },
          },
        })

        break
      }
      case 'AAI': {
        // get the settings for the mode via ipc
        const aaiSettings = await window.api.getSettingsForMode(username ?? '', 'AAI')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'AAI' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'AAI',
            settings: {
              atrialAmplitude: aaiSettings.settings?.atrialAmplitude ?? 0,
              atrialPulseWidth: aaiSettings.settings?.atrialPulseWidth ?? 0,
              atrialRefractoryPeriod: aaiSettings.settings?.atrialRefractoryPeriod ?? 0,
              lowerRateLimit: aaiSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: aaiSettings.settings?.upperRateLimit ?? 0,
            },
          },
        })

        break
      }
      case 'VVI': {
        // get the settings for the mode via ipc
        const vviSettings = await window.api.getSettingsForMode(username ?? '', 'VVI')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'VVI' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'VVI',
            settings: {
              ventricularAmplitude: vviSettings.settings?.ventricularAmplitude ?? 0,
              ventricularPulseWidth: vviSettings.settings?.ventricularPulseWidth ?? 0,
              ventricularRefractoryPeriod: vviSettings.settings?.ventricularRefractoryPeriod ?? 0,
              lowerRateLimit: vviSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: vviSettings.settings?.upperRateLimit ?? 0,
            },
          },
        })

        break
      }
      case 'AOOR': {
        // get the settings for the mode via ipc
        const aoorSettings = await window.api.getSettingsForMode(username ?? '', 'AOOR')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'AOOR' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'AOOR',
            settings: {
              atrialAmplitude: aoorSettings.settings?.atrialAmplitude ?? 0,
              atrialPulseWidth: aoorSettings.settings?.atrialPulseWidth ?? 0,
              atrialRefractoryPeriod: aoorSettings.settings?.atrialRefractoryPeriod ?? 0,
              lowerRateLimit: aoorSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: aoorSettings.settings?.upperRateLimit ?? 0,
              rateFactor: aoorSettings.settings?.rateFactor ?? 0,
              reactionTime: aoorSettings.settings?.reactionTime ?? 0,
              recoveryTime: aoorSettings.settings?.recoveryTime ?? 0,
              activityThreshold: aoorSettings.settings?.activityThreshold ?? 4,
            },
          },
        })

        break
      }
      case 'VOOR': {
        // get the settings for the mode via ipc
        const voorSettings = await window.api.getSettingsForMode(username ?? '', 'VOOR')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'VOOR' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'VOOR',
            settings: {
              ventricularAmplitude: voorSettings.settings?.ventricularAmplitude ?? 0,
              ventricularPulseWidth: voorSettings.settings?.ventricularPulseWidth ?? 0,
              ventricularRefractoryPeriod: voorSettings.settings?.ventricularRefractoryPeriod ?? 0,
              lowerRateLimit: voorSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: voorSettings.settings?.upperRateLimit ?? 0,
              rateFactor: voorSettings.settings?.rateFactor ?? 0,
              reactionTime: voorSettings.settings?.reactionTime ?? 0,
              recoveryTime: voorSettings.settings?.recoveryTime ?? 0,
              activityThreshold: voorSettings.settings?.activityThreshold ?? 4,
            },
          },
        })

        break
      }
      case 'AAIR': {
        // get the settings for the mode via ipc
        const aairSettings = await window.api.getSettingsForMode(username ?? '', 'AAIR')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'AAIR' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'AAIR',
            settings: {
              atrialAmplitude: aairSettings.settings?.atrialAmplitude ?? 0,
              atrialPulseWidth: aairSettings.settings?.atrialPulseWidth ?? 0,
              atrialRefractoryPeriod: aairSettings.settings?.atrialRefractoryPeriod ?? 0,
              lowerRateLimit: aairSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: aairSettings.settings?.upperRateLimit ?? 0,
              rateFactor: aairSettings.settings?.rateFactor ?? 0,
              reactionTime: aairSettings.settings?.reactionTime ?? 0,
              recoveryTime: aairSettings.settings?.recoveryTime ?? 0,
              activityThreshold: aairSettings.settings?.activityThreshold ?? 4,
            },
          },
        })

        break
      }
      case 'VVIR': {
        // get the settings for the mode via ipc
        const vvirSettings = await window.api.getSettingsForMode(username ?? '', 'VVIR')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'VVIR' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'VVIR',
            settings: {
              ventricularAmplitude: vvirSettings.settings?.ventricularAmplitude ?? 0,
              ventricularPulseWidth: vvirSettings.settings?.ventricularPulseWidth ?? 0,
              ventricularRefractoryPeriod: vvirSettings.settings?.ventricularRefractoryPeriod ?? 0,
              lowerRateLimit: vvirSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: vvirSettings.settings?.upperRateLimit ?? 0,
              rateFactor: vvirSettings.settings?.rateFactor ?? 0,
              reactionTime: vvirSettings.settings?.reactionTime ?? 0,
              recoveryTime: vvirSettings.settings?.recoveryTime ?? 0,
              activityThreshold: vvirSettings.settings?.activityThreshold ?? 4,
            },
          },
        })

        break
      }
      case 'DDDR': {
        // get the settings for the mode via ipc
        const dddrSettings = await window.api.getSettingsForMode(username ?? '', 'DDDR')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'DDDR' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'DDDR',
            settings: {
              atrialAmplitude: dddrSettings.settings?.atrialAmplitude ?? 0,
              atrialPulseWidth: dddrSettings.settings?.atrialPulseWidth ?? 0,
              atrialRefractoryPeriod: dddrSettings.settings?.atrialRefractoryPeriod ?? 0,
              ventricularAmplitude: dddrSettings.settings?.ventricularAmplitude ?? 0,
              ventricularPulseWidth: dddrSettings.settings?.ventricularPulseWidth ?? 0,
              ventricularRefractoryPeriod: dddrSettings.settings?.ventricularRefractoryPeriod ?? 0,
              lowerRateLimit: dddrSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: dddrSettings.settings?.upperRateLimit ?? 0,
              rateFactor: dddrSettings.settings?.rateFactor ?? 0,
              avDelay: dddrSettings.settings?.avDelay ?? 0,
              reactionTime: dddrSettings.settings?.reactionTime ?? 0,
              recoveryTime: dddrSettings.settings?.recoveryTime ?? 0,
              activityThreshold: dddrSettings.settings?.activityThreshold ?? 4,
            },
          },
        })

        break
      }
      case 'DDD': {
        // get the settings for the mode via ipc
        const dddSettings = await window.api.getSettingsForMode(username ?? '', 'DDD')
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'DDD' })
        dispatch({
          type: 'UPDATE_MODE_SETTINGS',
          payload: {
            mode: 'DDD',
            settings: {
              atrialAmplitude: dddSettings.settings?.atrialAmplitude ?? 0,
              atrialPulseWidth: dddSettings.settings?.atrialPulseWidth ?? 0,
              atrialRefractoryPeriod: dddSettings.settings?.atrialRefractoryPeriod ?? 0,
              ventricularAmplitude: dddSettings.settings?.ventricularAmplitude ?? 0,
              ventricularPulseWidth: dddSettings.settings?.ventricularPulseWidth ?? 0,
              ventricularRefractoryPeriod: dddSettings.settings?.ventricularRefractoryPeriod ?? 0,
              lowerRateLimit: dddSettings.settings?.lowerRateLimit ?? 0,
              upperRateLimit: dddSettings.settings?.upperRateLimit ?? 0,
              avDelay: dddSettings.settings?.avDelay ?? 0,
            },
          },
        })

        break
      }
      case 'OFF':
        // set the current mode to off
        dispatch({ type: 'UPDATE_CURRENT_MODE', payload: 'OFF' })
        break
      default:
        break
    }

    addToast('Settings discarded', 'info')
  }

  // helper function to validate the input fields
  const validateInput = (): boolean => {
    let isValid = true

    // make sure the values are within the acceptable ranges
    // if not, set the error state to true and display a toast
    // otherwise, set the error state to false
    if (currentMode !== 'OFF') {
      if (modes[currentMode].lowerRateLimit < 30 || modes[currentMode].lowerRateLimit > 175) {
        addToast('Lower Rate Limit must be between 30 and 175 bpm', 'error')
        setLowerRateLimitError(true)
        isValid = false
      }

      if (modes[currentMode].upperRateLimit < 50 || modes[currentMode].upperRateLimit > 175) {
        addToast('Upper Rate Limit must be between 50 and 175 bpm', 'error')
        setUpperRateLimitError(true)
        isValid = false
      }

      if (modes[currentMode].upperRateLimit < modes[currentMode].lowerRateLimit) {
        addToast('Upper Rate Limit must be greater than or equal to Lower Rate Limit', 'error')
        setUpperRateLimitError(true)
        setLowerRateLimitError(true)
        isValid = false
      }
    }
    if (
      currentMode === 'AOO' ||
      currentMode === 'AAI' ||
      currentMode === 'DDDR' ||
      currentMode === 'DDD' ||
      currentMode === 'AOOR' ||
      currentMode === 'AAIR'
    ) {
      if (modes[currentMode].atrialAmplitude < 0.5 || modes[currentMode].atrialAmplitude > 10) {
        addToast('Atrium Amplitude must be between 0.5 and 10 mV', 'error')
        setAtriumAmpError(true)
        isValid = false
      } else {
        setAtriumAmpError(false)
      }
      if (modes[currentMode].atrialPulseWidth < 0.05 || modes[currentMode].atrialPulseWidth > 1.9) {
        addToast('Atrial Pulse Width must be between 0.05 and 1.9 ms', 'error')
        setAtrialPWError(true)
        isValid = false
      } else {
        setAtrialPWError(false)
      }
      if (
        modes[currentMode].atrialRefractoryPeriod < 150 ||
        modes[currentMode].atrialRefractoryPeriod > 500
      ) {
        addToast('Atrial Refractory Period must be between 150 and 500 ms', 'error')
        setAtrialRPError(true)
        isValid = false
      } else {
        setAtrialRPError(false)
      }
    }
    if (
      currentMode === 'VOO' ||
      currentMode === 'VVI' ||
      currentMode === 'DDDR' ||
      currentMode === 'DDD' ||
      currentMode === 'VOOR' ||
      currentMode === 'VVIR'
    ) {
      if (
        modes[currentMode].ventricularAmplitude < 0.5 ||
        modes[currentMode].ventricularAmplitude > 25
      ) {
        addToast('Ventricle Amplitude must be between 0.5 and 25 mV', 'error')
        setVentricleAmpError(true)
        isValid = false
      } else {
        setVentricleAmpError(false)
      }
      if (
        modes[currentMode].ventricularPulseWidth < 0.05 ||
        modes[currentMode].ventricularPulseWidth > 1.9
      ) {
        addToast('Ventricular Pulse Width must be between 0.05 and 1.9 ms', 'error')
        setVentriclePWError(true)
        isValid = false
      } else {
        setVentriclePWError(false)
      }
      if (
        modes[currentMode].ventricularRefractoryPeriod < 150 ||
        modes[currentMode].ventricularRefractoryPeriod > 500
      ) {
        addToast('Ventricular Refractory Period must be between 150 and 500 ms', 'error')
        setVentricleRPError(true)
        isValid = false
      } else {
        setVentricleRPError(false)
      }
    }
    if (currentMode === 'AOOR' || currentMode === 'VOOR' || currentMode === 'AAIR' || currentMode === 'VVIR' || currentMode === 'DDDR') {
      if (modes[currentMode].reactionTime < 10 || modes[currentMode].reactionTime > 50) {
        addToast('Reaction Time must be between 10 and 50 s', 'error')
        setReactionTimeError(true)
        isValid = false
      } else {
        setReactionTimeError(false)
      }
      if (modes[currentMode].recoveryTime < 10 || modes[currentMode].recoveryTime > 240) {
        addToast('Recovery Time must be between 10 and 240 s', 'error')
        setRecoveryTimeError(true)
        isValid = false
      } else {
        setRecoveryTimeError(false)
      }
      if (modes[currentMode].rateFactor < 1 || modes[currentMode].rateFactor > 16) {
        addToast('Rate Factor must be between 1 and 16', 'error')
        setRateFactorError(true)
        isValid = false
      } else {
        setRateFactorError(false)
      }
    }
    if (currentMode === 'DDDR' || currentMode === 'DDD') {
      if (modes[currentMode].avDelay < 30 || modes[currentMode].avDelay > 300) {
        addToast('AV Delay must be between 30 and 300 ms', 'error')
        setAvDelayError(true)
        isValid = false
      } else {
        setAvDelayError(false)
      }
    }
    if (currentMode === 'AOOR' || currentMode === 'VOOR' || currentMode === 'AAIR' || currentMode === 'VVIR' || currentMode === 'DDDR') {
      if (modes[currentMode].activityThreshold < 1 || modes[currentMode].activityThreshold > 7) {
        addToast('Activity Threshold must be between 1 and 7', 'error')
        setActivityThresholdError(true)
        isValid = false
      } else {
        setActivityThresholdError(false)
      }
    }

    return isValid
  }

  // handles the submit button click
  const handleSubmit = async (_e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    // quit early if there is no user
    if (!username) {
      return
    }

    // reset error states
    setAtriumAmpError(false)
    setVentricleAmpError(false)
    setAtrialPWError(false)
    setVentriclePWError(false)
    setAtrialRPError(false)
    setVentricleRPError(false)
    setLowerRateLimitError(false)
    setUpperRateLimitError(false)
    setRateFactorError(false)
    setAvDelayError(false)

    // quit early if the input is not valid
    const isValid = validateInput()
    if (!isValid) {
      return
    }

    // reset error states
    setAtriumAmpError(false)
    setVentricleAmpError(false)
    setAtrialPWError(false)
    setVentriclePWError(false)
    setAtrialRPError(false)
    setVentricleRPError(false)
    setLowerRateLimitError(false)
    setUpperRateLimitError(false)
    setRateFactorError(false)
    setAvDelayError(false)

    // e.preventDefault()
    // based on selected mode, call the appropriate ipc channel with
    // right settings
    switch (currentMode) {
      case 'AOO':
        if (
          modes[currentMode].atrialAmplitude !== 0 &&
          modes[currentMode].atrialPulseWidth !== 0 &&
          modes[currentMode].atrialRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0
        ) {
          // ipc channel sets the values for the mode for given user
          // ! we also might wanna fix how we get the values here
          window.api.setUser(username, 'AOO', {
            atrialAmplitude: modes[currentMode].atrialAmplitude,
            atrialPulseWidth: modes[currentMode].atrialPulseWidth,
            atrialRefractoryPeriod: modes[currentMode].atrialRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
          })
          setSubmittedMode('AOO')
        }
        break
      case 'VOO':
        // same as above, but for VOO
        if (
          modes[currentMode].ventricularAmplitude !== 0 &&
          modes[currentMode].ventricularPulseWidth !== 0 &&
          modes[currentMode].ventricularRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0
        ) {
          window.api.setUser(username, 'VOO', {
            ventricularAmplitude: modes[currentMode].ventricularAmplitude,
            ventricularPulseWidth: modes[currentMode].ventricularPulseWidth,
            ventricularRefractoryPeriod: modes[currentMode].ventricularRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
          })
          setSubmittedMode('VOO')
        }
        setSubmittedMode('VOO')
        break
      case 'AAI':
        // same as above, but for AAI
        if (
          modes[currentMode].atrialAmplitude !== 0 &&
          modes[currentMode].atrialPulseWidth !== 0 &&
          modes[currentMode].atrialRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0
        ) {
          window.api.setUser(username, 'AAI', {
            atrialAmplitude: modes[currentMode].atrialAmplitude,
            atrialPulseWidth: modes[currentMode].atrialPulseWidth,
            atrialRefractoryPeriod: modes[currentMode].atrialRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
          })
        }
        setSubmittedMode('AAI')
        break
      case 'VVI':
        // same as above, but for VVI
        if (
          modes[currentMode].ventricularAmplitude !== 0 &&
          modes[currentMode].ventricularPulseWidth !== 0 &&
          modes[currentMode].ventricularRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0
        ) {
          window.api.setUser(username, 'VVI', {
            ventricularAmplitude: modes[currentMode].ventricularAmplitude,
            ventricularPulseWidth: modes[currentMode].ventricularPulseWidth,
            ventricularRefractoryPeriod: modes[currentMode].ventricularRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
          })
        }
        setSubmittedMode('VVI')
        break
      case 'AOOR':
        // same as above, but for AOOR
        if (
          modes[currentMode].atrialAmplitude !== 0 &&
          modes[currentMode].atrialPulseWidth !== 0 &&
          modes[currentMode].atrialRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0 && 
          modes[currentMode].rateFactor !== 0 &&
          modes[currentMode].reactionTime !== 0 &&
          modes[currentMode].recoveryTime !== 0 &&
          modes[currentMode].activityThreshold !== 0
        ) {
          window.api.setUser(username, 'AOOR', {
            atrialAmplitude: modes[currentMode].atrialAmplitude,
            atrialPulseWidth: modes[currentMode].atrialPulseWidth,
            atrialRefractoryPeriod: modes[currentMode].atrialRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
            rateFactor: modes[currentMode].rateFactor,
            reactionTime: modes[currentMode].reactionTime,
            recoveryTime: modes[currentMode].recoveryTime,
            activityThreshold: modes[currentMode].activityThreshold,
          })
        }
        setSubmittedMode('AOOR')
        break
      case 'VOOR':
        // same as above, but for VOOR
        if (
          modes[currentMode].ventricularAmplitude !== 0 &&
          modes[currentMode].ventricularPulseWidth !== 0 &&
          modes[currentMode].ventricularRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0 &&
          modes[currentMode].rateFactor !== 0 &&
          modes[currentMode].reactionTime !== 0 &&
          modes[currentMode].recoveryTime !== 0 &&
          modes[currentMode].activityThreshold !== 0
        ) {
          window.api.setUser(username, 'VOOR', {
            ventricularAmplitude: modes[currentMode].ventricularAmplitude,
            ventricularPulseWidth: modes[currentMode].ventricularPulseWidth,
            ventricularRefractoryPeriod: modes[currentMode].ventricularRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
            rateFactor: modes[currentMode].rateFactor,
            reactionTime: modes[currentMode].reactionTime,
            recoveryTime: modes[currentMode].recoveryTime,
            activityThreshold: modes[currentMode].activityThreshold,
          })
        }
        setSubmittedMode('VOOR')
        break
      case 'AAIR':
        // same as above, but for AAIR
        if (
          modes[currentMode].atrialAmplitude !== 0 &&
          modes[currentMode].atrialPulseWidth !== 0 &&
          modes[currentMode].atrialRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0 &&
          modes[currentMode].rateFactor !== 0 &&
          modes[currentMode].reactionTime !== 0 &&
          modes[currentMode].recoveryTime !== 0 &&
          modes[currentMode].activityThreshold !== 0
        ) {
          window.api.setUser(username, 'AAIR', {
            atrialAmplitude: modes[currentMode].atrialAmplitude,
            atrialPulseWidth: modes[currentMode].atrialPulseWidth,
            atrialRefractoryPeriod: modes[currentMode].atrialRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
            rateFactor: modes[currentMode].rateFactor,
            reactionTime: modes[currentMode].reactionTime,
            recoveryTime: modes[currentMode].recoveryTime,
            activityThreshold: modes[currentMode].activityThreshold,
          })
        }
        setSubmittedMode('AAIR')
        break
      case 'VVIR':
        // same as above, but for VVIR
        if (
          modes[currentMode].ventricularAmplitude !== 0 &&
          modes[currentMode].ventricularPulseWidth !== 0 &&
          modes[currentMode].ventricularRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0 &&
          modes[currentMode].rateFactor !== 0 &&
          modes[currentMode].reactionTime !== 0 &&
          modes[currentMode].recoveryTime !== 0 &&
          modes[currentMode].activityThreshold !== 0
        ) {
          window.api.setUser(username, 'VVIR', {
            ventricularAmplitude: modes[currentMode].ventricularAmplitude,
            ventricularPulseWidth: modes[currentMode].ventricularPulseWidth,
            ventricularRefractoryPeriod: modes[currentMode].ventricularRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
            rateFactor: modes[currentMode].rateFactor,
            reactionTime: modes[currentMode].reactionTime,
            recoveryTime: modes[currentMode].recoveryTime,
            activityThreshold: modes[currentMode].activityThreshold,
          })
        }
        setSubmittedMode('VVIR')
        break
      case 'DDDR':
        // same as above, but for DDDR
        if (
          modes[currentMode].atrialAmplitude !== 0 &&
          modes[currentMode].atrialPulseWidth !== 0 &&
          modes[currentMode].atrialRefractoryPeriod !== 0 &&
          modes[currentMode].ventricularAmplitude !== 0 &&
          modes[currentMode].ventricularPulseWidth !== 0 &&
          modes[currentMode].ventricularRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0 &&
          modes[currentMode].rateFactor !== 0 &&
          modes[currentMode].avDelay !== 0 &&
          modes[currentMode].reactionTime !== 0 &&
          modes[currentMode].recoveryTime !== 0 &&
          modes[currentMode].activityThreshold !== 0
        ) {
          window.api.setUser(username, 'DDDR', {
            atrialAmplitude: modes[currentMode].atrialAmplitude,
            atrialPulseWidth: modes[currentMode].atrialPulseWidth,
            atrialRefractoryPeriod: modes[currentMode].atrialRefractoryPeriod,
            ventricularAmplitude: modes[currentMode].ventricularAmplitude,
            ventricularPulseWidth: modes[currentMode].ventricularPulseWidth,
            ventricularRefractoryPeriod: modes[currentMode].ventricularRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
            rateFactor: modes[currentMode].rateFactor,
            avDelay: modes[currentMode].avDelay,
            reactionTime: modes[currentMode].reactionTime,
            recoveryTime: modes[currentMode].recoveryTime,
            activityThreshold: modes[currentMode].activityThreshold,
          })
        }
        setSubmittedMode('DDDR')
        break
      case 'DDD':
        // same as above, but for DDD
        if (
          modes[currentMode].atrialAmplitude !== 0 &&
          modes[currentMode].atrialPulseWidth !== 0 &&
          modes[currentMode].atrialRefractoryPeriod !== 0 &&
          modes[currentMode].ventricularAmplitude !== 0 &&
          modes[currentMode].ventricularPulseWidth !== 0 &&
          modes[currentMode].ventricularRefractoryPeriod !== 0 &&
          modes[currentMode].lowerRateLimit !== 0 &&
          modes[currentMode].upperRateLimit !== 0 &&
          modes[currentMode].avDelay !== 0
        ) {
          window.api.setUser(username, 'DDD', {
            atrialAmplitude: modes[currentMode].atrialAmplitude,
            atrialPulseWidth: modes[currentMode].atrialPulseWidth,
            atrialRefractoryPeriod: modes[currentMode].atrialRefractoryPeriod,
            ventricularAmplitude: modes[currentMode].ventricularAmplitude,
            ventricularPulseWidth: modes[currentMode].ventricularPulseWidth,
            ventricularRefractoryPeriod: modes[currentMode].ventricularRefractoryPeriod,
            lowerRateLimit: modes[currentMode].lowerRateLimit,
            upperRateLimit: modes[currentMode].upperRateLimit,
            avDelay: modes[currentMode].avDelay,
          })
        }
        setSubmittedMode('DDD')
        break
      case 'OFF':
        window.api.setUser(username, 'OFF', {})
        setSubmittedMode('OFF')
        break
      default:
        console.log('Invalid mode')
        break
    }

    addToast('Settings sent and saved', 'success')
    dispatch({ type: 'UPDATE_TELEMETRY_STATUS', payload: 'ON' })
    dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'CONNECTED' })

    setSubmitCount(prevCount => {
      const newCount = prevCount + 1;
      let newPeriod;
      if (newCount === 1) {
        newPeriod = 30;
      } else if (newCount === 2) {
        newPeriod = 60;
      } else if (newCount === 3) {
        newPeriod = 60;
        window.dispatchEvent(new CustomEvent('changeAtriumType', { detail: 1 }));
      }
      window.dispatchEvent(new CustomEvent('changePeriod', { detail: newPeriod }));
      return newCount;
    });
  }

  // effect hook to check if the input fields are filled
  // if they are, update the CSS class to filled for nice animations
  useEffect(() => {
    const inputs = document.querySelectorAll('.input-field')
    inputs.forEach((input) => {
      const value = input.getAttribute('value')
      if (value !== '') {
        input.classList.add('filled')
      } else {
        input.classList.remove('filled')
      }
    })
  }, [
    modes[currentMode]?.atrialAmplitude,
    modes[currentMode]?.ventricularAmplitude,
    modes[currentMode]?.atrialPulseWidth,
    modes[currentMode]?.ventricularPulseWidth,
    modes[currentMode]?.atrialRefractoryPeriod,
    modes[currentMode]?.ventricularRefractoryPeriod,
    modes[currentMode]?.lowerRateLimit,
    modes[currentMode]?.upperRateLimit,
    modes[currentMode]?.rateFactor,
    modes[currentMode]?.avDelay,
    modes[currentMode]?.reactionTime,
    modes[currentMode]?.recoveryTime,
    modes[currentMode]?.activityThreshold,
    currentMode,
  ])

  // populate settings for selected mode on initial mount and when mode changes
  useEffect(() => {
    // quit early if there is no user or mode selected
    if (!currentMode) {
      return
    }

    // now get the settings for the selected mode via ipc
    window.api.getSettingsForMode(username, currentMode).then((response) => {
      if (response.success) {
        const settings = response.settings
        // and set the appropriate state variables based on the mode
        switch (currentMode) {
          case 'AOO':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'AOO',
                settings: {
                  atrialAmplitude: settings?.atrialAmplitude ?? 0,
                  atrialPulseWidth: settings?.atrialPulseWidth ?? 0,
                  atrialRefractoryPeriod: settings?.atrialRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                },
              },
            })

            break
          case 'VOO':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'VOO',
                settings: {
                  ventricularAmplitude: settings?.ventricularAmplitude ?? 0,
                  ventricularPulseWidth: settings?.ventricularPulseWidth ?? 0,
                  ventricularRefractoryPeriod: settings?.ventricularRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                },
              },
            })

            break
          case 'AAI':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'AAI',
                settings: {
                  atrialAmplitude: settings?.atrialAmplitude ?? 0,
                  atrialPulseWidth: settings?.atrialPulseWidth ?? 0,
                  atrialRefractoryPeriod: settings?.atrialRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                },
              },
            })

            break
          case 'VVI':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'VVI',
                settings: {
                  ventricularAmplitude: settings?.ventricularAmplitude ?? 0,
                  ventricularPulseWidth: settings?.ventricularPulseWidth ?? 0,
                  ventricularRefractoryPeriod: settings?.ventricularRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                },
              },
            })

            break
          case 'AOOR':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'AOOR',
                settings: {
                  atrialAmplitude: settings?.atrialAmplitude ?? 0,
                  atrialPulseWidth: settings?.atrialPulseWidth ?? 0,
                  atrialRefractoryPeriod: settings?.atrialRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                  rateFactor: settings?.rateFactor ?? 0,
                  reactionTime: settings?.reactionTime ?? 0,
                  recoveryTime: settings?.recoveryTime ?? 0,
                  activityThreshold: settings?.activityThreshold ?? 4,
                },
              },
            })

            break
          case 'VOOR':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'VOOR',
                settings: {
                  ventricularAmplitude: settings?.ventricularAmplitude ?? 0,
                  ventricularPulseWidth: settings?.ventricularPulseWidth ?? 0,
                  ventricularRefractoryPeriod: settings?.ventricularRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                  rateFactor: settings?.rateFactor ?? 0,
                  reactionTime: settings?.reactionTime ?? 0,
                  recoveryTime: settings?.recoveryTime ?? 0,
                  activityThreshold: settings?.activityThreshold ?? 4,
                },
              },
            })

            break
          case 'AAIR':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'AAIR',
                settings: {
                  atrialAmplitude: settings?.atrialAmplitude ?? 0,
                  atrialPulseWidth: settings?.atrialPulseWidth ?? 0,
                  atrialRefractoryPeriod: settings?.atrialRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                  rateFactor: settings?.rateFactor ?? 0,
                  reactionTime: settings?.reactionTime ?? 0,
                  recoveryTime: settings?.recoveryTime ?? 0,
                  activityThreshold: settings?.activityThreshold ?? 4,
                },
              },
            })

            break
          case 'VVIR':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'VVIR',
                settings: {
                  ventricularAmplitude: settings?.ventricularAmplitude ?? 0,
                  ventricularPulseWidth: settings?.ventricularPulseWidth ?? 0,
                  ventricularRefractoryPeriod: settings?.ventricularRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                  rateFactor: settings?.rateFactor ?? 0,
                  reactionTime: settings?.reactionTime ?? 0,
                  recoveryTime: settings?.recoveryTime ?? 0,
                  activityThreshold: settings?.activityThreshold ?? 4,
                },
              },
            })

            break
          case 'DDDR':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'DDDR',
                settings: {
                  atrialAmplitude: settings?.atrialAmplitude ?? 0,
                  atrialPulseWidth: settings?.atrialPulseWidth ?? 0,
                  atrialRefractoryPeriod: settings?.atrialRefractoryPeriod ?? 0,
                  ventricularAmplitude: settings?.ventricularAmplitude ?? 0,
                  ventricularPulseWidth: settings?.ventricularPulseWidth ?? 0,
                  ventricularRefractoryPeriod: settings?.ventricularRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                  rateFactor: settings?.rateFactor ?? 0,
                  avDelay: settings?.avDelay ?? 0,
                  reactionTime: settings?.reactionTime ?? 0,
                  recoveryTime: settings?.recoveryTime ?? 0,
                  activityThreshold: settings?.activityThreshold ?? 4,
                },
              },
            })

            break
          case 'DDD':
            dispatch({
              type: 'UPDATE_MODE_SETTINGS',
              payload: {
                mode: 'DDD',
                settings: {
                  atrialAmplitude: settings?.atrialAmplitude ?? 0,
                  atrialPulseWidth: settings?.atrialPulseWidth ?? 0,
                  atrialRefractoryPeriod: settings?.atrialRefractoryPeriod ?? 0,
                  ventricularAmplitude: settings?.ventricularAmplitude ?? 0,
                  ventricularPulseWidth: settings?.ventricularPulseWidth ?? 0,
                  ventricularRefractoryPeriod: settings?.ventricularRefractoryPeriod ?? 0,
                  lowerRateLimit: settings?.lowerRateLimit ?? 0,
                  upperRateLimit: settings?.upperRateLimit ?? 0,
                  avDelay: settings?.avDelay ?? 0,
                },
              },
            })

            break
          default:
            break
        }
      }
    })
  }, [username, currentMode])

  // toggle help popup
  const toggleHelp = (): void => {
    setShowHelp(!showHelp)
  }

  const handleEgramHiding = (): void => {
    console.log('Electrogram hidden')
  }

  // Return the actual JSX component
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <LeftSidebar handleEgramHiding={handleEgramHiding} />

      {/* Main Content */}
      <MainContent
        submittedMode={submittedMode}
        telemetry={telemetry}
        telemetryRate={telemetryRate}
        isRightSidebarVisible={isRightSidebarVisible}
      />

      {/* Right Sidebar */}
      <RightSidebar
        showHelp={showHelp}
        toggleHelp={toggleHelp}
        handleModeSelect={handleModeSelect}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        handleDiscard={handleDiscard}
        atriumAmpError={atriumAmpError}
        ventricleAmpError={ventricleAmpError}
        atrialPWError={atrialPWError}
        ventriclePWError={ventriclePWError}
        atrialRPError={atrialRPError}
        ventricleRPError={ventricleRPError}
        lowerRateLimitError={lowerRateLimitError}
        upperRateLimitError={upperRateLimitError}
        rateFactorError={rateFactorError}
        reactionTimeError={reactionTimeError}
        recoveryTimeError={recoveryTimeError}
        activityThresholdError={activityThresholdError}
        avDelayError={avDelayError}
        isAtriumDisabled={isAtriumDisabled}
        isVentricleDisabled={isVentricleDisabled}
        isRateFactorDisabled={isRateFactorDisabled}
        isAvDelayDisabled={isAvDelayDisabled}
        isRateLimitDisabled={isRateLimitDisabled}
        telemetryStatus={telemetryStatus}
        currentMode={currentMode}
        modes={modes}
        isVisible={isRightSidebarVisible}
        username={username}
      />
      <div
        className={`toggle-sidebar-spot ${isRightSidebarVisible ? 'visible' : 'hidden'}`}
        onClick={toggleRightSidebar}
      >
        {isRightSidebarVisible ? '>' : '<'}
      </div>
    </div>
  )
}

export default Dashboard
