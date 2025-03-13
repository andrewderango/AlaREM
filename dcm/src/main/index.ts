import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import iconIco from '../../resources/icon.ico?asset'
import iconPng from '../../resources/icon.png?asset'
import {
  ensureUsersFile,
  registerUser,
  setUser,
  loginUser,
  getSettingsForMode
} from './userService'
import { usersFilePath } from '../common/constants'
import type {
  RegisterUserResponse,
  SetUserResponse,
  LoginUserResponse,
  ModeSettingResponse,
} from '../common/types'
import { join, resolve } from 'path'
import * as path from 'path'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { promises as fs } from 'fs'
import { parse } from 'json2csv'

const parameterHistoryPath = resolve(__dirname, '../../parameterHistory.json')

let pythonProcess: ReturnType<typeof spawn> | null = null

export const spawnPythonProcess = (
  pythonPath: string,
  scriptPath: string,
): Promise<ChildProcessWithoutNullStreams> => {
  return new Promise((resolve, reject) => {
    const process = spawn(pythonPath, [scriptPath])

    process.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })

    process.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`)
    })

    process.on('close', (code) => {
      console.log(`Python process exited with code ${code}`)
    })

    process.on('error', (error) => {
      reject(error)
    })

    resolve(process)
  })
}

// default electron boilerplate
function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 810,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    icon: process.platform === 'win32' ? iconIco : iconPng,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  // when the app is ready, ensure the users file exists
  await ensureUsersFile(usersFilePath)

  const pythonPath = resolve(__dirname, '../../src/python/pyEnv/bin/python')
  const scriptPath = resolve(__dirname, '../../src/python/mainProcess.py')

  console.log('pythonPath: ', pythonPath)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // spawn the python process
  try {
    pythonProcess = await spawnPythonProcess(pythonPath, scriptPath)
  } catch (error) {
    console.error('Error spawning python process: ', error)
  }

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }

  // Kill the python process
  if (pythonProcess) {
    pythonProcess.kill()
  }
})

// registering ipc handlers for relevant functions

// ipc channel for registering a user
// - expects a username, password, and serial number
// - returns a success message if the user was registered successfully
// - returns an error message if the user was not registered successfully
// - frontend must handle the response and display a relevant toast
ipcMain.handle(
  'register-user',
  async (_, username: string, password: string, serialNumber: string) => {
    try {
      await registerUser(username, password, serialNumber)
      return { success: true } as RegisterUserResponse
    } catch (error) {
      return { success: false, message: (error as Error).message } as RegisterUserResponse
    }
  },
)

// ipc channel for setting a user
// - expects a username, mode, and settings
// - returns a success message if the user was set successfully
// - returns an error message if the user was not set successfully
// - frontend must handle the response and display a relevant toast
ipcMain.handle(
  'set-user',
  async (
    _,
    username: string,
    mode:
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
      | 'VVIR',
    settings: Record<string, number>,
  ) => {
    try {
      await setUser(username, mode, settings)
      return { success: true } as SetUserResponse
    } catch (error) {
      return { success: false, message: (error as Error).message } as SetUserResponse
    }
  },
)

// ipc channel for logging in a user
// - expects a username and password
// - returns a success message and the user if the user was logged in successfully
// - returns an error message if the user was not logged in successfully
// - frontend must handle the response and display a relevant toast
ipcMain.handle('login-user', async (_, username: string, password: string) => {
  try {
    const user = await loginUser(username, password)
    return { success: true, user } as LoginUserResponse
  } catch (error) {
    return { success: false, message: (error as Error).message } as LoginUserResponse
  }
})

// ipc channel for getting settings for a mode
// - expects a username and mode
// - returns a success message and the settings if the settings were retrieved successfully
// - returns an error message if the settings were not retrieved successfully
// - frontend must handle the response and display a relevant toast
ipcMain.handle('get-settings-for-mode', async (_, username: string, mode: string) => {
  try {
    const settings = await getSettingsForMode(username, mode)
    return { success: true, settings } as ModeSettingResponse
  } catch (error) {
    return { success: false, message: (error as Error).message } as ModeSettingResponse
  }
})

ipcMain.handle('download-parameter-log', async (_, username: string) => {
  try {
    const data = await fs.readFile(parameterHistoryPath, 'utf-8')
    const history = JSON.parse(data)
    const userHistory = history.find((entry: { username: string }) => entry.username === username)
    if (!userHistory) {
      throw new Error('User not found')
    }

    const csv = parse(userHistory.parameterChanges)
    const directory = app.getPath('downloads')
    const filePath = path.join(directory, `${username}_parameter_log.csv`)
    await fs.writeFile(filePath, csv)

    return { success: true, directory }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
})

ipcMain.handle('download-login-history', async (_, username: string) => {
  try {
    const data = await fs.readFile(parameterHistoryPath, 'utf-8')
    const history = JSON.parse(data)
    const userHistory = history.find((entry: { username: string }) => entry.username === username)
    if (!userHistory) {
      throw new Error('User not found')
    }

    const csv = parse(userHistory.loginHistory)
    const directory = app.getPath('downloads')
    const filePath = path.join(directory, `${username}_login_history.csv`)
    await fs.writeFile(filePath, csv)

    return { success: true, directory }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
})