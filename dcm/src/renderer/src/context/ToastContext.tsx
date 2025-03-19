import { createContext, useContext, useState, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Toast } from '../../../common/types'

// setup context for toasts
// (contexts = global state that can be accessed by child components)
// (children only since the provider accepts children components as props)

// type definitions for the context
interface ToastContextType {
  toasts: Toast[] // array of toasts
  // functions to add toasts
  addToast: (message: string, type: 'success' | 'error' | 'info') => void
  // functions to remove toasts
  removeToast: (id: string) => void
}

// the context itself
const ToastContext = createContext<ToastContextType | undefined>(undefined)

// the provider for the context that wraps the app (or at least the parts that need it)
export const ToastProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  // use a state to keep track of the toasts
  const [toasts, setToasts] = useState<Toast[]>([])

  // function to add a toast
  const addToast = (message: string, type: 'success' | 'error' | 'info'): void => {
    const id = uuidv4() // toasts are given a unique id
    setToasts((prevToasts) => [...prevToasts, { id, message, type }])
    // by default, toasts are removed after 3 seconds
    setTimeout(() => initiateRemoveToast(id), 3000)
  }

  // function to initiate the removal of a toast
  const initiateRemoveToast = (id: string): void => {
    // set the removing property to true to start the removal animation
    setToasts((prevToasts) =>
      prevToasts.map((toast) => {
        if (toast.id === id) {
          return { ...toast, removing: true }
        }
        return toast
      }),
    )
    // then actually remove the toast after the animation
    setTimeout(() => removeToast(id), 300)
  }

  // explicit toast removal function that can be called directly
  const removeToast = (id: string): void => {
    // removes the toast from the array of toasts w/ filter
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  // return the context provider with the toasts and functions
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

// custom hook to consume the context
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
