import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Users, 
  Upload, 
  Download, 
  MessageCircle, 
  Settings,
  Play,
  Pause,
  Volume2
} from 'lucide-react'
import { useSocket } from '@/context/SocketContext'
import { useAuth } from '@/context/AuthContext'
import { useSession } from '@/context/SessionContext'
import Button from '@/components/ui/Button'
import FileList from '@/components/session/FileList'
import ChatPanel from '@/components/session/ChatPanel'
import UserPresence from '@/components/session/UserPresence'
import UploadModal from '@/components/session/UploadModal'

const Session: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, joinSession, leaveSession, onlineUsers } = useSocket()
  const { currentSession, setCurrentSession, isOwner, canEdit } = useSession()
  
  const [session, setSession] = useState<any>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      joinSession(sessionId)
      // Load session data
      loadSessionData()
    }

    return () => {
      if (sessionId) {
        leaveSession(sessionId)
      }
    }
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      // Load session and files data
      // Set session with mock roles for demo (in real app, this would come from API)
      const mockSession = {
        id: sessionId,
        name: 'Demo Session',
        roles: {
          [user?.uid || '']: 'owner', // Current user as owner
          // Add other participants with different roles
        }
      }
      setSession(mockSession)
      setCurrentSession(mockSession)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load session:', error)
      setLoading(false)
    }
  }

  const handleLaunchStudio = () => {
    navigate(`/studio/${sessionId}`)
  }

  const sessionUsers = sessionId ? onlineUsers[sessionId] || [] : []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {session?.name || 'Untitled Session'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Session ID: {sessionId}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Presence */}
              <UserPresence users={sessionUsers} />

              {/* Actions */}
              <Button
                variant="default"
                size="sm"
                onClick={handleLaunchStudio}
                disabled={!isOwner(user?.uid || '')}
                className={!isOwner(user?.uid || '') ? 'opacity-50 pointer-events-none' : ''}
              >
                <Play className="w-4 h-4 mr-2" />
                Launch Studio
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>

              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* File Browser */}
        <div className={`flex-1 ${showChat ? 'mr-80' : ''} transition-all duration-300`}>
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Project Files</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {files.length} files
                  </span>
                </div>
              </div>
            </motion.div>

            <FileList 
              files={files} 
              sessionId={sessionId!}
              onFileUpdate={setFiles}
            />
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            className="w-80 border-l border-border bg-card/50"
          >
            <ChatPanel 
              sessionId={sessionId!}
              onClose={() => setShowChat(false)}
            />
          </motion.div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        sessionId={sessionId!}
        onFilesUploaded={(newFiles: any[]) => {
          setFiles((prev: any[]) => [...prev, ...newFiles])
          setShowUpload(false)
        }}
      />
    </div>
  )
}

export default Session