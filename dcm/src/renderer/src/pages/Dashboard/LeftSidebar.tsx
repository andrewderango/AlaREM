import React, { useEffect, useState } from 'react'
import HideEgramData from '../../components/HideEgram/HideEgram'
import useStore from '@renderer/store/mainStore'
import { useToast } from '../../context/ToastContext'
import alaremLogo from '../../assets/alarem.png'
import { Activity, XCircle } from 'lucide-react'

interface LeftSidebarProps {
  handleEgramHiding: () => void
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ handleEgramHiding }) => {
  const { username, serialNumber, connectionStatus, telemetryStatus } = useStore()
  const { addToast } = useToast()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return (): void => clearInterval(timer)
  }, [])

  const getStatusIcon = (): JSX.Element => {
    return connectionStatus === 'CONNECTED' ? (
      <Activity size={16} className="activity-icon" />
    ) : (
      <XCircle size={16} className="disconnected-icon" />
    )
  }

  const getStatusClass = (): string => {
    return connectionStatus === 'CONNECTED'
      ? 'communication-status'
      : 'communication-status disconnected'
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <img alt="logo" className="logo-sidebar" src={alaremLogo} />

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
          <p>AlaREM Release: v1.0.0</p>
          {serialNumber && <p>Serial Number: {serialNumber}</p>}
        </div>
        <div className="egram-button-container">
          <HideEgramData />
        </div>
      </div>
    </div>
  )
}

export default LeftSidebar
