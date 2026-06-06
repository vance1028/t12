const express = require('express');
const { prisma } = require('../prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalFeedbacks, weeklyNewFeedbacks, totalBuilds, totalTesters] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.count({
        where: { createdAt: { gte: weekAgo } }
      }),
      prisma.build.count(),
      prisma.user.count({ where: { role: 'TESTER' } })
    ]);

    const severityDistribution = await prisma.feedback.groupBy({
      by: ['severity'],
      _count: true
    });

    const typeDistribution = await prisma.feedback.groupBy({
      by: ['type'],
      _count: true
    });

    const statusDistribution = await prisma.feedback.groupBy({
      by: ['status'],
      _count: true
    });

    res.json({
      totalFeedbacks,
      weeklyNewFeedbacks,
      totalBuilds,
      totalTesters,
      severityDistribution,
      typeDistribution,
      statusDistribution
    });
  } catch (error) {
    console.error('Get overview stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/feedbacks-by-version', async (req, res) => {
  try {
    const builds = await prisma.build.findMany({
      include: {
        _count: {
          select: { feedbacks: true, downloads: true }
        }
      },
      orderBy: { uploadedAt: 'desc' },
      take: 10
    });

    const buildStats = builds.map(build => ({
      id: build.id,
      version: build.version,
      platform: build.platform,
      feedbackCount: build._count.feedbacks,
      downloadCount: build._count.downloads,
      feedbackDensity: build._count.downloads > 0 
        ? (build._count.feedbacks / build._count.downloads * 100).toFixed(2)
        : 0
    }));

    res.json(buildStats);
  } catch (error) {
    console.error('Get feedbacks by version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/weekly-trend', async (req, res) => {
  try {
    const days = 7;
    const now = new Date();
    const dailyStats = [];

    for (let i = days - 1; i >= 0; i--) {
      const startOfDay = new Date(now);
      startOfDay.setDate(now.getDate() - i);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      const [newFeedbacks, closedFeedbacks, downloads] = await Promise.all([
        prisma.feedback.count({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } }
        }),
        prisma.feedback.count({
          where: {
            statusHistory: {
              some: {
                newStatus: 'CLOSED',
                changedAt: { gte: startOfDay, lte: endOfDay }
              }
            }
          }
        }),
        prisma.download.count({
          where: { downloadedAt: { gte: startOfDay, lte: endOfDay } }
        })
      ]);

      dailyStats.push({
        date: startOfDay.toISOString().split('T')[0],
        newFeedbacks,
        closedFeedbacks,
        downloads
      });
    }

    res.json(dailyStats);
  } catch (error) {
    console.error('Get weekly trend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
