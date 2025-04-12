import { createContext, useState, useContext, ReactNode } from 'react'
import { PublicUser } from 'src/common/types'

// setup context for user
// (contexts = global state that can be accessed by child components)
// (children only since the provider accepts children components as props)

// type definitions for the context
interface UserContextType {
  user: PublicUser | undefined // the current user
  setUser: (user: PublicUser | undefined) => void // set the user
}

// the context itself
const UserContext = createContext<UserContextType | undefined>(undefined)

// the provider for the context that wraps the app (or at least the parts that need it)
export const UserProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  // use a state to keep track of the current user
  const [user, setUser] = useState<PublicUser | undefined>(undefined)

  // return the context provider with the user and functions
  // no other handlers are need since useState returns the setter for
  // the state variable
  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}

// custom hook to use the user context
export const useUser = (): UserContextType => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
