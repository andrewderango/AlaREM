// type definitions for preload script
// - defines the electron api and the api object
// - also exposes our custom api functions

import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  RegisterUserResponse,
  SetUserResponse,
  LoginUserResponse,
  ModeSettingResponse,
} from '../common/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      registerUser: (
        username: string,
        password: string,
        serialNumber: string,
      ) => Promise<RegisterUserResponse>
      setUser: (
        username: string,
        mode: string,
        settings: Record<string, number>,
      ) => Promise<SetUserResponse>
      loginUser: (username: string, password: string) => Promise<LoginUserResponse>
      getSettingsForMode: (username: string, mode: string) => Promise<ModeSettingResponse>
    }
  }
}
