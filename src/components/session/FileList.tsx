import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  File, 
  Music, 
  Download, 
  Trash2, 
  MoreVertical,
  Clock,
  User
} from 'lucide-react'
import Button from '../ui/Button'

interface FileListProps {
  files: any[]
  sessionId: string
}

const FileList: React.FC<FileListProps> = ({ files }) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

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

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mx-auto mb-4">
          <Music className="w-8 h-8 text-muted-foreground" />
        </div>
        <h4 className="text-lg font-medium text-foreground mb-2">No files uploaded</h4>
        <p className="text-muted-foreground">
          Upload your project files to start collaborating
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* File Actions */}
      {selectedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-accent/50 rounded-lg"
        >
          <span className="text-sm text-foreground">
            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </motion.div>
      )}

      {/* Files Grid */}
      <div className="grid grid-cols-1 gap-3">
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center space-x-4 p-4 bg-card border rounded-lg hover:shadow-sm transition-all cursor-pointer ${
              selectedFiles.includes(file.id) ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onClick={() => handleFileSelect(file.id)}
          >
            <div className="flex-shrink-0">
              {getFileIcon(file.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </h4>
                <Button variant="ghost" size="sm" className="p-1">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  <span>{file.uploadedBy || 'Unknown'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default FileList