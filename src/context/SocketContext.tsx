import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'
import { MockChatService, ChatMessage, UserPresence } from '../services/mockChat'
import { USE_MOCK_DATA } from '../services'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  joinSession: (sessionId: string) => void
  leaveSession: (sessionId: string) => void
  sendMessage: (sessionId: string, message: string) => void
  onlineUsers: Record<string, any[]>
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any[]>>({})
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      if (USE_MOCK_DATA) {
        // Mock socket connection
        console.log('🎭 Mock: Using mock socket services')
        setConnected(true)
        
        // Start mock simulation
        MockChatService.startSimulation()
        
        // Set up mock presence
        const mockUsers = [
          { id: user.uid, displayName: user.displayName || 'You', photoURL: user.photoURL },
          { id: 'user-456', displayName: 'Jane Smith', photoURL: null },
          { id: 'user-789', displayName: 'Bob Wilson', photoURL: null }
        ]
        
        setOnlineUsers({ 'mock-session-1': mockUsers })
        
        // Listen for mock presence updates
        const unsubscribePresence = MockChatService.onPresenceUpdate((presence: UserPresence[]) => {
          const users = presence.map(p => ({
            id: p.userId,
            displayName: p.userName,
            status: p.status,
            lastSeen: p.lastSeen
          }))
          setOnlineUsers(prev => ({ ...prev, 'mock-session-1': users }))
        })
        
        // Listen for mock messages
        const unsubscribeMessages = MockChatService.onMessage((message: ChatMessage) => {
          if (message.type === 'system') {
            toast(message.message)
          } else if (message.userId !== user.uid) {
            toast(`${message.userName}: ${message.message}`)
          }
        })
        
        return () => {
          MockChatService.stopSimulation()
          unsubscribePresence()
          unsubscribeMessages()
        }
      } else {
        // Real socket connection
        const socketUrl = import.meta.env.VITE_SOCKET_SERVER_URL
        const newSocket = io(socketUrl, {
          auth: {
            userId: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
          },
        })

        newSocket.on('connect', () => {
          setConnected(true)
          console.log('Connected to WebSocket server')
        })

        newSocket.on('disconnect', () => {
          setConnected(false)
          console.log('Disconnected from WebSocket server')
        })

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error)
          toast.error('Failed to connect to collaboration server')
        })

        newSocket.on('session_users_updated', ({ sessionId, users }) => {
          setOnlineUsers(prev => ({
            ...prev,
            [sessionId]: users,
          }))
        })

        newSocket.on('user_joined', ({ user: joinedUser }) => {
          toast.success(`${joinedUser.displayName} joined the session`)
        })

        newSocket.on('user_left', ({ user: leftUser }) => {
          toast(`${leftUser.displayName} left the session`)
        })

        newSocket.on('file_updated', ({ fileName, updatedBy }) => {
          toast(`${fileName} was updated by ${updatedBy.displayName}`)
        })

        setSocket(newSocket)

        return () => {
          newSocket.close()
        }
      }
    }
  }, [user])

  const joinSession = (sessionId: string) => {
    if (USE_MOCK_DATA) {
      console.log('🎭 Mock: Joining session:', sessionId)
      MockChatService.updateUserPresence(user?.uid || 'unknown', {
        userName: user?.displayName || 'Unknown User',
        status: 'online',
        lastSeen: new Date()
      })
      toast.success('Joined session (mock mode)')
    } else if (socket) {
      socket.emit('join_session', { sessionId })
    }
  }

  const leaveSession = (sessionId: string) => {
    if (USE_MOCK_DATA) {
      console.log('🎭 Mock: Leaving session:', sessionId)
      MockChatService.updateUserPresence(user?.uid || 'unknown', {
        status: 'offline',
        lastSeen: new Date()
      })
      toast('Left session (mock mode)')
    } else if (socket) {
      socket.emit('leave_session', { sessionId })
    }
  }

  const sendMessage = (sessionId: string, message: string) => {
    if (USE_MOCK_DATA) {
      console.log('🎭 Mock: Sending message:', message)
      MockChatService.sendMessage(
        sessionId,
        user?.uid || 'unknown',
        user?.displayName || 'Unknown User',
        message
      )
    } else if (socket) {
      socket.emit('send_message', { sessionId, message })
    }
  }

  const value: SocketContextType = {
    socket,
    connected,
    joinSession,
    leaveSession,
    sendMessage,
    onlineUsers,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}