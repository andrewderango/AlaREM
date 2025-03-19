import React from 'react'
import { PowerOff } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import './Terminate.css'

// separate file for terminating telemetry because it is reusable

// type definitions for the props of the TerminateButton component
interface TerminateButtonProps {
  onTerminate: () => void // callback when the button is clicked
  disabled: boolean // if the button should be disabled
}

const TerminateButton: React.FC<TerminateButtonProps> = ({ onTerminate, disabled }) => {
  const { user } = useUser()

  // handler for the termination button
  const handleTermination = async (): Promise<void> => {
    // todo: implement telemetry termination
    // currently just sets the mode to OFF
    console.log('TELEMETRY TERMINATION TO BE IMPLEMENTED HERE')
    if (user) {
      await window.api.setUser(user.username, 'OFF', {})
    }
    onTerminate() // then call the callback
  }

  // return the component
  return (
    <button
      className="terminate-button"
      type="button"
      onClick={handleTermination}
      disabled={disabled}
    >
      <PowerOff size={24} />
      <span>Terminate Telemetry</span>
    </button>
  )
}

export default TerminateButton
