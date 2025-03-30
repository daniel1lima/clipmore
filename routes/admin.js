import express from 'express';
import db from '../models/index.js';
import moment from 'moment';

const router = express.Router();

// Login page
router.get('/login', (req, res) => {
  res.render('admin/login');
});

// Dashboard home
router.get('/', async (req, res) => {
  try {
    // Fetch all clips
    const clips = await db.Clip.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Get user IDs for these clips
    const userIds = clips.map(clip => clip.UserId);

    // Fetch users with discordId
    const users = await db.User.findAll({
      where: { id: userIds },
      attributes: ['id', 'discordId']
    });

    // Create a map for quick lookups
    const usersMap = new Map(users.map(user => [user.id, user]));

    // Combine the data
    const clipsWithData = clips.map(clip => ({
      ...clip.toJSON(),
      user: usersMap.get(clip.UserId)
    }));

    // Fetch active campaigns
    const activeCampaigns = await db.Campaign.findAll({
      where: { status: 'ACTIVE' },
      order: [['createdAt', 'DESC']]
    });

    // Fetch recent logs
    const logs = await db.Log.findAll({
      order: [['timestamp', 'DESC']],
      limit: 20
    });

    // Get basic stats
    const stats = {
      totalClips: await db.Clip.count(),
      totalUsers: await db.User.count(),
      totalCampaigns: await db.Campaign.count(),
      pendingModeration: await db.ClipModeration.count({ where: { status: 'PENDING' } })
    };

    res.render('admin/dashboard', {
      clips: clipsWithData,
      campaigns: activeCampaigns,
      logs,
      stats,
      moment
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { 
      message: 'Failed to load dashboard',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
});

// Logs view
router.get('/logs', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  
  try {
    const logs = await db.Log.findAndCountAll({
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });

    res.render('admin/logs', {
      logs: logs.rows,
      totalPages: Math.ceil(logs.count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).render('admin/error', { error: 'Failed to load logs' });
  }
});

// Clip moderation
router.get('/moderation', async (req, res) => {
  try {
    const pendingClips = await db.ClipModeration.findAll({
      where: { status: 'PENDING' },
      include: [{
        model: db.Clip,
        include: [{ model: db.User }]
      }]
    });

    res.render('admin/moderation', { clips: pendingClips });
  } catch (error) {
    res.status(500).render('admin/error', { error: 'Failed to load moderation queue' });
  }
});

// Handle clip moderation actions
router.post('/moderation/:clipId', async (req, res) => {
  const { clipId } = req.params;
  const { action, reason } = req.body;

  try {
    const clip = await db.Clip.findByPk(clipId);
    if (!clip) {
      throw new Error('Clip not found');
    }

    const user = await db.User.findByPk(clip.UserId);

    // Update clip moderation status
    await db.ClipModeration.update({
      status: action,
      reason: reason || null,
      reviewedAt: new Date()
    }, {
      where: { clipId }
    });

    // Log the moderation action
    await Logger.log(LogLevel.AUDIT, LogCategory.CLIP, `Clip ${action.toLowerCase()}`, {
      clipId,
      action,
      reason,
      clipUrl: clip.url,
      userId: user?.id,
      username: user?.username
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Moderation error:', error);
    await Logger.log(LogLevel.ERROR, LogCategory.CLIP, 'Moderation action failed', {
      clipId,
      error: error.message
    });
    res.status(500).json({ error: 'Moderation action failed' });
  }
});

// Add detailed views for specific sections
router.get('/clips', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const { count, rows: clips } = await db.Clip.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Get users and campaigns for these clips
    const userIds = clips.map(clip => clip.UserId);
    const campaignIds = clips.map(clip => clip.CampaignId);

    const [users, campaigns] = await Promise.all([
      db.User.findAll({
        where: { id: userIds },
        attributes: ['id', 'discordId']
      }),
      db.Campaign.findAll({
        where: { id: campaignIds }
      })
    ]);

    const usersMap = new Map(users.map(user => [user.id, user]));
    const campaignsMap = new Map(campaigns.map(campaign => [campaign.id, campaign]));

    // Combine the data
    const clipsWithData = clips.map(clip => ({
      ...clip.toJSON(),
      user: usersMap.get(clip.UserId),
      campaign: campaignsMap.get(clip.CampaignId)
    }));

    res.render('admin/clips', {
      clips: clipsWithData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      moment
    });
  } catch (error) {
    res.status(500).render('error', { error });
  }
});

// ... existing code ...
router.delete('/clips/:clipId', async (req, res) => {
    const { clipId } = req.params;
    try {
      await db.Clip.destroy({ where: { id: clipId } });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete clip error:', error);
      res.status(500).json({ error: 'Failed to delete clip' });
    }
  });

router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await db.Campaign.findAll({
      include: [{
        model: db.User,
        attributes: ['username']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/campaigns', { 
      campaigns,
      moment: moment
    });
  } catch (error) {
    res.status(500).render('error', { error });
  }
});

// Add export functionality for logs
router.get('/logs/export', async (req, res) => {
  try {
    const logs = await db.Log.findAll({
      order: [['timestamp', 'DESC']],
      raw: true
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=logs.json');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

export default router; 