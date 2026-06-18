const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

// Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'docguard-files';

let blobServiceClient = null;
let containerClient = null;

// Initialize Azure Blob Storage
const initializeAzure = async () => {
  try {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      console.warn('Azure Storage connection string not found. Cloud storage will be disabled.');
      return false;
    }

    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);
    
    // Create container if it doesn't exist
    // Do NOT set public access when the storage account disallows it
    await containerClient.createIfNotExists();
    
    console.log('Azure Blob Storage initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Azure Blob Storage:', error.message);
    return false;
  }
};

// Get container client
const getContainerClient = () => {
  if (!containerClient) {
    throw new Error('Azure Blob Storage not initialized');
  }
  return containerClient;
};

// Check if Azure is available
const isAzureAvailable = () => {
  return blobServiceClient !== null && containerClient !== null;
};

module.exports = {
  initializeAzure,
  getContainerClient,
  isAzureAvailable,
  AZURE_CONTAINER_NAME
};

