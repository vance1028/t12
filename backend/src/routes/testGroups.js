const express = require('express');
const { prisma } = require('../server');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const testGroups = await prisma.testGroup.findMany({
      include: {
        _count: {
          select: { users: true, builds: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(testGroups);
  } catch (error) {
    console.error('Get test groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const testGroupId = parseInt(req.params.id);

    const testGroup = await prisma.testGroup.findUnique({
      where: { id: testGroupId },
      include: {
        users: {
          include: {
            user: {
              select: { id: true, username: true, email: true }
            }
          }
        },
        builds: {
          include: {
            build: {
              select: { id: true, version: true, platform: true, uploadedAt: true }
            }
          }
        }
      }
    });

    if (!testGroup) {
      return res.status(404).json({ error: 'Test group not found' });
    }

    res.json(testGroup);
  } catch (error) {
    console.error('Get test group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    const testGroup = await prisma.testGroup.create({
      data: {
        name,
        description
      }
    });

    res.status(201).json(testGroup);
  } catch (error) {
    console.error('Create test group error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Test group name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/users', requireAdmin, async (req, res) => {
  try {
    const testGroupId = parseInt(req.params.id);
    const { userIds } = req.body;

    const testGroup = await prisma.testGroup.findUnique({
      where: { id: testGroupId }
    });

    if (!testGroup) {
      return res.status(404).json({ error: 'Test group not found' });
    }

    const assignments = await Promise.all(
      userIds.map(userId =>
        prisma.userTestGroup.upsert({
          where: {
            userId_testGroupId: {
              userId: parseInt(userId),
              testGroupId
            }
          },
          update: {},
          create: {
            userId: parseInt(userId),
            testGroupId,
            assignedBy: req.user.userId
          }
        })
      )
    );

    res.json({ message: 'Users assigned successfully', count: assignments.length });
  } catch (error) {
    console.error('Assign users to test group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/users/:userId', requireAdmin, async (req, res) => {
  try {
    const testGroupId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    await prisma.userTestGroup.delete({
      where: {
        userId_testGroupId: {
          userId,
          testGroupId
        }
      }
    });

    res.json({ message: 'User removed from test group' });
  } catch (error) {
    console.error('Remove user from test group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/users/available', requireAdmin, async (req, res) => {
  try {
    const testGroupId = parseInt(req.params.id);

    const usersInGroup = await prisma.userTestGroup.findMany({
      where: { testGroupId },
      select: { userId: true }
    });

    const userIdsInGroup = usersInGroup.map(u => u.userId);

    const availableUsers = await prisma.user.findMany({
      where: {
        id: { notIn: userIdsInGroup },
        role: 'TESTER'
      },
      select: { id: true, username: true, email: true },
      orderBy: { username: 'asc' }
    });

    res.json(availableUsers);
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
