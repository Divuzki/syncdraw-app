import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSession } from '@/context/SessionContext';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import StudioWindow from '@/components/studio/StudioWindow';

interface Session {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  dawType?: string;
  createdAt: string;
  participants: string[];
  createdBy: string;
}

interface SessionsListProps {
  onCreateSession: () => void;
}

const SessionsList: React.FC<SessionsListProps> = ({ onCreateSession }) => {
  const { user } = useAuth();
  const { getUserRole, setCurrentSession } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioWindow, setStudioWindow] = useState<{
    isOpen: boolean;
    sessionId?: string;
    dawType?: string;
  }>({ isOpen: false });

  const fetchSessions = async () => {
    if (!user?.uid || !window.electronAPI) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await window.electronAPI.getSessions(user.uid);
      
      if (result.success) {
        setSessions(result.sessions || []);
      } else {
        setError(result.error || 'Failed to fetch sessions');
        toast.error('Failed to load sessions');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchStudio = async (sessionId: string, dawType?: string) => {
    // Load session context to get user role
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      // Convert Session to ExtendedSession format for setCurrentSession
      const extendedSession = {
        ...session,
        createdAt: new Date(session.createdAt),
        status: session.status === 'archived' ? 'inactive' : session.status as 'active' | 'inactive' | 'launching',
        roles: {}, // Will be loaded by setCurrentSession via IPC
        settings: {
          maxParticipants: 10,
          allowFileUpload: true,
          allowChat: true,
          autoSave: true
        }
      };
      await setCurrentSession(extendedSession);
    }
    
    const userRole = getUserRole(user?.uid || '');
    
    if (userRole === 'viewer') {
      toast.error('Viewers cannot launch studio sessions');
      return;
    }
    
    setStudioWindow({
      isOpen: true,
      sessionId,
      dawType,
    });
  };

  const handleCloseStudio = () => {
    setStudioWindow({ isOpen: false });
  };

  useEffect(() => {
    fetchSessions();
  }, [user?.uid]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-muted-foreground">Loading sessions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Sessions</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchSessions} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Play className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Sessions Yet</h3>
        <p className="text-muted-foreground mb-4">Create your first session to get started</p>
        <Button onClick={onCreateSession}>
          Create Session
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Your Sessions</h2>
        <Button onClick={onCreateSession}>
          Create New Session
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {session.name}
                </h3>
                {session.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {session.description}
                  </p>
                )}
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(session.status)}`}>
                {session.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              {session.dawType && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="font-medium">DAW:</span>
                  <span className="ml-1">{session.dawType}</span>
                </div>
              )}
              
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="w-4 h-4 mr-1" />
                <span>{session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}</span>
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                <span>{formatDate(session.createdAt)}</span>
              </div>
            </div>
            
            <Button
              onClick={() => handleLaunchStudio(session.id, session.dawType)}
              className={`w-full ${
                getUserRole(user?.uid || '') === 'viewer' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={session.status === 'archived' || getUserRole(user?.uid || '') === 'viewer'}
            >
              <Play className="w-4 h-4 mr-2" />
              {getUserRole(user?.uid || '') === 'viewer' ? 'Viewers Cannot Launch' : 'Launch Studio'}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Studio Window Modal */}
      <StudioWindow
        sessionId={studioWindow.sessionId || ''}
        dawType={studioWindow.dawType}
        isOpen={studioWindow.isOpen}
        onClose={handleCloseStudio}
      />
    </div>
  );
};

export default SessionsList;