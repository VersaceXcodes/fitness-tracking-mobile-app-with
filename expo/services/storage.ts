/**
 * LaunchPulse Storage Client for Expo/React Native
 *
 * This client provides a simple API for file storage that routes all calls through
 * the LaunchPulse platform proxy. This allows generated apps to store files
 * without needing to manage their own storage credentials.
 *
 * Works on iOS, Android, and Web builds.
 *
 * Environment Variables (auto-injected by LaunchPulse):
 * - EXPO_PUBLIC_LAUNCHPULSE_API_KEY: API token for authentication
 * - EXPO_PUBLIC_LAUNCHPULSE_PROJECT_ID: Project identifier
 * - EXPO_PUBLIC_LAUNCHPULSE_API_URL: Platform API URL
 */

import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

// Get environment variables from Expo
const getEnvVar = (key: string): string | undefined => {
  // Try expo-constants first (works in most Expo environments)
  const extra = Constants.expoConfig?.extra?.[key];
  if (extra) return extra;

  // Fallback to process.env for web builds
  if (typeof process !== 'undefined' && process.env) {
    return (process.env as any)[key];
  }

  return undefined;
};

const env = {
  LAUNCHPULSE_API_KEY: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_API_KEY'),
  LAUNCHPULSE_PROJECT_ID: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_PROJECT_ID'),
  LAUNCHPULSE_API_URL: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_API_URL') || 'https://launchpulse.ai',
};

const hasLaunchPulseEnv =
  env.LAUNCHPULSE_API_KEY &&
  env.LAUNCHPULSE_PROJECT_ID &&
  env.LAUNCHPULSE_API_URL;

// Storage error class (matches StripeError pattern)
export class StorageError extends Error {
  type: string;
  param?: string;
  code?: string;

