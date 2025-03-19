import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useStore from '../../store/mainStore'
import { useToast } from '../../context/ToastContext'
import './Login.css'

function Login(): JSX.Element {
  // setup state variables for the following
  // - username
  // - password
  // - setUser function from the UserProvider context
  // - addToast function from the ToastProvider context
  // - navigate function from react router (for page navigation)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { dispatch } = useStore()
  const { addToast } = useToast()
  const navigate = useNavigate()

  // function to handle input changes, takes a setter function
  // and calls it with the new value of the input
  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setter(event.target.value)
    }

  // function to handle form submission
  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()

    // send the username and password to main process via ipc to verify login
    const result = await window.api.loginUser(username, password)
    if (result.success) {
      // set the user and navigate to dashboard on successful login
      dispatch({
        type: 'UPDATE_USER',
        payload: {
          username: result.user?.username ?? '',
          serialNumber: result.user?.serialNumber ?? '',
        },
      })
      dispatch({ type: 'UPDATE_LAST_USED_MODE', payload: result.user?.lastUsedMode ?? 'OFF' })

      addToast('User logged in successfully', 'success')
      navigate('/dashboard')
    } else {
      // display an error toast on failed login
      addToast(result.message ?? 'An unknown error occurred', 'error')
    }
  }

  // effect to add/remove the filled CSS class from the input fields for nice animations
  useEffect(() => {
    const inputs = document.querySelectorAll('.floating-label-group input')
    inputs.forEach((input) => {
      if ((input as HTMLInputElement).value) {
        input.classList.add('filled')
      }
      input.addEventListener('input', () => {
        if ((input as HTMLInputElement).value) {
          input.classList.add('filled')
        } else {
          input.classList.remove('filled')
        }
      })
    })

    return (): void => {
      inputs.forEach((input) => {
        input.removeEventListener('input', () => {})
      })
    }
  }, [])

  const handleTestNavigation = (): void => {
    navigate('/test')
  }

  // return the component
  return (
    <div className="login-container">
      {/* Back button to navigate to the home page */}
      <button className="back-button" type="button" onClick={() => navigate('/')}>
        ←
      </button>

      {/* Header text for the login form */}
      <div className="text">Log In User</div>

      {/* Spacer for layout purposes */}
      <div style={{ height: '15px' }} />

      {/* Login form */}
      <form onSubmit={handleSubmit}>
        {/* Username input field */}
        <div className="floating-label-group">
          <input type="text" value={username} onChange={handleInputChange(setUsername)} required />
          <label>Username</label>
        </div>

        {/* Password input field */}
        <div className="floating-label-group">
          <input
            type="password"
            value={password}
            onChange={handleInputChange(setPassword)}
            required
          />
          <label>Password</label>
        </div>

        {/* Login button */}
        <div className="login-button">
          <Link
            to="#"
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(e as unknown as React.FormEvent)
            }}
          >
            Log In
          </Link>
        </div>
      </form>
    </div>
  )
}

export default Login
