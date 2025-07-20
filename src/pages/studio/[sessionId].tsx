import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Users, LogOut, Loader2, ChevronDown, ChevronUp, BarChart3, Clock, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/context/SocketContext'
import { useSession } from '@/context/SessionContext'

interface LaunchVMResponse {
  vmId: string
  status: string
  sessionId: string
  region: string
}

interface SessionMetrics {
  collaborators: number
  editTime: string
  topUser: string
  heatmap: number[][]
}

const StudioPage: React.FC = () => {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()
  const { joinSession, leaveSession, onlineUsers } = useSocket()
  const { setCurrentSession, isOwner } = useSession()
  
  const [isLaunching, setIsLaunching] = useState(true)
  const [vmLaunched, setVmLaunched] = useState(false)
  const [sessionName, setSessionName] = useState('Loading...')
  const [error, setError] = useState<string | null>(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null)

  const sessionUsers = sessionId ? onlineUsers[sessionId] || [] : []
  const userCount = sessionUsers.length

  useEffect(() => {
    if (sessionId && user) {
      joinSession(sessionId)
      launchStudio()
      fetchSessionMetrics()
    }

    return () => {
      if (sessionId) {
        leaveSession(sessionId)
      }
    }
  }, [sessionId, user])

  const fetchSessionMetrics = async () => {
    try {
      // Mock IPC call - in real app this would be: window.electronAPI.getSessionMetrics(sessionId)
      const mockMetrics: SessionMetrics = {
        collaborators: Math.floor(Math.random() * 8) + 1,
        editTime: `${Math.floor(Math.random() * 120) + 30}m`,
        topUser: ['Alice', 'Bob', 'Charlie', 'Diana'][Math.floor(Math.random() * 4)],
        heatmap: Array(7).fill(0).map(() => 
          Array(24).fill(0).map(() => Math.floor(Math.random() * 10))
        )
      }
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Failed to fetch session metrics:', error)
    }
  }

  const launchStudio = async () => {
    try {
      setIsLaunching(true)
      setError(null)

      // Fetch session details first
      const sessionResponse = await fetch(`${import.meta.env.VITE_AZURE_FUNCTIONS_URL}/api/session-get/${sessionId}`)
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        setSessionName(sessionData.name || 'Untitled Session')
        
        // Set session with mock roles for demo (in real app, this would come from API)
        const extendedSession = {
          ...sessionData,
          roles: {
            [user?.uid || '']: 'owner', // Current user as owner
            // Add other participants with different roles
          }
        }
        setCurrentSession(extendedSession)
      }

      // Call Azure Function to launch VM
      const response = await fetch(`${import.meta.env.VITE_AZURE_FUNCTIONS_URL}/api/vm-provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          sessionId,
          vmSize: 'Standard_B2s',
          region: 'eastus'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to launch studio VM')
      }

      const vmData: LaunchVMResponse = await response.json()
      console.log('VM launch initiated:', vmData)

      // Mock delay to simulate VM provisioning
      await new Promise(resolve => setTimeout(resolve, 3000))

      setVmLaunched(true)
      setIsLaunching(false)
    } catch (error) {
      console.error('Failed to launch studio:', error)
      setError(error instanceof Error ? error.message : 'Failed to launch studio')
      setIsLaunching(false)
    }
  }

  const handleEndSession = async () => {
    try {
      if (sessionId) {
        leaveSession(sessionId)
      }
      navigate('/')
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  const handleRetry = () => {
    setError(null)
    launchStudio()
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Session</h1>
          <p className="text-muted-foreground mb-4">Session ID not found</p>
          <button 
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">{sessionName}</h1>
            <p className="text-sm text-gray-400">Studio Session</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* User Count */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded-full">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">{userCount}</span>
          </div>

          {/* End Session Button */}
          <button
            onClick={handleEndSession}
            disabled={!isOwner(user?.uid || '')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isOwner(user?.uid || '') 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-gray-600 text-gray-400 opacity-50 pointer-events-none'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>End Session</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Loading Modal */}
        {isLaunching && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-500 bg-opacity-10 rounded-full mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Launching Studio...</h2>
              <p className="text-gray-400 mb-4">
                Setting up your virtual DAW environment. This may take a few moments.
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '100%'}} />
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLaunching && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center max-w-md mx-4">
              <div className="w-16 h-16 bg-red-500 bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Launch Failed</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <div className="flex space-x-3 justify-center">
                <button 
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Go Back
                </button>
                <button 
                  onClick={handleRetry}
                  disabled={!isOwner(user?.uid || '')}
                  className={`px-4 py-2 rounded-lg ${
                    isOwner(user?.uid || '') 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-600 text-gray-400 opacity-50 pointer-events-none'
                  }`}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Studio Iframe */}
        {vmLaunched && !isLaunching && !error && (
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <iframe
                src={`/stream/${sessionId}`}
                className="w-full h-full border-0"
                title={`Studio Session - ${sessionName}`}
                allow="microphone; camera; midi; encrypted-media"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
              />
            </div>
            
            {/* Analytics Accordion Panel */}
            <div className="bg-gray-800 border-t border-gray-700">
              <button
                onClick={() => setAnalyticsOpen(!analyticsOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-white hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Session Analytics</span>
                </div>
                {analyticsOpen ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              
              {analyticsOpen && metrics && (
                <div className="p-4 border-t border-gray-700">
                  {/* Metrics Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-medium text-gray-300">Collaborators</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{metrics.collaborators}</div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-5 h-5 text-green-400" />
                        <span className="text-sm font-medium text-gray-300">Total Edit Time</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{metrics.editTime}</div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-medium text-gray-300">Most Active User</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{metrics.topUser}</div>
                    </div>
                  </div>
                  
                  {/* Activity Heatmap */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-4">Activity Heatmap (7 days × 24 hours)</h3>
                    <div className="overflow-x-auto">
                      <svg width="600" height="180" className="min-w-full">
                        {/* Hour labels */}
                        {Array.from({ length: 24 }, (_, hour) => (
                          <text
                            key={hour}
                            x={30 + hour * 24}
                            y={15}
                            className="text-xs fill-gray-400"
                            textAnchor="middle"
                          >
                            {hour}
                          </text>
                        ))}
                        
                        {/* Day labels */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                          <text
                            key={day}
                            x={15}
                            y={35 + dayIndex * 20}
                            className="text-xs fill-gray-400"
                            textAnchor="middle"
                          >
                            {day}
                          </text>
                        ))}
                        
                        {/* Heatmap cells */}
                        {metrics.heatmap.map((day, dayIndex) =>
                          day.map((activity, hourIndex) => {
                            const intensity = Math.min(activity / 10, 1)
                            const color = `rgba(59, 130, 246, ${intensity})`
                            return (
                              <rect
                                key={`${dayIndex}-${hourIndex}`}
                                x={18 + hourIndex * 24}
                                y={25 + dayIndex * 20}
                                width="20"
                                height="16"
                                fill={color}
                                stroke="rgba(75, 85, 99, 0.3)"
                                strokeWidth="1"
                                rx="2"
                              >
                                <title>{`${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]} ${hourIndex}:00 - Activity: ${activity}`}</title>
                              </rect>
                            )
                          })
                        )}
                      </svg>
                    </div>
                    <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                      <span>Less activity</span>
                      <div className="flex space-x-1">
                        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-sm border border-gray-600"
                            style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
                          />
                        ))}
                      </div>
                      <span>More activity</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudioPage