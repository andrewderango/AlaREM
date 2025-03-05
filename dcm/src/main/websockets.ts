import WebSocket from 'ws'
import { type BrowserWindow } from 'electron'
import {
  SerialConnectionResponse,
  SerialActionResponse,
  SerialDataResponse,
  SerialErrorResponse,
} from '../common/types'

export async function establishWebsocket(
  mainWindow: BrowserWindow,
  retries: number = 5,
): Promise<WebSocket> {
  let ws: WebSocket

  async function connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const attemptConnection = (retriesLeft: number): void => {
        ws = new WebSocket('ws://localhost:8765')

        ws.on('open', () => {
          console.log('Websocket connection established')
          resolve(ws)
        })

        ws.on('error', (error) => {
          if (retriesLeft === 0) {
            console.error('Websocket connection failed')
            reject(error)
          } else {
            console.error(
              `Websocket connection failed, retrying in 1s (${retriesLeft} retries left)`,
            )
            setTimeout(() => {
              attemptConnection(retriesLeft - 1)
            }, 1000)
          }
        })
      }

      attemptConnection(retries)
    })
  }

  ws = await connect()
  mainWindow.webContents.setMaxListeners(0)

  ws.on('message', (data) => {
    try {
      const jsonString = data.toString()
      const message = JSON.parse(jsonString)
    } catch (error) {
      console.error('Error parsing message:', error)
    }
  })

  ws.on('message', (data) => {
    try {
      const jsonString = data.toString()
      const message = JSON.parse(jsonString)

      switch (message.type) {
        case 'initialize':
        case 'disconnect':
        case 'reconnect': {
          const response: SerialConnectionResponse = {
            type: 'connection',
            connectionType: message.type,
            status: message.status,
            ...(message.message && { message: message.message }),
          }
          mainWindow.webContents.send('serial-connection', response)
          break
        }
        case 'send_parameters':
        case 'toggle_egram': {
          const response: SerialActionResponse = {
            type: 'action',
            action: message.type,
            status: message.status,
            ...(message.message && { message: message.message }),
          }
          mainWindow.webContents.send('serial-action', response)
          break
        }
        case 'egram_data': {
          const response: SerialDataResponse = {
            type: 'data',
            dataType: 'egram',
            data: message.data,
          }
          mainWindow.webContents.send('serial-data', response)
          break
        }
        case 'error': {
          const response: SerialErrorResponse = {
            type: 'error',
            error: message.error,
          }
          mainWindow.webContents.send('serial-error', response)
          break
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error)
    }
  })

  return ws
}
