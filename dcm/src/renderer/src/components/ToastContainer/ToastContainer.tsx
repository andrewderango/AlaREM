import React from 'react'
import { useToast } from '../../context/ToastContext'
import Toast from '../Toast/Toast'
import './ToastContainer.css'

// container to hold all the toasts

const ToastContainer: React.FC = () => {
  // get the toasts and removeToast function from the ToastProvider context
  const { toasts, removeToast } = useToast()

  // return the component
  // component maps over the toasts and renders a Toast component for each
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          removing={toast.removing}
        />
      ))}
    </div>
  )
}

export default ToastContainer
