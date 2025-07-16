import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Folder, Upload } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { azureService } from '../../services/azure'
import Button from '../ui/Button'
import toast from 'react-hot-toast'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionCreated: (session: any) => void
}

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const { user } = useAuth()
  const [projectName, setProjectName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectFolder()
      if (folder) {
        setSelectedFolder(folder)
        // Extract folder name for project name if not set
        if (!projectName) {
          const folderName = folder.split('/').pop() || folder.split('\\').pop()
          setProjectName(folderName || 'Untitled Project')
        }
      }
    }
  }

  const handleCreateSession = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    setLoading(true)
    try {
      const session = await azureService.createSession(projectName, user!.uid)
      toast.success('Session created successfully!')
      onSessionCreated(session)
    } catch (error) {
      toast.error('Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setProjectName('')
    setSelectedFolder(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Create New Session</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>

              {/* Folder Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Folder (Optional)
                </label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={handleSelectFolder}
                    className="w-full justify-start"
                  >
                    <Folder className="w-4 h-4 mr-2" />
                    {selectedFolder ? 'Change Folder' : 'Select Folder'}
                  </Button>
                  {selectedFolder && (
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedFolder}
                    </p>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Upload className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Upload files later
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can upload project files after creating the session
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSession}
                loading={loading}
                disabled={!projectName.trim()}
              >
                Create Session
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default CreateSessionModal