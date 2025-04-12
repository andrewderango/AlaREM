// global variables for the main process

import { join } from 'path'
import { app } from 'electron'

// default path for the users file
// - if linux: ~/.config/dcm/users.json
// - if windows: %APPDATA%/dcm/users.json
// - if mac: ~/Library/Application Support/dcm/users.json
export const usersFilePath = join(app.getPath('userData'), 'users.json')
