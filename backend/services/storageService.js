const fs = require('fs');
const path = require('path');
const { getContainerClient, isAzureAvailable } = require('../config/azure');
const db = require('../config/db');

class StorageService {
  constructor() {
    this.storageMode = 'local'; // Default to local storage
  }

  // Set storage mode (local or azure)
  async setStorageMode(mode) {
    if (mode !== 'local' && mode !== 'azure') {
      throw new Error('Invalid storage mode. Must be "local" or "azure"');
    }

    if (mode === 'azure' && !isAzureAvailable()) {
      throw new Error('Azure storage is not available. Please check your configuration.');
    }

    this.storageMode = mode;
    
    // Store the mode in database for persistence
    try {
      await db.query('INSERT INTO storage_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', 
        ['storage_mode', mode, mode]);
    } catch (error) {
      console.warn('Failed to save storage mode to database:', error.message);
    }
  }

  // Get current storage mode
  async getStorageMode() {
    try {
      const [rows] = await db.query('SELECT setting_value FROM storage_settings WHERE setting_key = ?', ['storage_mode']);
      if (rows.length > 0) {
        this.storageMode = rows[0].setting_value;
      }
    } catch (error) {
      console.warn('Failed to load storage mode from database:', error.message);
    }
    return this.storageMode;
  }

  // Upload file to current storage
  async uploadFile(fileBuffer, filename, originalname) {
    if (this.storageMode === 'azure') {
      return await this.uploadToAzure(fileBuffer, filename, originalname);
    } else {
      return await this.uploadToLocal(fileBuffer, filename, originalname);
    }
  }

  // Download file from current storage
  async downloadFile(filename) {
    if (this.storageMode === 'azure') {
      return await this.downloadFromAzure(filename);
    } else {
      return await this.downloadFromLocal(filename);
    }
  }

  // Delete file from current storage
  async deleteFile(filename) {
    if (this.storageMode === 'azure') {
      return await this.deleteFromAzure(filename);
    } else {
      return await this.deleteFromLocal(filename);
    }
  }

  // Check if file exists in current storage
  async fileExists(filename) {
    if (this.storageMode === 'azure') {
      return await this.existsInAzure(filename);
    } else {
      return await this.existsInLocal(filename);
    }
  }

  // Local storage methods
  async uploadToLocal(fileBuffer, filename, originalname) {
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, fileBuffer);
    
    return {
      success: true,
      path: filePath,
      storage: 'local'
    };
  }

  async downloadFromLocal(filename) {
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in local storage');
    }

    return {
      buffer: fs.readFileSync(filePath),
      path: filePath,
      storage: 'local'
    };
  }

  async deleteFromLocal(filename) {
    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true, storage: 'local' };
    }
    
    return { success: false, error: 'File not found' };
  }

  async existsInLocal(filename) {
    const filePath = path.join(__dirname, '../uploads', filename);
    return fs.existsSync(filePath);
  }

  // Azure storage methods
  async uploadToAzure(fileBuffer, filename, originalname) {
    try {
      const containerClient = getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: this.getContentType(originalname)
        },
        metadata: {
          originalname: originalname,
          uploadedAt: new Date().toISOString()
        }
      };

      await blockBlobClient.upload(fileBuffer, fileBuffer.length, uploadOptions);
      
      return {
        success: true,
        url: blockBlobClient.url,
        storage: 'azure'
      };
    } catch (error) {
      throw new Error(`Azure upload failed: ${error.message}`);
    }
  }

  async downloadFromAzure(filename) {
    try {
      const containerClient = getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      
      const downloadResponse = await blockBlobClient.download();
      const buffer = await this.streamToBuffer(downloadResponse.readableStreamBody);
      
      return {
        buffer: buffer,
        url: blockBlobClient.url,
        storage: 'azure'
      };
    } catch (error) {
      if (error.statusCode === 404) {
        throw new Error('File not found in Azure storage');
      }
      throw new Error(`Azure download failed: ${error.message}`);
    }
  }

  async deleteFromAzure(filename) {
    try {
      const containerClient = getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      
      await blockBlobClient.delete();
      
      return { success: true, storage: 'azure' };
    } catch (error) {
      if (error.statusCode === 404) {
        return { success: false, error: 'File not found' };
      }
      throw new Error(`Azure delete failed: ${error.message}`);
    }
  }

  async existsInAzure(filename) {
    try {
      const containerClient = getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      
      const exists = await blockBlobClient.exists();
      return exists;
    } catch (error) {
      console.error('Error checking file existence in Azure:', error.message);
      return false;
    }
  }

  // Utility methods
  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  async streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }

  // Migration methods for switching storage
  async migrateFileToAzure(filename) {
    try {
      // Download from local
      const localFile = await this.downloadFromLocal(filename);
      
      // Upload to Azure
      const azureResult = await this.uploadToAzure(localFile.buffer, filename, filename);
      
      // Delete from local
      await this.deleteFromLocal(filename);
      
      return azureResult;
    } catch (error) {
      throw new Error(`Migration to Azure failed: ${error.message}`);
    }
  }

  async migrateFileToLocal(filename) {
    try {
      // Download from Azure
      const azureFile = await this.downloadFromAzure(filename);
      
      // Upload to local
      const localResult = await this.uploadToLocal(azureFile.buffer, filename, filename);
      
      // Delete from Azure
      await this.deleteFromAzure(filename);
      
      return localResult;
    } catch (error) {
      throw new Error(`Migration to local failed: ${error.message}`);
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

module.exports = storageService;

