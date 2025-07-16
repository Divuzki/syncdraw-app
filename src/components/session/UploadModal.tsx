import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { X, Upload, File, Music, AlertCircle } from 'lucide-react'
import { azureService } from '../../services/azure'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import toast from 'react-hot-toast'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  onFilesUploaded: (files: any[]) => void
}

interface UploadFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  url?: string
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onFilesUploaded,
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }))
    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.aiff', '.flac', '.m4a'],
      'application/*': ['.als', '.flp', '.logic', '.ptx'],
      '*/*': [],
    },
  })

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return

    setUploading(true)
    const uploadedFiles = []

    for (let i = 0; i < uploadFiles.length; i++) {
      const uploadFile = uploadFiles[i]
      
      setUploadFiles(prev => prev.map((f, index) => 
        index === i ? { ...f, status: 'uploading' } : f
      ))

      try {
        const url = await azureService.uploadFile(
          sessionId,
          uploadFile.file,
          (progress) => {
            setUploadFiles(prev => prev.map((f, index) => 
              index === i ? { ...f, progress } : f
            ))
          }
        )

        setUploadFiles(prev => prev.map((f, index) => 
          index === i ? { ...f, status: 'completed', url, progress: 100 } : f
        ))

        uploadedFiles.push({
          id: Date.now() + i,
          name: uploadFile.file.name,
          size: uploadFile.file.size,
          url,
          lastModified: new Date(),
          uploadedBy: 'Current User',
        })
      } catch (error) {
        setUploadFiles(prev => prev.map((f, index) => 
          index === i ? { ...f, status: 'error' } : f
        ))
        toast.error(`Failed to upload ${uploadFile.file.name}`)
      }
    }

    setUploading(false)
    
    if (uploadedFiles.length > 0) {
      onFilesUploaded(uploadedFiles)
      toast.success(`${uploadedFiles.length} file(s) uploaded successfully!`)
    }
  }

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['mp3', 'wav', 'aiff', 'flac', 'm4a'].includes(extension || '')) {
      return <Music className="w-5 h-5 text-blue-500" />
    }
    
    return <File className="w-5 h-5 text-muted-foreground" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleClose = () => {
    if (!uploading) {
      setUploadFiles([])
      onClose()
    }
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
            className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Upload Files</h2>
              <button
                onClick={handleClose}
                disabled={uploading}
                className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Drop Zone */}
              <div className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium mb-2">
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to select files
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports audio files, project files, and more
                  </p>
                </div>
              </div>

              {/* File List */}
              {uploadFiles.length > 0 && (
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <h3 className="font-medium text-foreground mb-4">
                    Files to upload ({uploadFiles.length})
                  </h3>
                  <div className="space-y-3">
                    {uploadFiles.map((uploadFile, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          {getFileIcon(uploadFile.file.name)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                          
                          {uploadFile.status === 'uploading' && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Uploading...</span>
                                <span>{Math.round(uploadFile.progress)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1">
                                <div
                                  className="bg-primary h-1 rounded-full transition-all"
                                  style={{ width: `${uploadFile.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {uploadFile.status === 'uploading' && (
                            <LoadingSpinner size="sm" />
                          )}
                          {uploadFile.status === 'completed' && (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                          {uploadFile.status === 'error' && (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          )}
                          {uploadFile.status === 'pending' && (
                            <button
                              onClick={() => removeFile(index)}
                              className="p-1 hover:bg-accent rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                loading={uploading}
                disabled={uploadFiles.length === 0 || uploading}
              >
                Upload {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default UploadModal