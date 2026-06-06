require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { prisma } = require('./prisma');

const authRoutes = require('./routes/auth');
const buildRoutes = require('./routes/builds');
const feedbackRoutes = require('./routes/feedbacks');
const statsRoutes = require('./routes/stats');
const testGroupRoutes = require('./routes/testGroups');

const { UPLOAD_DIR } = require('./config');

const app = express();
const PORT = process.env.PORT || 6371;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/test-groups', testGroupRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { UPLOAD_DIR, app };
