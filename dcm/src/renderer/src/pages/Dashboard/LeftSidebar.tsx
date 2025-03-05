import React, { useEffect, useState } from 'react'
import HideEgramData from '../../components/HideEgram/HideEgram'
import LogoutButton from '../../components/LogOut/LogOut'
import ConnectButton from '../../components/ConnectButton/ConnectButton'
import useStore from '@renderer/store/mainStore'
import heartflowLogo from '../../assets/heartflow.png'
import { Cable, Unplug, RefreshCcw } from 'lucide-react'

interface LeftSidebarProps {
  handleEgramHiding: () => void
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ handleEgramHiding }) => {
  const { username, serialNumber, connectionStatus } = useStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [beeping, setBeeping] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return (): void => clearInterval(timer)
  }, [])

  const getStatusIcon = (): JSX.Element => {
    if (connectionStatus === 'CONNECTED') {
      return <Cable size={20} className="activity-icon" />
    } else if (connectionStatus === 'DISCONNECTED') {
      return <Unplug size={20} className="activity-icon" />
    } else {
      return <RefreshCcw size={20} className="acitivity-icon" />
    }
  }

  const getStatusClass = (): string => {
    if (connectionStatus === 'CONNECTED') {
      return 'communication-status'
    } else if (connectionStatus === 'DISCONNECTED') {
      return 'communication-status disconnected'
    } else {
      return 'communication-status reconnecting'
    }
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <img alt="logo" className="logo-sidebar" src={heartflowLogo} />

      {/* Welcome Section */}
      <div className="welcome-section">
        <p className="welcome-header">Welcome</p>
        {username && <p className="username">{username}</p>}
      </div>

      {/* Telemetry Status */}
      <div className="sidebar-section">
        <p className="communication-status-header">Communication Status</p>
        <p className={getStatusClass()}>
          {getStatusIcon()}
          {connectionStatus}
        </p>
      </div>

      {/* Current Date and Time */}
      <div className="sidebar-time">
        <p className="current-date">
          {currentTime.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        <p className="current-time">
          {currentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            // second: 'numeric',
            hour12: true,
          })}
        </p>
      </div>

      {/* Bottom Sidebar Components */}
      <div className="bottom-sidebar-components">
        <div className="sidebar-versions">
          <p>HeartFlow Release: v2.0.0</p>
          {serialNumber && <p>Serial Number: {serialNumber}</p>}
        </div>
        <div className="connect-button-container">
          <ConnectButton />
        </div>
        <div className="egram-button-container">
          <HideEgramData />
        </div>
        <div className="logout-button-container">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}

export default LeftSidebar
