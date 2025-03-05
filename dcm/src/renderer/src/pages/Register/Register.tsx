import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import './Register.css'

function Register(): JSX.Element {
  // set state variables for the following
  // - username
  // - password
  // - password again for confirmation
  // - pacemaker serial number
  // - addToast function from the ToastProvider context
  // - navigate function from react router (for page navigation)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
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

    // regex to check for special characters
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/

    // validate inputs. must pass all these checks to proceed:
    // - username must be at least 3 characters long
    // - password must be at least 8 characters long
    // - password must contain at least one special character
    // - passwords must match
    // - serial number cannot be null
    if (username.length < 3) {
      addToast('Username must be at least 3 characters long', 'error')
      return
    }

    if (password.length < 8) {
      addToast('Password must be at least 8 characters long', 'error')
      return
    }

    if (!specialCharRegex.test(password)) {
      addToast('Password must contain at least one special character', 'error')
      return
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error')
      return
    }

    if (!serialNumber) {
      addToast('Serial number cannot be null', 'error')
      return
    }

    // if checks passed, send all data to main process via ipc to register user
    const result = await window.api.registerUser(username, password, serialNumber)
    if (result.success) {
      // route to login on successful registration
      addToast('User registered successfully', 'success')
      navigate('/login')
    } else {
      // display an error toast on failed registration
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

  // return the component
  return (
    <div className="register-container">
      {/* Back button to navigate to the home page */}
      <button className="back-button" type="button" onClick={() => navigate('/')}>
        ←
      </button>

      {/* Header text for the registration form */}
      <div className="text">Register New User</div>

      {/* Spacer for layout purposes */}
      <div style={{ height: '15px' }} />

      {/* Registration form */}
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

        {/* Confirm Password input field */}
        <div className="floating-label-group">
          <input
            type="password"
            value={confirmPassword}
            onChange={handleInputChange(setConfirmPassword)}
            required
          />
          <label>Confirm Password</label>
        </div>

        {/* Pacemaker Serial Number input field */}
        <div className="floating-label-group">
          <input
            type="text"
            value={serialNumber}
            onChange={handleInputChange(setSerialNumber)}
            required
          />
          <label>Pacemaker Serial Number</label>
        </div>

        {/* Register button */}
        <div className="register-button">
          <Link
            to="#"
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(e as unknown as React.FormEvent)
            }}
          >
            Register
          </Link>
        </div>
      </form>
    </div>
  )
}

export default Register
