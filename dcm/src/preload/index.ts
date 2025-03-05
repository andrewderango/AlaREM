// expose electron APIs to renderer process

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  RegisterUserResponse,
  SetUserResponse,
  LoginUserResponse,
  ModeSettingResponse,
} from '../common/types'

// custom api functions
// - handled using ipc channels so renderer process
//   never directly interacts with the functions
const api = {
  registerUser: async (
    username: string,
    password: string,
    serialNumber: string,
  ): Promise<RegisterUserResponse> => {
    const result = await ipcRenderer.invoke('register-user', username, password, serialNumber)
    return result
  },
  setUser: async (
    username: string,
    mode: string,
    settings: Record<string, number>,
  ): Promise<SetUserResponse> => {
    const result = await ipcRenderer.invoke('set-user', username, mode, settings)
    return result
  },
  loginUser: async (username: string, password: string): Promise<LoginUserResponse> => {
    const result = await ipcRenderer.invoke('login-user', username, password)
    return result
  },
  getSettingsForMode: async (username: string, mode: string): Promise<ModeSettingResponse> => {
    const result = await ipcRenderer.invoke('get-settings-for-mode', username, mode)
    return result
  },
  downloadParameterLog: async (username: string): Promise<{ success: boolean; directory?: string; message?: string }> => {
    const result = await ipcRenderer.invoke('download-parameter-log', username)
    return result
  },
  downloadLoginHistory: async (username: string): Promise<{ success: boolean; directory?: string; message?: string }> => {
    const result = await ipcRenderer.invoke('download-login-history', username)
    return result
  },
}

// electron boilerplate for exposing APIs based on context isolation
// not relevant here, but kept for functionality
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
