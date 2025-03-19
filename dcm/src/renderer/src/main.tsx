import './assets/main.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// the actual root of the react app
// set up the DOM root element and render the App component
// strict mode to highlight possible errors like hydration mismatches

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
