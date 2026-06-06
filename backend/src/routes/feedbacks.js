const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../prisma');
const { UPLOAD_DIR } = require('../config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const attachmentDir = path.join(UPLOAD_DIR, 'attachments');
    if (!fs.existsSync(attachmentDir)) {
      fs.mkdirSync(attachmentDir, { recursive: true });
    }
    cb(null, attachmentDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: attachmentStorage });

router.use(authenticateToken);

const VALID_STATUS_TRANSITIONS = {
  NEW: ['CONFIRMED', 'CLOSED'],
  CONFIRMED: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['PENDING_VERIFICATION', 'CLOSED'],
  PENDING_VERIFICATION: ['CLOSED', 'CONFIRMED'],
  CLOSED: ['CONFIRMED']
};

function isValidStatusTransition(oldStatus, newStatus) {
  if (!oldStatus) return newStatus === 'NEW';
  return VALID_STATUS_TRANSITIONS[oldStatus]?.includes(newStatus) || false;
}

router.get('/', async (req, res) => {
  try {
    const { status, type, severity, buildId, authorId, tag, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const where = {};
    
    if (status) where.status = status;
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (buildId) where.buildId = parseInt(buildId);
    if (authorId) where.authorId = parseInt(authorId);
    if (tag) where.tags = { has: tag };

    if (req.user.role !== 'ADMIN') {
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { testGroups: true }
      });
      const testGroupIds = user.testGroups.map(tg => tg.testGroupId);
      
      where.OR = [
        { authorId: userId },
        {
          build: {
            testGroups: {
              some: { testGroupId: { in: testGroupIds } }
            }
          }
        }
      ];
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true }
        },
        build: {
          select: { id: true, version: true, platform: true }
        },
        verifiedBuild: {
          select: { id: true, version: true }
        },
        attachments: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5
        }
      },
      orderBy: { [sortBy]: sortOrder }
    });

    res.json(feedbacks);
  } catch (error) {
    console.error('Get feedbacks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        author: {
          select: { id: true, username: true }
        },
        build: true,
        verifiedBuild: true,
        attachments: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' }
        }
      }
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (req.user.role !== 'ADMIN' && feedback.authorId !== req.user.userId) {
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { testGroups: true }
      });
      const testGroupIds = user.testGroups.map(tg => tg.testGroupId);

      if (feedback.buildId) {
        const buildAccess = await prisma.buildTestGroup.findFirst({
          where: {
            buildId: feedback.buildId,
            testGroupId: { in: testGroupIds }
          }
        });
        if (!buildAccess) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }

    res.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', upload.array('attachments', 10), async (req, res) => {
  try {
    const { type, severity, title, description, levelScene, buildId, tags } = req.body;
    
    const parsedTags = tags ? JSON.parse(tags) : [];

    const feedback = await prisma.feedback.create({
      data: {
        type,
        severity,
        title,
        description,
        levelScene: levelScene || null,
        buildId: buildId ? parseInt(buildId) : null,
        authorId: req.user.userId,
        tags: parsedTags,
        statusHistory: {
          create: {
            newStatus: 'NEW',
            changedBy: req.user.userId
          }
        }
      },
      include: {
        author: { select: { id: true, username: true } },
        build: { select: { id: true, version: true } }
      }
    });

    if (req.files && req.files.length > 0) {
      const attachments = await Promise.all(
        req.files.map(file =>
          prisma.feedbackAttachment.create({
            data: {
              feedbackId: feedback.id,
              fileName: file.originalname,
              filePath: file.filename,
              fileType: file.mimetype,
              fileSize: file.size
            }
          })
        )
      );
      feedback.attachments = attachments;
    }

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const { newStatus, comment, verifiedBuildId } = req.body;

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId }
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (req.user.role !== 'ADMIN' && feedback.authorId !== req.user.userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (req.user.role !== 'ADMIN' && feedback.authorId === req.user.userId) {
      if (!['NEW', 'CLOSED'].includes(newStatus)) {
        return res.status(403).json({ error: 'Testers can only set NEW or CLOSED status' });
      }
    }

    if (!isValidStatusTransition(feedback.status, newStatus)) {
      return res.status(400).json({ 
        error: `Invalid status transition from ${feedback.status} to ${newStatus}` 
      });
    }

    const updateData = {
      status: newStatus,
      statusHistory: {
        create: {
          oldStatus: feedback.status,
          newStatus,
          changedBy: req.user.userId,
          comment
        }
      }
    };

    if (newStatus === 'PENDING_VERIFICATION' && verifiedBuildId) {
      updateData.verifiedBuildId = parseInt(verifiedBuildId);
    }

    const updatedFeedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: updateData,
      include: {
        author: { select: { id: true, username: true } },
        build: true,
        verifiedBuild: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5
        }
      }
    });

    res.json(updatedFeedback);
  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/attachments/:attachmentId/download', async (req, res) => {
  try {
    const { feedbackId, attachmentId } = req.params;

    const attachment = await prisma.feedbackAttachment.findUnique({
      where: { id: parseInt(attachmentId) }
    });

    if (!attachment || attachment.feedbackId !== parseInt(feedbackId)) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = path.join(UPLOAD_DIR, 'attachments', attachment.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, attachment.fileName);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pending-verification/mine', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { testGroups: true }
    });
    const testGroupIds = user.testGroups.map(tg => tg.testGroupId);

    const feedbacks = await prisma.feedback.findMany({
      where: {
        status: 'PENDING_VERIFICATION',
        authorId: userId,
        verifiedBuild: {
          testGroups: {
            some: { testGroupId: { in: testGroupIds } }
          }
        }
      },
      include: {
        verifiedBuild: {
          select: { id: true, version: true, platform: true }
        },
        build: {
          select: { id: true, version: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(feedbacks);
  } catch (error) {
    console.error('Get pending verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
