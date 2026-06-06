const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../prisma');
const { UPLOAD_DIR } = require('../config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const buildDir = path.join(UPLOAD_DIR, 'builds');
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    cb(null, buildDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { testGroups: true }
    });

    const testGroupIds = user.testGroups.map(tg => tg.testGroupId);

    const builds = await prisma.build.findMany({
      where: {
        testGroups: {
          some: { testGroupId: { in: testGroupIds } }
        }
      },
      include: {
        testGroups: {
          include: { testGroup: true }
        },
        _count: {
          select: { downloads: true }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    res.json(builds);
  } catch (error) {
    console.error('Get builds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const buildId = parseInt(req.params.id);
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { testGroups: true }
    });

    const testGroupIds = user.testGroups.map(tg => tg.testGroupId);

    const build = await prisma.build.findFirst({
      where: {
        id: buildId,
        testGroups: {
          some: { testGroupId: { in: testGroupIds } }
        }
      },
      include: {
        testGroups: {
          include: { testGroup: true }
        },
        _count: {
          select: { downloads: true }
        }
      }
    });

    if (!build) {
      return res.status(404).json({ error: 'Build not found or access denied' });
    }

    res.json(build);
  } catch (error) {
    console.error('Get build error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const buildId = parseInt(req.params.id);
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { testGroups: true }
    });

    const testGroupIds = user.testGroups.map(tg => tg.testGroupId);

    const build = await prisma.build.findFirst({
      where: {
        id: buildId,
        testGroups: {
          some: { testGroupId: { in: testGroupIds } }
        }
      }
    });

    if (!build) {
      return res.status(404).json({ error: 'Build not found or access denied' });
    }

    await prisma.download.create({
      data: {
        userId,
        buildId
      }
    });

    const filePath = path.join(UPLOAD_DIR, 'builds', build.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, build.fileName);
  } catch (error) {
    console.error('Download build error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAdmin, upload.single('build'), async (req, res) => {
  try {
    const { version, platform, changelog, isForceUpdate, testGroupIds } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Build file is required' });
    }

    const parsedTestGroupIds = JSON.parse(testGroupIds || '[]');

    const build = await prisma.build.create({
      data: {
        version,
        platform,
        changelog,
        isForceUpdate: isForceUpdate === 'true',
        filePath: req.file.filename,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedBy: req.user.userId,
        testGroups: {
          create: parsedTestGroupIds.map(id => ({
            testGroupId: parseInt(id)
          }))
        }
      },
      include: {
        testGroups: {
          include: { testGroup: true }
        }
      }
    });

    res.status(201).json(build);
  } catch (error) {
    console.error('Create build error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/stats', requireAdmin, async (req, res) => {
  try {
    const buildId = parseInt(req.params.id);

    const downloadCount = await prisma.download.count({
      where: { buildId }
    });

    const uniqueDownloaders = await prisma.download.groupBy({
      by: ['userId'],
      where: { buildId }
    });

    const feedbackCount = await prisma.feedback.count({
      where: { buildId }
    });

    res.json({
      downloadCount,
      uniqueTesterCount: uniqueDownloaders.length,
      feedbackCount
    });
  } catch (error) {
    console.error('Get build stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
