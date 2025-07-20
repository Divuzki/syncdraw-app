export interface User {
  id: string
  displayName: string
  email: string
  photoURL?: string
  createdAt: Date
  lastActive: Date
}

export interface Session {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  participants: string[]
  vmId?: string
  status: 'active' | 'inactive' | 'launching'
  roles: Record<string, 'owner' | 'editor' | 'viewer'>
  settings: SessionSettings
}

export interface SessionSettings {
  maxParticipants: number
  allowFileUpload: boolean
  allowChat: boolean
  autoSave: boolean
}

export interface ProjectFile {
  id: string
  sessionId: string
  name: string
  size: number
  type: string
  url: string
  uploadedBy: string
  uploadedAt: Date
  version: number
  checksum: string
}

export interface FileVersion {
  id: string
  fileId: string
  version: number
  url: string
  uploadedBy: string
  uploadedAt: Date
  changes: string
  checksum: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  userId: string
  userName: string
  userAvatar?: string
  message: string
  timestamp: Date
  type: 'text' | 'file' | 'system'
}

export interface SocketEvents {
  // Connection
  connect: () => void
  disconnect: () => void
  
  // Session
  join_session: (data: { sessionId: string }) => void
  leave_session: (data: { sessionId: string }) => void
  session_users_updated: (data: { sessionId: string; users: User[] }) => void
  
  // Chat
  send_message: (data: { sessionId: string; message: string }) => void
  new_message: (message: ChatMessage) => void
  
  // Files
  file_uploaded: (data: { sessionId: string; file: ProjectFile }) => void
  file_updated: (data: { sessionId: string; file: ProjectFile }) => void
  file_deleted: (data: { sessionId: string; fileId: string }) => void
  
  // Presence
  user_joined: (data: { sessionId: string; user: User }) => void
  user_left: (data: { sessionId: string; user: User }) => void
}