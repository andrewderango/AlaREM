import { create } from 'zustand'

interface DayConfig {
  label: string
  selected: boolean
  earliestWake: string
  latestWake: string
}

interface UserState {
  username: string
  serialNumber: string
  days: DayConfig[]
  earliestWakeTime: string
  latestWakeTime: string
}

type UserAction = 
  | { type: 'UPDATE_USER'; payload: Partial<UserState> }
  | { type: 'UPDATE_DAYS'; payload: DayConfig[] }
  | { type: 'UPDATE_WAKE_TIMES'; payload: { earliestWake: string; latestWake: string } }

const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'UPDATE_USER':
      return { ...state, ...action.payload }
    case 'UPDATE_DAYS':
      return { ...state, days: action.payload }
    case 'UPDATE_WAKE_TIMES':
      return { 
        ...state, 
        earliestWakeTime: action.payload.earliestWake,
        latestWakeTime: action.payload.latestWake
      }
    default:
      return state
  }
}

const useStore = create<UserState & { dispatch: (action: UserAction) => void }>((set) => ({
  username: '',
  serialNumber: '',
  days: [
    { label: 'M', selected: false, earliestWake: '', latestWake: '' },
    { label: 'T', selected: false, earliestWake: '', latestWake: '' },
    { label: 'W', selected: false, earliestWake: '', latestWake: '' },
    { label: 'T', selected: false, earliestWake: '', latestWake: '' },
    { label: 'F', selected: false, earliestWake: '', latestWake: '' },
    { label: 'S', selected: false, earliestWake: '', latestWake: '' },
    { label: 'S', selected: false, earliestWake: '', latestWake: '' },
  ],
  earliestWakeTime: '',
  latestWakeTime: '',
  
  dispatch: (action): void => {
    set((state) => userReducer(state, action))
  }
}))

export default useStore