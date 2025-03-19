// global types for the app because we're using typescript

export type Mode =
  | 'OFF'
  | 'AOO'
  | 'AAI'
  | 'VOO'
  | 'VVI'
  | 'DDDR'
  | 'DDD'
  | 'AOOR'
  | 'AAIR'
  | 'VOOR'
  | 'VVIR'

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'

export type TelemetryStatus = 'ON' | 'OFF'

// interface for User
export interface User {
  username: string
  passwordHash: string
  serialNumber: string
  modes: {
    VOO: {
      ventricularAmplitude: number
      ventricularPulseWidth: number
      ventricularRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
    }
    AOO: {
      atrialAmplitude: number
      atrialPulseWidth: number
      atrialRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
    }
    VVI: {
      ventricularAmplitude: number
      ventricularPulseWidth: number
      ventricularRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
    }
    AAI: {
      atrialAmplitude: number
      atrialPulseWidth: number
      atrialRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
    }
    DDDR: {
      atrialAmplitude: number
      atrialPulseWidth: number
      atrialRefractoryPeriod: number
      ventricularAmplitude: number
      ventricularPulseWidth: number
      ventricularRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
      rateFactor: number
      avDelay: number
      reactionTime: number
      recoveryTime: number
      activityThreshold: number
    }
    DDD: {
      atrialAmplitude: number
      atrialPulseWidth: number
      atrialRefractoryPeriod: number
      ventricularAmplitude: number
      ventricularPulseWidth: number
      ventricularRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
      avDelay: number
    }
    AOOR: {
      atrialAmplitude: number
      atrialPulseWidth: number
      atrialRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
      rateFactor: number
      reactionTime: number
      recoveryTime: number
      activityThreshold: number
    }
    AAIR: {
      atrialAmplitude: number
      atrialPulseWidth: number
      atrialRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
      rateFactor: number
      reactionTime: number
      recoveryTime: number
      activityThreshold: number
    }
    VOOR: {
      ventricularAmplitude: number
      ventricularPulseWidth: number
      ventricularRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
      rateFactor: number
      reactionTime: number
      recoveryTime: number
      activityThreshold: number
    }
    VVIR: {
      ventricularAmplitude: number
      ventricularPulseWidth: number
      ventricularRefractoryPeriod: number
      atrialAmplitude: number
      atrialPulseWidth: number
      atrialRefractoryPeriod: number
      lowerRateLimit: number
      upperRateLimit: number
      rateFactor: number
      reactionTime: number
      recoveryTime: number
      activityThreshold: number
    }
  }
  lastUsedMode?: Mode
}

// function for creating a default User object
export const createUser = (overrides: Partial<User> = {}): User =>
  ({
    username: '',
    passwordHash: '',
    serialNumber: '',
    modes: {
      VOO: {
        ventricularAmplitude: 0,
        ventricularPulseWidth: 0,
        ventricularRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
      },
      AOO: {
        atrialAmplitude: 0,
        atrialPulseWidth: 0,
        atrialRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
      },
      VVI: {
        ventricularAmplitude: 0,
        ventricularPulseWidth: 0,
        ventricularRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
      },
      AAI: {
        atrialAmplitude: 0,
        atrialPulseWidth: 0,
        atrialRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
      },
      DDDR: {
        atrialAmplitude: 0,
        atrialPulseWidth: 0,
        atrialRefractoryPeriod: 0,
        ventricularAmplitude: 0,
        ventricularPulseWidth: 0,
        ventricularRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
        rateFactor: 0,
        avDelay: 0,
        reactionTime: 0,
        recoveryTime: 0,
        activityThreshold: 4,
      },
      DDD: {
        atrialAmplitude: 0,
        atrialPulseWidth: 0,
        atrialRefractoryPeriod: 0,
        ventricularAmplitude: 0,
        ventricularPulseWidth: 0,
        ventricularRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
        avDelay: 0,
      },
      AOOR: {
        atrialAmplitude: 0,
        atrialPulseWidth: 0,
        atrialRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
        rateFactor: 0,
        reactionTime: 0,
        recoveryTime: 0,
        activityThreshold: 4,
      },
      AAIR: {
        atrialAmplitude: 0,
        atrialPulseWidth: 0,
        atrialRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
        rateFactor: 0,
        reactionTime: 0,
        recoveryTime: 0,
        activityThreshold: 4,
      },
      VOOR: {
        ventricularAmplitude: 0,
        ventricularPulseWidth: 0,
        ventricularRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
        rateFactor: 0,
        reactionTime: 0,
        recoveryTime: 0,
        activityThreshold: 4,
      },
      VVIR: {
        ventricularAmplitude: 0,
        ventricularPulseWidth: 0,
        ventricularRefractoryPeriod: 0,
        atrialAmplitude: 0,
        atrialPulseWidth: 0,
        atrialRefractoryPeriod: 0,
        lowerRateLimit: 0,
        upperRateLimit: 0,
        rateFactor: 0,
        reactionTime: 0,
        recoveryTime: 0,
        activityThreshold: 4,
      },
    },
    lastUsedMode: 'OFF',
    ...overrides,
  }) as User

// interface for PublicUser
// - contains only username, serialNumber, and lastUsedMode
// - other information must be kept private until requested
export interface PublicUser {
  username: string
  serialNumber: string
  lastUsedMode?: Mode
}

// interface for RegisterUserResponse
// - currently not any different from other responses but
//   here for flexibility in the future
export interface RegisterUserResponse {
  success: boolean
  message?: string
}

// interface for SetUserResponse
// - currently not any different from other responses but
//   here for flexibility in the future
export interface SetUserResponse {
  success: boolean
  message?: string
}

// interface for LoginUserResponse
// - currently not any different from other responses but
//   here for flexibility in the future
export interface LoginUserResponse {
  success: boolean
  user?: PublicUser
  message?: string
}

// interface for ModeSettingResponse
// - returns success, settings, and message
// - settings is a record of strings to numbers for the settings
//   for a mode
export interface ModeSettingResponse {
  success: boolean
  settings?: Record<string, number>
  message?: string
}

// interface for Toast
// - id is a unique identifier for the toast
// - message is the message to display
// - type is the type of toast'
// - removing is a boolean to indicate if the toast is being removed
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  removing?: boolean
}

// interface for ChartPoint
export interface ChartPoint {
  x: number
  y: number
}
