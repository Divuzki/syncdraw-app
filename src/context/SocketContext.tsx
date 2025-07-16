import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

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
      const socketUrl = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001'
      const newSocket = io(socketUrl, {
        auth: {
          token: user.accessToken,
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

      newSocket.on('user_joined', ({ sessionId, user: joinedUser }) => {
        toast.success(`${joinedUser.displayName} joined the session`)
      })

      newSocket.on('user_left', ({ sessionId, user: leftUser }) => {
        toast(`${leftUser.displayName} left the session`)
      })

      newSocket.on('file_updated', ({ sessionId, fileName, updatedBy }) => {
        toast(`${fileName} was updated by ${updatedBy.displayName}`)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [user])

  const joinSession = (sessionId: string) => {
    if (socket) {
      socket.emit('join_session', { sessionId })
    }
  }

  const leaveSession = (sessionId: string) => {
    if (socket) {
      socket.emit('leave_session', { sessionId })
    }
  }

  const sendMessage = (sessionId: string, message: string) => {
    if (socket) {
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