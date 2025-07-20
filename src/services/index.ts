// Service layer with conditional mock/real service exports

import { MockSessionService } from "./mockSession";
import { MockChatService } from "./mockChat";
import { MockFileService } from "./mockFiles";

// Check if we should use mock data
const USE_MOCK_DATA =
  import.meta.env.VITE_USE_MOCK_DATA === "true" ||
  process.env.USE_MOCK_DATA === "true";

// Lazy load AzureService only when needed and not in mock mode
let AzureService: any = null;
const getAzureService = async () => {
  if (!AzureService && !USE_MOCK_DATA) {
    const module = await import("./azure");
    AzureService = module.AzureService;
  }
  return AzureService;
};

// Session Service
export const SessionService = USE_MOCK_DATA
  ? MockSessionService
  : {
      getSessions: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.getSessions?.(...args) || [];
      },
      getSession: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.getSession?.(...args) || null;
      },
      createSession: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.createSession?.(...args) || {};
      },
      updateSession: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.updateSession?.(...args) || {};
      },
      deleteSession: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.deleteSession?.(...args) || false;
      },
      launchStudio: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.launchStudio?.(...args) || {};
      },
      getSessionMetrics: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.getSessionMetrics?.(...args) || {};
      },
    };

// Chat Service (real implementation would be a separate service)
export const ChatService = USE_MOCK_DATA
  ? MockChatService
  : {
      // Real chat service would be implemented here
      getMessages: async () => [],
      sendMessage: async () => ({}),
      onMessage: () => () => {},
      getPresence: async () => [],
      updateUserPresence: () => {},
      onPresenceUpdate: () => () => {},
      startSimulation: () => {},
      stopSimulation: () => {},
      disconnect: () => {},
    };

// File Service
export const FileService = USE_MOCK_DATA
  ? MockFileService
  : {
      // Real file service would use Azure Blob Storage
      getFiles: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.getFiles?.(...args) || [];
      },
      getFile: async () => null,
      uploadFile: async () => ({}),
      deleteFile: async (...args: any[]) => {
        const azure = await getAzureService();
        return azure?.deleteFile?.(...args) || false;
      },
      downloadFile: async () => null,
      renameFile: async () => null,
      onUploadProgress: () => () => {},
      getFileIcon: MockFileService.getFileIcon,
      formatFileSize: MockFileService.formatFileSize,
    };

// Export mock services for testing
export { MockSessionService, MockChatService, MockFileService };

// Export real services (lazy-loaded)
export const getAzureServiceInstance = getAzureService;

// Export the flag for components to check
export { USE_MOCK_DATA };

// Utility function to check if mock mode is enabled
export const isMockMode = (): boolean => USE_MOCK_DATA;

// Mock VM launch service
export const VMService = {
  launchStudio: USE_MOCK_DATA
    ? MockSessionService.launchStudio.bind(MockSessionService)
    : async (sessionId: string) => {
        // Real VM launch would call Azure Functions
        const response = await fetch(
          `${import.meta.env.VITE_AZURE_FUNCTION_URL}/vm-provision`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          }
        );
        return response.json();
      },

  getSessionMetrics: USE_MOCK_DATA
    ? MockSessionService.getSessionMetrics.bind(MockSessionService)
    : async (sessionId: string) => {
        // Real metrics would come from Azure/CosmosDB
        return {
          collaborators: 0,
          editTime: "0m",
          topUser: "Unknown",
          heatmap: [],
          activityTimeline: [],
        };
      },
};

console.log(
  `🔧 Service Layer: ${USE_MOCK_DATA ? "MOCK" : "REAL"} mode enabled`
);
