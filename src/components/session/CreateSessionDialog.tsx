import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSession } from '@/context/SessionContext';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: () => void;
}

interface SessionData {
  name: string;
  description: string;
  dawType: string;
}

const DAW_OPTIONS = [
  { value: 'pro-tools', label: 'Pro Tools' },
  { value: 'logic-pro', label: 'Logic Pro' },
  { value: 'ableton-live', label: 'Ableton Live' },
  { value: 'cubase', label: 'Cubase' },
  { value: 'studio-one', label: 'Studio One' },
  { value: 'reaper', label: 'REAPER' },
  { value: 'fl-studio', label: 'FL Studio' },
  { value: 'garageband', label: 'GarageBand' },
  { value: 'other', label: 'Other' },
];

const CreateSessionDialog: React.FC<CreateSessionDialogProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const { user } = useAuth();
  const { getUserRole } = useSession();
  const [formData, setFormData] = useState<SessionData>({
    name: '',
    description: '',
    dawType: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<SessionData>>({});

  const userRole = getUserRole(user?.uid || '');
  const isViewer = userRole === 'viewer';
  const canCreateSession = userRole === 'owner' || userRole === 'editor' || !userRole; // Allow if no role (new user)

  const validateForm = (): boolean => {
    const newErrors: Partial<SessionData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Session name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Session name must be at least 3 characters';
    }

    if (!formData.dawType) {
      newErrors.dawType = 'Please select a DAW type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user?.uid) {
      toast.error('You must be logged in to create a session');
      return;
    }

    if (!window.electronAPI) {
      toast.error('Session creation is only available in the desktop app');
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        createdBy: user.uid,
        participants: [user.uid],
        status: 'active' as const,
      };

      const result = await window.electronAPI.createSession(sessionData);

      if (result.success) {
        toast.success('Session created successfully!');
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          dawType: '',
        });
        setErrors({});
        
        // Close dialog and notify parent
        onClose();
        onSessionCreated?.();
      } else {
        toast.error(result.error || 'Failed to create session');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        description: '',
        dawType: '',
      });
      setErrors({});
      onClose();
    }
  };

  const handleInputChange = (field: keyof SessionData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-card border border-border p-6 shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Create New Session
            </h3>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-md p-1 hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="session-name" className="block text-sm font-medium text-foreground mb-2">
                      Session Name *
                    </label>
                    <input
                      id="session-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder={isViewer ? "Viewers cannot create sessions" : "Enter session name"}
                      disabled={isSubmitting || isViewer}
                      className={`w-full px-3 py-2 border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
                        isViewer ? 'cursor-not-allowed' : ''
                      } ${
                        errors.name ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="session-description" className="block text-sm font-medium text-foreground mb-2">
                      Description
                    </label>
                    <textarea
                      id="session-description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder={isViewer ? "Viewers cannot create sessions" : "Optional description for your session"}
                      disabled={isSubmitting || isViewer}
                      rows={3}
                      className={`w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none ${
                        isViewer ? 'cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div>
                    <label htmlFor="daw-type" className="block text-sm font-medium text-foreground mb-2">
                      DAW Type *
                    </label>
                    <select
                      id="daw-type"
                      value={formData.dawType}
                      onChange={(e) => handleInputChange('dawType', e.target.value)}
                      disabled={isSubmitting || isViewer}
                      className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
                        isViewer ? 'cursor-not-allowed' : ''
                      } ${
                        errors.dawType ? 'border-red-500' : 'border-border'
                      }`}
                    >
                      <option value="">Select a DAW</option>
                      {DAW_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.dawType && (
                      <p className="mt-1 text-sm text-red-600">{errors.dawType}</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || isViewer || !canCreateSession}
                      className={`flex-1 ${
                        isViewer ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : isViewer ? (
                        'Viewers Cannot Create Sessions'
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Session
                        </>
                      )}
                    </Button>
                  </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionDialog;