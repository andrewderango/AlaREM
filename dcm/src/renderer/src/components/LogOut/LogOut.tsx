import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import useStore from '@renderer/store/mainStore'
import './LogOut.css'

// separate file for the logout button because it is reusable

const LogoutButton: React.FC = () => {
  // get the setUser function from UserProvider context + router
  const { setUser } = useUser()
  const { connectionStatus, dispatch } = useStore()
  const navigate = useNavigate()

  // on logout, clear the current user and reroute back to home page
  const handleLogout = (): void => {
    if (connectionStatus === 'CONNECTED') {
      window.api.serialToggleEgram('stop')
      window.api.serialDisconnect()
      dispatch({ type: 'UPDATE_CONNECTION_STATUS', payload: 'DISCONNECTED' })
    }
    setUser(undefined)
    navigate('/')
  }

  // return the component
  return (
    <button className="logout-button" type="button" onClick={handleLogout}>
      <LogOut size={24} />
      <span>Sign Out</span>
    </button>
  )
}

export default LogoutButton
