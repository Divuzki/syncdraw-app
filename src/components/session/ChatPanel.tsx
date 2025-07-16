import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, X, Smile } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import Button from '../ui/Button'

interface ChatPanelProps {
  sessionId: string
  onClose: () => void
}

interface Message {
  id: string
  userId: string
  userName: string
  userAvatar: string
  message: string
  timestamp: Date
}

const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId, onClose }) => {
  const { user } = useAuth()
  const { socket, sendMessage } = useSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (socket) {
      socket.on('new_message', (message: Message) => {
        setMessages(prev => [...prev, message])
      })

      return () => {
        socket.off('new_message')
      }
    }
  }, [socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      userId: user!.uid,
      userName: user!.displayName || 'Anonymous',
      userAvatar: user!.photoURL || '',
      message: newMessage.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, message])
    sendMessage(sessionId, newMessage.trim())
    setNewMessage('')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Session Chat</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex space-x-3 ${
                message.userId === user!.uid ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <img
                src={message.userAvatar || `https://ui-avatars.com/api/?name=${message.userName}&background=6366f1&color=fff`}
                alt={message.userName}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div className={`flex-1 ${message.userId === user!.uid ? 'text-right' : ''}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {message.userName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div
                  className={`inline-block px-3 py-2 rounded-lg text-sm ${
                    message.userId === user!.uid
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.message}
                </div>
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-3 py-2 pr-10 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded"
            >
              <Smile className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <Button type="submit" size="sm" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ChatPanel