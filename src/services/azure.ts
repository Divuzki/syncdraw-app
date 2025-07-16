import { BlobServiceClient } from '@azure/storage-blob'
import axios from 'axios'

const connectionString = import.meta.env.VITE_AZURE_STORAGE_CONNECTION_STRING
const containerName = import.meta.env.VITE_AZURE_STORAGE_CONTAINER || 'syncdaw-projects'
const functionsUrl = import.meta.env.VITE_AZURE_FUNCTIONS_URL

export class AzureService {
  private blobServiceClient: BlobServiceClient

  constructor() {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
  }

  async uploadFile(sessionId: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName)
      const blobName = `${sessionId}/${Date.now()}-${file.name}`
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      const uploadOptions = {
        onProgress: onProgress ? (ev: any) => {
          const progress = (ev.loadedBytes / file.size) * 100
          onProgress(progress)
        } : undefined,
      }

      await blockBlobClient.uploadData(file, uploadOptions)
      return blockBlobClient.url
    } catch (error) {
      console.error('File upload error:', error)
      throw new Error('Failed to upload file')
    }
  }

  async createSession(projectName: string, userId: string): Promise<any> {
    try {
      const response = await axios.post(`${functionsUrl}/api/session-create`, {
        projectName,
        userId,
      })
      return response.data
    } catch (error) {
      console.error('Session creation error:', error)
      throw new Error('Failed to create session')
    }
  }

  async getSession(sessionId: string): Promise<any> {
    try {
      const response = await axios.get(`${functionsUrl}/api/session-get/${sessionId}`)
      return response.data
    } catch (error) {
      console.error('Session fetch error:', error)
      throw new Error('Failed to fetch session')
    }
  }

  async listFiles(sessionId: string): Promise<any[]> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName)
      const files = []
      
      for await (const blob of containerClient.listBlobsFlat({ prefix: `${sessionId}/` })) {
        files.push({
          name: blob.name.split('/').pop(),
          url: `${containerClient.url}/${blob.name}`,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
        })
      }
      
      return files
    } catch (error) {
      console.error('File listing error:', error)
      throw new Error('Failed to list files')
    }
  }

  async deleteFile(sessionId: string, fileName: string): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName)
      const blobName = `${sessionId}/${fileName}`
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)
      
      await blockBlobClient.delete()
    } catch (error) {
      console.error('File deletion error:', error)
      throw new Error('Failed to delete file')
    }
  }
}

export const azureService = new AzureService()