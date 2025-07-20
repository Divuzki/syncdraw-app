import { Session, SessionSettings } from '../../shared/types';

// Mock session data that matches real API schemas
const mockSessions: Session[] = [
  {
    id: 'mock-session-1',
    name: 'Design Review Meeting',
    description: 'Weekly design review for the new product features',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T14:30:00Z'),
    status: 'active',
    ownerId: 'user-123',
    settings: {
      maxParticipants: 10,
      allowFileUpload: true,
      allowChat: true,
      autoSave: true
    },
    participants: [
      { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'owner' },
      { id: 'user-456', name: 'Jane Smith', email: 'jane@example.com', role: 'editor' },
      { id: 'user-789', name: 'Bob Wilson', email: 'bob@example.com', role: 'viewer' }
    ],
    files: [
      {
        id: 'file-1',
        name: 'wireframes.sketch',
        size: 2048576,
        type: 'application/sketch',
        uploadedAt: new Date('2024-01-15T10:15:00Z'),
        uploadedBy: 'user-123'
      },
      {
        id: 'file-2',
        name: 'requirements.pdf',
        size: 1024000,
        type: 'application/pdf',
        uploadedAt: new Date('2024-01-15T11:00:00Z'),
        uploadedBy: 'user-456'
      }
    ]
  },
  {
    id: 'mock-session-2',
    name: 'Sprint Planning',
    description: 'Planning session for Sprint 23',
    createdAt: new Date('2024-01-14T09:00:00Z'),
    updatedAt: new Date('2024-01-14T12:00:00Z'),
    status: 'inactive',
    ownerId: 'user-456',
    settings: {
      maxParticipants: 8,
      allowFileUpload: true,
      allowChat: true,
      autoSave: false
    },
    participants: [
      { id: 'user-456', name: 'Jane Smith', email: 'jane@example.com', role: 'owner' },
      { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'editor' }
    ],
    files: [
      {
        id: 'file-3',
        name: 'user-stories.docx',
        size: 512000,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedAt: new Date('2024-01-14T09:30:00Z'),
        uploadedBy: 'user-456'
      }
    ]
  },
  {
    id: 'mock-session-3',
    name: 'Client Presentation',
    description: 'Final presentation to the client',
    createdAt: new Date('2024-01-13T14:00:00Z'),
    updatedAt: new Date('2024-01-13T16:30:00Z'),
    status: 'launching',
    ownerId: 'user-123',
    settings: {
      maxParticipants: 15,
      allowFileUpload: false,
      allowChat: true,
      autoSave: true
    },
    participants: [
      { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'owner' },
      { id: 'user-789', name: 'Bob Wilson', email: 'bob@example.com', role: 'viewer' }
    ],
    files: [
      {
        id: 'file-4',
        name: 'presentation.pptx',
        size: 5120000,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        uploadedAt: new Date('2024-01-13T14:15:00Z'),
        uploadedBy: 'user-123'
      }
    ]
  }
];

// Mock delay to simulate network requests
const mockDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

const getSessions = async (): Promise<Session[]> => {
  await mockDelay();
  return [...mockSessions];
};

const getSession = async (sessionId: string): Promise<Session | null> => {
  await mockDelay();
  return mockSessions.find(session => session.id === sessionId) || null;
};

const createSession = async (sessionData: {
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
}): Promise<Session> => {
  await mockDelay();
  
  const newSession: Session = {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: sessionData.name,
    description: sessionData.description || '',
    ownerId: sessionData.ownerId,
    ownerName: sessionData.ownerName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    participants: [
      {
        id: sessionData.ownerId,
        name: sessionData.ownerName,
        role: 'owner',
        joinedAt: new Date().toISOString(),
        isOnline: true
      }
    ],
    settings: {
      maxParticipants: 10,
      isPublic: false,
      allowGuests: false
    }
  };
  
  mockSessions.push(newSession);
  return newSession;
};

const updateSession = async (sessionId: string, updates: Partial<Session>): Promise<Session | null> => {
  await mockDelay();
  
  const sessionIndex = mockSessions.findIndex(session => session.id === sessionId);
  if (sessionIndex === -1) {
    return null;
  }
  
  mockSessions[sessionIndex] = {
    ...mockSessions[sessionIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  return mockSessions[sessionIndex];
};

const deleteSession = async (sessionId: string): Promise<boolean> => {
  await mockDelay();
  
  const sessionIndex = mockSessions.findIndex(session => session.id === sessionId);
  if (sessionIndex === -1) {
    return false;
  }
  
  mockSessions.splice(sessionIndex, 1);
  return true;
};

const launchStudio = async (sessionId: string): Promise<{ streamUrl: string; vmId: string }> => {
  await mockDelay(2000); // Simulate VM provisioning delay
  
  const session = mockSessions.find(s => s.id === sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Update session status to indicate VM is running
  const sessionIndex = mockSessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    mockSessions[sessionIndex].status = 'running';
  }
  
  return {
    streamUrl: `/stream/${sessionId}`,
    vmId: `vm-${sessionId}-${Date.now()}`
  };
};

const getSessionMetrics = async (sessionId: string) => {
  await mockDelay();
  
  // Generate mock metrics data
  return {
    collaborators: Math.floor(Math.random() * 8) + 1,
    editTime: `${Math.floor(Math.random() * 120) + 30}m`,
    topUser: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'][Math.floor(Math.random() * 6)],
    heatmap: Array(7).fill(0).map(() => 
      Array(24).fill(0).map(() => Math.floor(Math.random() * 10))
    )
  };
};

export const MockSessionService = {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  launchStudio,
  getSessionMetrics,
};

export default MockSessionService;