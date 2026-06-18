require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const accessRoutes = require('./routes/accessRoutes');
const logRoutes = require('./routes/logRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { initializeAzure } = require('./config/azure');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/files', fileRoutes);
app.use('/access', accessRoutes);
app.use('/logs', logRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => res.json({ status: 'DocGuard backend running' }));

const PORT = process.env.PORT || 5000;

// Initialize Azure storage on startup
const startServer = async () => {
  try {
    // Initialize Azure storage (will fail gracefully if not configured)
    await initializeAzure();
    
    app.listen(PORT, () => {
      console.log(`✅ Backend running on port ${PORT}`);
      console.log('📁 Storage: Local (Azure available if configured)');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
