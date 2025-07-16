import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SocketProvider } from './context/SocketContext'
import AuthGuard from './components/auth/AuthGuard'
import Dashboard from './pages/Dashboard'
import Session from './pages/Session'
import Auth from './pages/Auth'
import './styles/globals.css'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="min-h-screen bg-background text-foreground">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <Dashboard />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/session/:sessionId"
                  element={
                    <AuthGuard>
                      <Session />
                    </AuthGuard>
                  }
                />
              </Routes>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  className: 'bg-card text-card-foreground border border-border',
                  duration: 4000,
                }}
              />
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App