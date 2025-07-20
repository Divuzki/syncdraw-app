import React, { useState } from 'react';
import SessionsList from '@/components/session/SessionsList';
import CreateSessionDialog from '@/components/session/CreateSessionDialog';

const Sessions: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateSession = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
  };

  const handleSessionCreated = () => {
    // Trigger a refresh of the sessions list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <SessionsList 
            key={refreshKey}
            onCreateSession={handleCreateSession}
          />
        </div>
      </div>

      <CreateSessionDialog
        isOpen={isCreateDialogOpen}
        onClose={handleCloseCreateDialog}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
};

export default Sessions;