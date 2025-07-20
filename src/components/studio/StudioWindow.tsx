import React, { useState, useEffect } from 'react';
import { X, Play, Square, Loader2, Monitor, Cpu, Wifi } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useSession } from '@/context/SessionContext';
import toast from 'react-hot-toast';

interface StudioWindowProps {
  sessionId: string;
  dawType?: string;
  isOpen: boolean;
  onClose: () => void;
}

type StudioStep = 'allocating' | 'starting' | 'connecting' | 'ready' | 'error';

interface StudioState {
  step: StudioStep;
  progress: number;
  streamingUrl?: string;
  vmId?: string;
  error?: string;
}

const StudioWindow: React.FC<StudioWindowProps> = ({
  sessionId,
  dawType = 'pro-tools',
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { getUserRole } = useSession();
  const [studioState, setStudioState] = useState<StudioState>({
    step: 'allocating',
    progress: 0,
  });
  const [isLaunching, setIsLaunching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const userRole = getUserRole(user?.uid || '');
  const canEndSession = userRole === 'owner';

  const stepConfig = {
    allocating: {
      title: 'Allocating VM',
      description: 'Setting up your virtual machine...',
      icon: Cpu,
      progress: 25,
    },
    starting: {
      title: 'Starting DAW',
      description: `Launching ${dawType.replace('-', ' ').toUpperCase()}...`,
      icon: Play,
      progress: 60,
    },
    connecting: {
      title: 'Establishing Connection',
      description: 'Connecting to streaming service...',
      icon: Wifi,
      progress: 85,
    },
    ready: {
      title: 'Studio Ready',
      description: 'Your DAW is ready to use!',
      icon: Monitor,
      progress: 100,
    },
    error: {
      title: 'Launch Failed',
      description: 'Failed to launch studio',
      icon: X,
      progress: 0,
    },
  };

  const launchStudio = async () => {
    if (!window.electronAPI) {
      toast.error('Studio launch is only available in the desktop app');
      return;
    }

    setIsLaunching(true);
    setStudioState({ step: 'allocating', progress: 0 });

    try {
      // Simulate progress steps
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStudioState({ step: 'allocating', progress: 25 });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setStudioState({ step: 'starting', progress: 60 });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setStudioState({ step: 'connecting', progress: 85 });

      // Call the actual IPC method
      const result = await window.electronAPI.launchStudio(sessionId, dawType);

      if (result.success) {
        setStudioState({
          step: 'ready',
          progress: 100,
          streamingUrl: result.streamingUrl,
          vmId: result.vmId,
        });
        toast.success('Studio launched successfully!');
      } else {
        throw new Error(result.error || 'Failed to launch studio');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to launch studio';
      setStudioState({
        step: 'error',
        progress: 0,
        error: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleCancel = async () => {
    if (!window.electronAPI) return;

    setIsCancelling(true);
    try {
      if (studioState.vmId) {
        await window.electronAPI.endSession(studioState.vmId);
      }
      toast.success('Studio session cancelled');
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel session';
      toast.error(errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClose = () => {
    if (studioState.step === 'ready' && studioState.vmId) {
      // Confirm before closing active session
      if (window.confirm('Are you sure you want to close the studio? Your session will be ended.')) {
        handleCancel();
      }
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen && !isLaunching && studioState.step === 'allocating' && studioState.progress === 0) {
      launchStudio();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStep = stepConfig[studioState.step];
  const IconComponent = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <IconComponent className={`w-5 h-5 ${
                  studioState.step === 'error' ? 'text-red-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {currentStep.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Session: {sessionId}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLaunching || isCancelling}
              className="rounded-md p-2 hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {studioState.step !== 'ready' ? (
              <div className="space-y-6">
                {/* Progress Section */}
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    {studioState.step === 'error' ? (
                      <X className="w-8 h-8 text-red-500" />
                    ) : (
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {currentStep.description}
                    </h3>
                    {studioState.error && (
                      <p className="text-sm text-red-600 mb-4">{studioState.error}</p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {studioState.step !== 'error' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{studioState.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${studioState.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Steps Indicator */}
                <div className="flex justify-center space-x-8">
                  {(['allocating', 'starting', 'connecting', 'ready'] as StudioStep[]).map((step) => {
                    const stepInfo = stepConfig[step];
                    const StepIcon = stepInfo.icon;
                    const isActive = studioState.step === step;
                    const isCompleted = studioState.progress > stepInfo.progress - 25;
                    
                    return (
                      <div key={step} className="flex flex-col items-center space-y-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-blue-600 text-white' :
                          isActive ? 'bg-blue-100 text-blue-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <span className={`text-xs ${
                          isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          {stepInfo.title}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-3">
                  {studioState.step === 'error' ? (
                    <>
                      <Button variant="outline" onClick={onClose}>
                        Close
                      </Button>
                      <Button onClick={launchStudio}>
                        Retry
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Studio Ready - Show Streaming Interface */
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Your {dawType.replace('-', ' ').toUpperCase()} studio is ready!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You can now start creating music in your virtual DAW environment.
                  </p>
                </div>

                {/* Streaming Window */}
                <div className="bg-black rounded-lg overflow-hidden" style={{ height: '500px' }}>
                  {studioState.streamingUrl ? (
                    <iframe
                      src={studioState.streamingUrl}
                      className="w-full h-full border-0"
                      title="DAW Studio Stream"
                      allow="fullscreen"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Connecting to stream...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Studio Controls */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Connected to VM: {studioState.vmId}</span>
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={handleCancel}
                      disabled={!canEndSession}
                      className={!canEndSession ? 'opacity-50 cursor-not-allowed' : ''}
                      title={!canEndSession ? 'Only session owners can end sessions' : 'End session'}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      {canEndSession ? 'End Session' : 'End Session (Owner Only)'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioWindow;