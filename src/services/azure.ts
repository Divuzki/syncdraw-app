import { BlockBlobClient, ContainerClient } from "@azure/storage-blob";
import axios from "axios";

const containerName =
  import.meta.env.VITE_AZURE_STORAGE_CONTAINER || "syncdaw-projects";
const functionsUrl = import.meta.env.VITE_AZURE_FUNCTIONS_URL;
const useMock = import.meta.env.VITE_USE_MOCK_DATA === "true";

export class AzureService {
  constructor() {}

  async uploadFile(
    sessionId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const blobName = `${sessionId}/${Date.now()}-${file.name}`;
      if (useMock) {
        const url = `${functionsUrl}/mock/${containerName}/${blobName}`;
        return url;
      }
      const { data } = await axios.post(`${functionsUrl}/api/blob-sas`, {
        container: containerName,
        pathPrefix: `${sessionId}/`,
        permissions: "rw",
        userId: sessionId,
      });
      const blockBlobClient = new BlockBlobClient(
        `${data.sasUrl.replace(/\?$/, "")}&` + `restype=container`,
        blobName
      );
      const client = new BlockBlobClient(
        `${data.sasUrl.replace(/\?$/, "")}&comp=block`,
        `${containerName}/${blobName}`
      );
      const uploadClient = new BlockBlobClient(
        `${data.sasUrl.replace(/\?$/, "")}`,
        `${containerName}/${blobName}`
      );
      const options = onProgress
        ? {
            onProgress: (ev: any) =>
              onProgress((ev.loadedBytes / file.size) * 100),
          }
        : undefined;
      await uploadClient.uploadData(file, options as any);
      return `https://${
        data.sasUrl.split("/")[2]
      }/${containerName}/${blobName}`;
    } catch (error) {
      console.error("File upload error:", error);
      throw new Error("Failed to upload file");
    }
  }

  async createSession(projectName: string, userId: string): Promise<any> {
    try {
      const response = await axios.post(`${functionsUrl}/api/session-create`, {
        projectName,
        userId,
      });
      return response.data;
    } catch (error) {
      console.error("Session creation error:", error);
      throw new Error("Failed to create session");
    }
  }

  async getSession(sessionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${functionsUrl}/api/session-get/${sessionId}`
      );
      return response.data;
    } catch (error) {
      console.error("Session fetch error:", error);
      throw new Error("Failed to fetch session");
    }
  }

  async listFiles(sessionId: string): Promise<any[]> {
    try {
      if (useMock) return [];
      const { data } = await axios.post(`${functionsUrl}/api/blob-sas`, {
        container: containerName,
        pathPrefix: `${sessionId}/`,
        permissions: "r",
      });
      const containerClient = new ContainerClient(data.sasUrl);
      const files: any[] = [];
      for await (const blob of containerClient.listBlobsFlat({
        prefix: `${sessionId}/`,
      })) {
        files.push({
          name: blob.name.split("/").pop(),
          url: `${containerClient.url.replace(/\?[^]*$/, "")}/${blob.name}`,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
        });
      }
      return files;
    } catch (error) {
      console.error("File listing error:", error);
      throw new Error("Failed to list files");
    }
  }

  async deleteFile(sessionId: string, fileName: string): Promise<void> {
    try {
      if (useMock) return;
      const { data } = await axios.post(`${functionsUrl}/api/blob-sas`, {
        container: containerName,
        pathPrefix: `${sessionId}/`,
        permissions: "rwd",
      });
      const blobName = `${sessionId}/${fileName}`;
      const urlBase = data.sasUrl.replace(/\?[^]*$/, "");
      const client = new BlockBlobClient(
        `${urlBase}/${blobName}?${data.sasUrl.split("?")[1]}`
      );
      await client.delete();
    } catch (error) {
      console.error("File deletion error:", error);
      throw new Error("Failed to delete file");
    }
  }
}

export const azureService = new AzureService();
