import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Music, Users, Clock, Settings, Moon, Sun, Monitor } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../context/SocketContext'
import Button from '../components/ui/Button'
import CreateSessionModal from '../components/session/CreateSessionModal'
import SessionCard from '../components/session/SessionCard'
import UserProfile from '../components/ui/UserProfile'

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { theme, setTheme, actualTheme } = useTheme()
  const { connected } = useSocket()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sessions, setSessions] = useState([])

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  }

  const ThemeIcon = themeIcons[theme]

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg mr-3">
                <Music className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Syncdaw</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={cycleTheme}
                className="w-9 h-9 p-0"
              >
                <ThemeIcon className="w-4 h-4" />
              </Button>

              {/* User Profile */}
              <UserProfile user={user!} onLogout={logout} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.displayName?.split(' ')[0]}!
          </h2>
          <p className="text-muted-foreground">
            Start collaborating on your music projects or join an existing session.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                New Session
              </Button>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Create Session</h3>
            <p className="text-sm text-muted-foreground">
              Start a new collaboration session with your project files
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-lg mb-4">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Active Sessions</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {sessions.length} sessions available
            </p>
            <div className="text-2xl font-bold text-foreground">{sessions.length}</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-500/10 rounded-lg mb-4">
              <Clock className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Recent Activity</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Last session 2 hours ago
            </p>
            <div className="text-sm text-green-500">Active now</div>
          </div>
        </motion.div>

        {/* Sessions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-foreground">Your Sessions</h3>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Manage
            </Button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mx-auto mb-4">
                <Music className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-medium text-foreground mb-2">No sessions yet</h4>
              <p className="text-muted-foreground mb-6">
                Create your first collaboration session to get started
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session: any) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSessionCreated={(session) => {
          setSessions(prev => [session, ...prev])
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}

export default Dashboard