import React, { useEffect, useState } from 'react'
import useStore from '@renderer/store/mainStore'
import { useToast } from '@renderer/context/ToastContext'
import './ConnectButton.css'
import type { SerialConnectionResponse } from 'src/common/types'

const ConnectButton: React.FC = () => {
  const { connectionStatus, serialNumber, dispatch } = useStore()
  const [buttonClass, setButtonClass] = useState<string>('connect-button')
  const [isDisabled, setIsDisabled] = useState<boolean>(false)
  const { addToast } = useToast()

  window.api.onSerialConnectionMessage((message: SerialConnectionResponse) => {
    if (message.type === 'connection') {
      if (message.connectionType === 'initialize' && message.status === 'success') {
        dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'CONNECTED' })
      } else if (message.connectionType === 'initialize' && message.status === 'failed') {
        dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'DISCONNECTED' })
      } else if (message.connectionType === 'reconnect' && message.status === 'reconnecting') {
        setIsDisabled(true)
        dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'RECONNECTING' })
      } else if (message.connectionType === 'reconnect' && message.status === 'success') {
        setIsDisabled(false)
        dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'CONNECTED' })
      } else if (message.connectionType === 'reconnect' && message.status === 'failed') {
        setIsDisabled(false)
        dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'DISCONNECTED' })
      } else if (message.connectionType === 'disconnect' && message.status === 'success') {
        dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'DISCONNECTED' })
      } else if (message.connectionType === 'disconnect' && message.status === 'failed') {
        dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'CONNECTED' })
      }
    }
  })

  const handleButtonLogic = (): void => {
    if (connectionStatus === 'DISCONNECTED') {
      window.api.serialInitialize(parseInt(serialNumber, 10))
      addToast('Waiting for pacemaker connection...', 'info')
    } else if (connectionStatus === 'CONNECTED') {
      window.api.serialToggleEgram('stop')
      window.api.serialDisconnect()
    }
  }

  useEffect(() => {
    if (connectionStatus === 'CONNECTED') {
      setButtonClass('disconnect')
    } else if (connectionStatus === 'DISCONNECTED') {
      setButtonClass('connect')
    } else if (connectionStatus === 'RECONNECTING') {
      setButtonClass('reconnect')
    } else {
      setButtonClass('')
    }
  }, [connectionStatus])

  // useEffect for other toasts
  useEffect(() => {
    if (connectionStatus === 'DISCONNECTED') {
      addToast('Pacemaker disconnected', 'info')
    } else if (connectionStatus === 'RECONNECTING') {
      addToast('Reconnecting to pacemaker...', 'info')
    } else if (connectionStatus === 'CONNECTED') {
      addToast('Pacemaker connected', 'success')
    }
  }, [connectionStatus])

  // useEffect for egram toggling
  useEffect(() => {
    if (connectionStatus === 'CONNECTED') {
      window.api.serialToggleEgram('start')
    }
  }, [connectionStatus])

  return (
    <button
      className={`connect-button ${buttonClass}`}
      onClick={handleButtonLogic}
      disabled={isDisabled}
    >
      {connectionStatus === 'CONNECTED'
        ? 'Disconnect'
        : connectionStatus === 'RECONNECTING'
          ? 'Reconnecting'
          : 'Connect'}
    </button>
  )
}

export default ConnectButton
