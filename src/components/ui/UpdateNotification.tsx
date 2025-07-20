import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Set up auto-updater event listeners
    const removeUpdateAvailable = window.electronAPI?.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateAvailable(true);
      setUpdateInfo(info);
    });

    const removeDownloadProgress = window.electronAPI?.onDownloadProgress((progress: DownloadProgress) => {
      setDownloadProgress(progress);
    });

    const removeUpdateDownloaded = window.electronAPI?.onUpdateDownloaded(() => {
      setUpdateDownloaded(true);
      setDownloading(false);
      setDownloadProgress(null);
    });

    // Cleanup event listeners
    return () => {
      removeUpdateAvailable?.();
      removeDownloadProgress?.();
      removeUpdateDownloaded?.();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI) return;
    
    setChecking(true);
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.success && result.error) {
        console.error('Failed to check for updates:', result.error);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI) return;
    
    setDownloading(true);
    try {
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success && result.error) {
        console.error('Failed to download update:', result.error);
        setDownloading(false);
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      setDownloading(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('Error installing update:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  // Don't render if not in Electron environment
  if (!window.electronAPI) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Check for Updates Button */}
      {!updateAvailable && !updateDownloaded && (
        <button
          onClick={handleCheckForUpdates}
          disabled={checking}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Check for Updates'}
        </button>
      )}

      {/* Update Available Notification */}
      {updateAvailable && !downloading && !updateDownloaded && (
        <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-5 h-5" />
            <h3 className="font-semibold">Update Available</h3>
          </div>
          <p className="text-sm mb-3">
            Version {updateInfo?.version} is ready to download.
          </p>
          <button
            onClick={handleDownloadUpdate}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-2 px-4 rounded transition-colors"
          >
            Download Update
          </button>
        </div>
      )}

      {/* Download Progress */}
      {downloading && downloadProgress && (
        <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-5 h-5 animate-pulse" />
            <h3 className="font-semibold">Downloading Update</h3>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{Math.round(downloadProgress.percent)}%</span>
              <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
            </div>
            <div className="w-full bg-blue-800 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>
          </div>
          <p className="text-xs">
            {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
          </p>
        </div>
      )}

      {/* Update Downloaded */}
      {updateDownloaded && (
        <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5" />
            <h3 className="font-semibold">Update Ready</h3>
          </div>
          <p className="text-sm mb-3">
            Update has been downloaded. Restart to apply the update.
          </p>
          <button
            onClick={handleInstallUpdate}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-2 px-4 rounded transition-colors"
          >
            Restart & Install
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateNotification;