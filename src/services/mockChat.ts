// Mock chat service for simulating real-time messaging and presence

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'file';
}

export interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  cursor?: { x: number; y: number };
}

// Mock chat messages
const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sessionId: 'mock-session-1',
    userId: 'user-123',
    userName: 'John Doe',
    message: 'Welcome to the design review session!',
    timestamp: new Date('2024-01-15T10:05:00Z'),
    type: 'text'
  },
  {
    id: 'msg-2',
    sessionId: 'mock-session-1',
    userId: 'user-456',
    userName: 'Jane Smith',
    message: 'Thanks! I\'ve uploaded the wireframes for review.',
    timestamp: new Date('2024-01-15T10:16:00Z'),
    type: 'text'
  },
  {
    id: 'msg-3',
    sessionId: 'mock-session-1',
    userId: 'system',
    userName: 'System',
    message: 'Jane Smith uploaded wireframes.sketch',
    timestamp: new Date('2024-01-15T10:15:30Z'),
    type: 'system'
  },
  {
    id: 'msg-4',
    sessionId: 'mock-session-1',
    userId: 'user-789',
    userName: 'Bob Wilson',
    message: 'The wireframes look great! I have a few suggestions for the navigation.',
    timestamp: new Date('2024-01-15T10:32:00Z'),
    type: 'text'
  },
  {
    id: 'msg-5',
    sessionId: 'mock-session-1',
    userId: 'user-456',
    userName: 'Jane Smith',
    message: 'I\'d love to hear your suggestions, Bob!',
    timestamp: new Date('2024-01-15T10:33:15Z'),
    type: 'text'
  }
];

// Mock user presence
const mockPresence: UserPresence[] = [
  {
    userId: 'user-123',
    userName: 'John Doe',
    status: 'online',
    lastSeen: new Date(),
    cursor: { x: 150, y: 200 }
  },
  {
    userId: 'user-456',
    userName: 'Jane Smith',
    status: 'online',
    lastSeen: new Date(),
    cursor: { x: 300, y: 150 }
  },
  {
    userId: 'user-789',
    userName: 'Bob Wilson',
    status: 'away',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    cursor: { x: 100, y: 300 }
  }
];

const mockDelay = (ms: number = 200) => new Promise(resolve => setTimeout(resolve, ms));

export class MockChatService {
  private static messageListeners: ((message: ChatMessage) => void)[] = [];
  private static presenceListeners: ((presence: UserPresence[]) => void)[] = [];
  private static simulationInterval: NodeJS.Timeout | null = null;

  static async getMessages(sessionId: string): Promise<ChatMessage[]> {
    await mockDelay();
    return mockMessages.filter(msg => msg.sessionId === sessionId);
  }

  static async sendMessage(sessionId: string, userId: string, userName: string, message: string): Promise<ChatMessage> {
    await mockDelay(100);
    
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sessionId,
      userId,
      userName,
      message,
      timestamp: new Date(),
      type: 'text'
    };
    
    mockMessages.push(newMessage);
    
    // Notify listeners
    this.messageListeners.forEach(listener => listener(newMessage));
    
    return newMessage;
  }

  static onMessage(callback: (message: ChatMessage) => void): () => void {
    this.messageListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.messageListeners.indexOf(callback);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  static async getPresence(sessionId: string): Promise<UserPresence[]> {
    await mockDelay();
    return [...mockPresence];
  }

  static updateUserPresence(userId: string, updates: Partial<UserPresence>): void {
    const userIndex = mockPresence.findIndex(p => p.userId === userId);
    if (userIndex > -1) {
      mockPresence[userIndex] = { ...mockPresence[userIndex], ...updates };
    } else {
      mockPresence.push({
        userId,
        userName: updates.userName || 'Unknown User',
        status: updates.status || 'online',
        lastSeen: updates.lastSeen || new Date(),
        cursor: updates.cursor
      });
    }
    
    // Notify presence listeners
    this.presenceListeners.forEach(listener => listener([...mockPresence]));
  }

  static onPresenceUpdate(callback: (presence: UserPresence[]) => void): () => void {
    this.presenceListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.presenceListeners.indexOf(callback);
      if (index > -1) {
        this.presenceListeners.splice(index, 1);
      }
    };
  }

  static startSimulation(): void {
    if (this.simulationInterval) return;
    
    // Simulate random activity every 10-30 seconds
    this.simulationInterval = setInterval(() => {
      const randomUser = mockPresence[Math.floor(Math.random() * mockPresence.length)];
      
      // Randomly update cursor position
      if (Math.random() > 0.5) {
        this.updateUserPresence(randomUser.userId, {
          cursor: {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600)
          },
          lastSeen: new Date()
        });
      }
      
      // Occasionally send a random message
      if (Math.random() > 0.8) {
        const randomMessages = [
          'Looking good!',
          'What do you think about this section?',
          'I made some updates',
          'Can we discuss this part?',
          'Great work everyone!'
        ];
        
        const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
        this.sendMessage('mock-session-1', randomUser.userId, randomUser.userName, randomMessage);
      }
    }, Math.random() * 20000 + 10000); // 10-30 seconds
  }

  static stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  static disconnect(): void {
    this.stopSimulation();
    this.messageListeners.length = 0;
    this.presenceListeners.length = 0;
  }
}

export default MockChatService;