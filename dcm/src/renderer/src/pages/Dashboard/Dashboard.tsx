import React, { useEffect, useState } from 'react'
import useStore from '@renderer/store/mainStore'
import { useToast } from '../../context/ToastContext'
import { Activity, HardDriveUpload, ClipboardX, Info, XCircle } from 'lucide-react'
import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'
import MainContent from './MainContent'
import './Dashboard.css'

function Dashboard(): JSX.Element {
  // Basic state for username, days of the week, earliest/latest times, and previous nights
  const { username } = useStore()
  const [days, setDays] = useState([
    { label: 'M', selected: false },
    { label: 'T', selected: false },
    { label: 'W', selected: false },
    { label: 'T', selected: false },
    { label: 'F', selected: false },
    { label: 'S', selected: false },
    { label: 'S', selected: false },
  ])
  const [earliestWakeTime, setEarliestWakeTime] = useState('')
  const [latestWakeTime, setLatestWakeTime] = useState('')
  const [previousNights, setPreviousNights] = useState([
    '01/03/2025',
    '02/03/2025',
    '03/03/2025',
  ])

  // Toggle a day’s "selected" state
  const handleDayToggle = (index: number) => {
    setDays((prevDays) =>
      prevDays.map((day, i) =>
        i === index ? { ...day, selected: !day.selected } : day
      )
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header with logo and welcome text */}
      <div className="header">
        <div className="logo-circle">Logo</div>
        <div className="welcome-text">
          <div className="welcome-label">Welcome</div>
          <div className="username">{username}</div>
        </div>
      </div>

      {/* Alarm Configuration */}
      <div className="alarm-config">
        <h2>Configure Alarm</h2>
        <div className="days-of-week">
          {days.map((day, index) => (
            <button
              key={index}
              className={`day-btn ${day.selected ? 'selected' : ''}`}
              onClick={() => handleDayToggle(index)}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="time-inputs">
          <div className="time-label">Earliest Wakeup Time</div>
          <div className="time-input-row">
            <input
              type="time"
              value={earliestWakeTime}
              onChange={(e) => setEarliestWakeTime(e.target.value)}
            />
          </div>
          <div className="time-label">Latest Wakeup Time</div>
          <div className="time-input-row">
            <input
              type="time"
              value={latestWakeTime}
              onChange={(e) => setLatestWakeTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Previous Nights */}
      <div className="previous-nights">
        <h2>Previous Nights</h2>
        {previousNights.map((night, idx) => (
          <div key={idx} className="night-entry">
            {night}
          </div>
        ))}
      </div>
    </div>
  )
}
export default Dashboard