  constructor(message: string, type: string, param?: string, code?: string) {
    super(message);
    this.name = 'StorageError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

// File metadata type
export interface FileMetadata {
  id: string;
  project_id: string;
  file_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  is_public: boolean;
  url: string | null;  // Permanent public URL if is_public, null otherwise
  created_at: string;
  updated_at: string;
}

// Storage usage type
export interface StorageUsage {
  total_bytes: number;
  file_count: number;
  quota_bytes: number;
  usage_percent: number;
}

// Upload options type
export interface UploadOptions {
  /** Whether the file should be publicly accessible (default: true) */
  public?: boolean;
}

// Upload result type
export interface UploadResult {
  key: string;
  size: number;
  /** Permanent public URL if file is public, null if private */
  url: string | null;
}

// Make request to LaunchPulse storage proxy
async function storageRequest<T>(path: string, params: Record<string, any> = {}): Promise<T> {
  if (!hasLaunchPulseEnv) {
    throw new StorageError(
      'LaunchPulse Storage not configured. Please connect in your LaunchPulse dashboard.',
      'configuration_error',
      undefined,
      'STORAGE_NOT_CONFIGURED'
    );
  }

  const response = await fetch(`${env.LAUNCHPULSE_API_URL}/api/storage/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: env.LAUNCHPULSE_PROJECT_ID,
      token: env.LAUNCHPULSE_API_KEY,
      path,
      params,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const error = data.error || { message: 'An error occurred', type: 'api_error' };
    throw new StorageError(error.message, error.type, error.param, error.code);
  }

  return data;
}

/**
 * Storage client for file operations
 */
export const storage = {
  /**
   * Upload a file from a URI (e.g., from image picker)
   *
   * @param uri - Local file URI (from ImagePicker, Camera, etc.)
   * @param filename - Desired filename
   * @param contentType - MIME type (e.g., 'image/jpeg')
   * @param options - Upload options
   * @param options.public - Whether file should be publicly accessible (default: true)
   * @returns Promise with the file key, size, and permanent URL (if public)
   *
   * @example
   * ```typescript
   * import * as ImagePicker from 'expo-image-picker';
   *
   * const result = await ImagePicker.launchImageLibraryAsync();
   * if (!result.canceled) {
   *   const asset = result.assets[0];
   *   const uploaded = await storage.uploadUri(
   *     asset.uri,
   *     'photo.jpg',
   *     'image/jpeg'
   *   );
   *   console.log('Public URL:', uploaded.url);  // Works forever!
   * }
   * ```
   */
  async uploadUri(uri: string, filename: string, contentType: string, options: UploadOptions = {}): Promise<UploadResult> {
    const isPublic = options.public !== false;  // Default: true

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new StorageError('File not found', 'validation_error', 'uri', 'FILE_NOT_FOUND');
    }

    const size = (fileInfo as any).size || 0;

    // 1. Get presigned URL from proxy
    const { uploadUrl, key } = await storageRequest<{ uploadUrl: string; key: string }>('upload-url', {
      filename,
      contentType,
      size,
      public: isPublic,
    });

    // 2. Upload using expo-file-system
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new StorageError(
        'Failed to upload file to storage',
        'upload_error',
        undefined,
        'UPLOAD_FAILED'
      );
    }

    // 3. Confirm upload with proxy (returns public URL if public)
    const { size: confirmedSize, url } = await storageRequest<{ size: number; url: string | null }>('confirm-upload', {
      key,
      filename,
      contentType,
      claimedSize: size,
      public: isPublic,
    });

    return { key, size: confirmedSize, url };
  },

  /**
   * Upload a file using Blob/ArrayBuffer (for web builds)
   *
   * @param blob - File blob or array buffer
   * @param filename - Desired filename
   * @param contentType - MIME type
   * @param options - Upload options
   * @param options.public - Whether file should be publicly accessible (default: true)
   * @returns Promise with the file key, size, and permanent URL (if public)
   */
  async uploadBlob(blob: Blob | ArrayBuffer, filename: string, contentType: string, options: UploadOptions = {}): Promise<UploadResult> {
    const isPublic = options.public !== false;  // Default: true
    const size = blob instanceof Blob ? blob.size : blob.byteLength;

    // 1. Get presigned URL
    const { uploadUrl, key } = await storageRequest<{ uploadUrl: string; key: string }>('upload-url', {
      filename,
      contentType,
      size,
      public: isPublic,
    });

    // 2. Upload to R2
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': contentType,
      },
    });

    if (!uploadResponse.ok) {
      throw new StorageError(
        'Failed to upload file to storage',
        'upload_error',
        undefined,
        'UPLOAD_FAILED'
      );
    }

    // 3. Confirm upload (returns public URL if public)
    const { size: confirmedSize, url } = await storageRequest<{ size: number; url: string | null }>('confirm-upload', {
      key,
      filename,
      contentType,
      claimedSize: size,
      public: isPublic,
    });

    return { key, size: confirmedSize, url };
  },

  /**
   * Upload a base64-encoded file
   *
   * @param base64 - Base64 encoded file content (without data URL prefix)
   * @param filename - Desired filename
   * @param contentType - MIME type
   * @param options - Upload options
   * @param options.public - Whether file should be publicly accessible (default: true)
   * @returns Promise with the file key, size, and permanent URL (if public)
   */
  async uploadBase64(base64: string, filename: string, contentType: string, options: UploadOptions = {}): Promise<UploadResult> {
    // Convert base64 to blob for upload
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: contentType });

    return this.uploadBlob(blob, filename, contentType, options);
  },

  /**
   * Get a temporary download URL for a file
   *
   * @param fileKey - The file key returned from upload
   * @returns Promise with the download URL (expires in 15 minutes)
   */
  async getDownloadUrl(fileKey: string): Promise<string> {
    const { downloadUrl } = await storageRequest<{ downloadUrl: string }>('download-url', {
      fileKey,
    });
    return downloadUrl;
  },

  /**
   * Download a file to local storage
   *
   * @param fileKey - The file key to download
   * @param localUri - Local URI to save to (optional, will generate if not provided)
   * @returns Promise with the local file URI
   */
  async downloadToLocal(fileKey: string, localUri?: string): Promise<string> {
    const downloadUrl = await this.getDownloadUrl(fileKey);

    const filename = fileKey.split('/').pop() || 'download';
    const destination = localUri || `${FileSystem.documentDirectory}${filename}`;

    const result = await FileSystem.downloadAsync(downloadUrl, destination);

    if (result.status < 200 || result.status >= 300) {
      throw new StorageError(
        'Failed to download file',
        'download_error',
        undefined,
        'DOWNLOAD_FAILED'
      );
    }

    return result.uri;
  },

  /**
   * List all files in the project
   *
   * @returns Promise with array of file metadata
   */
  async list(): Promise<FileMetadata[]> {
    const { files } = await storageRequest<{ files: FileMetadata[] }>('list');
    return files;
  },

  /**
   * Delete a file from storage
   *
   * @param fileKey - The file key to delete
   */
  async delete(fileKey: string): Promise<void> {
    await storageRequest('delete', { fileKey });
  },

  /**
   * Get storage usage statistics
   *
   * @returns Promise with usage stats including quota
   */
  async getUsage(): Promise<StorageUsage> {
    return storageRequest<StorageUsage>('usage');
  },

  /**
   * Check if storage is configured
   *
   * @returns true if LaunchPulse storage env vars are set
   */
  isConfigured(): boolean {
    return hasLaunchPulseEnv;
  },
};

// Export default and named exports
export default storage;
export { storage as Storage };
