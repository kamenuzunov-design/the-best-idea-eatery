import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n.js'
import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)

