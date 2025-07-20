// Mock file service for simulating file operations

import React from 'react'
import { Music, File } from 'lucide-react'

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  uploadedBy: string;
  url?: string;
  thumbnailUrl?: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Mock file storage
const mockFiles: FileItem[] = [
  {
    id: 'file-1',
    name: 'wireframes.sketch',
    size: 2048576,
    type: 'application/sketch',
    uploadedAt: new Date('2024-01-15T10:15:00Z'),
    uploadedBy: 'user-123',
    url: 'https://example.com/files/wireframes.sketch',
    thumbnailUrl: 'https://example.com/thumbnails/wireframes.jpg'
  },
  {
    id: 'file-2',
    name: 'requirements.pdf',
    size: 1024000,
    type: 'application/pdf',
    uploadedAt: new Date('2024-01-15T11:00:00Z'),
    uploadedBy: 'user-456',
    url: 'https://example.com/files/requirements.pdf',
    thumbnailUrl: 'https://example.com/thumbnails/requirements.jpg'
  },
  {
    id: 'file-3',
    name: 'user-stories.docx',
    size: 512000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadedAt: new Date('2024-01-14T09:30:00Z'),
    uploadedBy: 'user-456',
    url: 'https://example.com/files/user-stories.docx',
    thumbnailUrl: 'https://example.com/thumbnails/user-stories.jpg'
  },
  {
    id: 'file-4',
    name: 'presentation.pptx',
    size: 5120000,
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    uploadedAt: new Date('2024-01-13T14:15:00Z'),
    uploadedBy: 'user-123',
    url: 'https://example.com/files/presentation.pptx',
    thumbnailUrl: 'https://example.com/thumbnails/presentation.jpg'
  }
];

const mockDelay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

export class MockFileService {
  private static uploadListeners: ((progress: UploadProgress) => void)[] = [];

  static async getFiles(sessionId: string): Promise<FileItem[]> {
    await mockDelay();
    // In a real implementation, files would be filtered by sessionId
    return [...mockFiles];
  }

  static async getFile(fileId: string): Promise<FileItem | null> {
    await mockDelay();
    return mockFiles.find(file => file.id === fileId) || null;
  }

  static async uploadFile(
    sessionId: string,
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileItem> {
    const fileId = `file-${Date.now()}`;
    
    // Simulate upload progress
    const simulateProgress = async () => {
      for (let progress = 0; progress <= 100; progress += 10) {
        await mockDelay(100);
        
        const progressData: UploadProgress = {
          fileId,
          fileName: file.name,
          progress,
          status: progress === 100 ? 'completed' : 'uploading'
        };
        
        if (onProgress) onProgress(progressData);
        this.uploadListeners.forEach(listener => listener(progressData));
      }
    };
    
    // Start progress simulation
    simulateProgress();
    
    // Wait for "upload" to complete
    await mockDelay(1200);
    
    const newFile: FileItem = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      uploadedBy: userId,
      url: `https://example.com/files/${file.name}`,
      thumbnailUrl: `https://example.com/thumbnails/${file.name.split('.')[0]}.jpg`
    };
    
    mockFiles.push(newFile);
    return newFile;
  }

  static async deleteFile(fileId: string): Promise<boolean> {
    await mockDelay();
    
    const fileIndex = mockFiles.findIndex(file => file.id === fileId);
    if (fileIndex === -1) return false;
    
    mockFiles.splice(fileIndex, 1);
    return true;
  }

  static async downloadFile(fileId: string): Promise<{ url: string; filename: string } | null> {
    await mockDelay();
    
    const file = mockFiles.find(f => f.id === fileId);
    if (!file) return null;
    
    return {
      url: file.url || `https://example.com/download/${fileId}`,
      filename: file.name
    };
  }

  static async renameFile(fileId: string, newName: string): Promise<FileItem | null> {
    await mockDelay();
    
    const fileIndex = mockFiles.findIndex(file => file.id === fileId);
    if (fileIndex === -1) return null;
    
    mockFiles[fileIndex] = {
      ...mockFiles[fileIndex],
      name: newName
    };
    
    return mockFiles[fileIndex];
  }

  static onUploadProgress(callback: (progress: UploadProgress) => void): () => void {
    this.uploadListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.uploadListeners.indexOf(callback);
      if (index > -1) {
        this.uploadListeners.splice(index, 1);
      }
    };
  }

  static getFileIcon(fileName: string) {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['mp3', 'wav', 'aiff', 'flac', 'm4a'].includes(extension || '')) {
      return React.createElement(Music, { className: 'w-5 h-5 text-blue-500' })
    }
    
    if (['als', 'flp', 'logic', 'ptx'].includes(extension || '')) {
      return React.createElement(Music, { className: 'w-5 h-5 text-purple-500' })
    }
    
    if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
      return React.createElement(File, { className: 'w-5 h-5 text-green-500' })
    }
    
    return React.createElement(File, { className: 'w-5 h-5 text-muted-foreground' })
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default MockFileService;