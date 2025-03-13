import React, { useEffect, useState } from 'react'
import useStore from '@renderer/store/mainStore'
import LogoutButton from '../../components/LogOut/LogOut'
import './Dashboard.css'
import { ChevronDown } from 'lucide-react'

function Dashboard(): JSX.Element {
  const { username, days, earliestWakeTime, latestWakeTime, dispatch } = useStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  const handleUsernameClick = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.user-menu')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])
  
  const [previousNights] = React.useState([
    '01/03/2025',
    '02/03/2025',
    '03/03/2025',
  ])

  // Toggle a day's "selected" state
  const handleDayToggle = (index: number) => {
    const updatedDays = days.map((day, i) => {
      if (i === index) {
        if (!day.selected) {
          dispatch({
            type: 'UPDATE_WAKE_TIMES',
            payload: {
              earliestWake: day.earliestWake,
              latestWake: day.latestWake
            }
          })
        }
        return { ...day, selected: !day.selected }
      }
      return { ...day, selected: false }
    })
    dispatch({ type: 'UPDATE_DAYS', payload: updatedDays })
  }

  // Save times when they change
  useEffect(() => {
    const selectedDayIndex = days.findIndex(day => day.selected)
    if (selectedDayIndex !== -1) {
      const updatedDays = days.map((day, i) => 
        i === selectedDayIndex 
          ? { ...day, earliestWake: earliestWakeTime, latestWake: latestWakeTime }
          : day
      )
      dispatch({ type: 'UPDATE_DAYS', payload: updatedDays })
    }
  }, [earliestWakeTime, latestWakeTime])

  return (
    <div className="dashboard-container">
      {/* Header with logo and welcome text */}
      <div className="header">
        <div className="logo-circle">Logo</div>
        <div className="user-menu">
          <div className="welcome-text">
            <div className="welcome-label">Welcome</div>
            <div 
              className="username-wrapper" 
              onClick={handleUsernameClick}
            >
              <span className="username">{username}</span>
              <ChevronDown size={16} className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`} />
            </div>
          </div>
          {isDropdownOpen && (
            <>
              <div className={`dropdown-backdrop ${isDropdownOpen ? 'show' : ''}`} />
              <div className={`dropdown-card ${isDropdownOpen ? 'show' : ''}`}>
                <LogoutButton />
              </div>
            </>
          )}
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
              onChange={(e) => dispatch({
                type: 'UPDATE_WAKE_TIMES',
                payload: {
                  earliestWake: e.target.value,
                  latestWake: latestWakeTime
                }
              })}
              disabled={!days.some(day => day.selected)}
            />
          </div>
          <div className="time-label">Latest Wakeup Time</div>
          <div className="time-input-row">
            <input
              type="time"
              value={latestWakeTime}
              onChange={(e) => dispatch({
                type: 'UPDATE_WAKE_TIMES',
                payload: {
                  earliestWake: earliestWakeTime,
                  latestWake: e.target.value
                }
              })}
              disabled={!days.some(day => day.selected)}
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