import express from 'express';
import db from '../models/index.js';
import moment from 'moment';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
dotenv.config();

const router = express.Router();


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
  const { startDate, endDate, logLevel, logCategory } = req.query;

  const whereConditions = {};
  if (startDate && endDate) {
    whereConditions.timestamp = {
      [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }
  if (logLevel) {
    whereConditions.level = logLevel;
  }
  if (logCategory) {
    whereConditions.category = logCategory;
  }

  try {
    const logs = await db.Log.findAndCountAll({
      where: whereConditions,
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });

    res.render('admin/logs', {
      logs: logs.rows || [],
      totalPages: Math.ceil(logs.count / limit),
      currentPage: page,
      startDate,
      endDate,
      logLevel,
      logCategory,
      moment
    });
  } catch (error) {
    res.status(500).render('error', { 
      message: 'Failed to load logs',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
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

// Route to display all clips
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
    console.error('Error fetching clips:', error);
    res.status(500).render('error', { error: 'Failed to load clips' });
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
    // First query to get all campaigns
    const campaigns = await db.Campaign.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    // Second query to get users
    const userIds = campaigns.map(campaign => campaign.UserId).filter(id => id);
    const users = await db.User.findAll({
      where: { id: userIds },
      attributes: ['id', 'discordId']
    });
    
    // Create a map of users for easy lookup
    const usersMap = new Map(users.map(user => [user.id, user]));
    
    // Combine the data
    const campaignsWithUsers = campaigns.map(campaign => {
      const campaignData = campaign.toJSON();
      campaignData.user = usersMap.get(campaign.UserId) || null;
      return campaignData;
    });

    console.log(campaigns);

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

// Route to display a specific clip
router.get('/clip/:clipId', async (req, res) => {
  const { clipId } = req.params;
  try {
    const clip = await db.Clip.findByPk(clipId, {
      include: [{ model: db.User, attributes: ['discordId'] }]
    });

    if (!clip) {
      return res.status(404).render('error', { error: 'Clip not found' });
    }

    res.render('admin/clip', { clip, moment });
  } catch (error) {
    console.error('Error fetching clip:', error);
    res.status(500).render('error', { error: 'Failed to load clip details' });
  }
});

// Route to display a specific campaign
router.get('/campaign/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  try {
    const campaign = await db.Campaign.findByPk(campaignId);

    if (!campaign) {
      return res.status(404).render('error', { message: 'Campaign not found' });
    }

    res.render('admin/campaign', { campaign, moment });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).render('error', { message: 'Failed to load campaign details' });
  }
});

// API Routes for Dashboard
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = {
      totalClips: await db.Clip.count(),
      totalUsers: await db.User.count(),
      totalCampaigns: await db.Campaign.count(),
      pendingModeration: await db.ClipModeration.count({ where: { status: 'PENDING' } })
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/dashboard/campaigns', async (req, res) => {
  try {
    const campaigns = await db.Campaign.findAll({
      where: { status: 'ACTIVE' },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.get('/dashboard/logs', async (req, res) => {
  try {
    const logs = await db.Log.findAll({
      order: [['timestamp', 'DESC']],
      limit: 20
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/dashboard/clips', async (req, res) => {
  try {
    const clips = await db.Clip.findAll({
      include: [{
        model: db.User,
        attributes: ['discordId']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    res.json(clips);
  } catch (error) {
    console.error('Error fetching clips:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

router.delete('/dashboard/clips/:clipId', async (req, res) => {
  const { clipId } = req.params;
  try {
    await db.Clip.destroy({ where: { id: clipId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting clip:', error);
    res.status(500).json({ error: 'Failed to delete clip' });
  }
});

// Get payment information for users
router.get('/dashboard/payments', async (req, res) => {
  try {
    const { campaignId } = req.query;
    
    // First get all users who have been paid
    const payments = await db.Payment.findAll({
      attributes: ['userId', 'paidAt'],
      raw: true
    });

    // Get the most recent payment date for each user
    const lastPaymentByUser = payments.reduce((acc, payment) => {
      if (!acc[payment.userId] || new Date(payment.paidAt) > new Date(acc[payment.userId])) {
        acc[payment.userId] = payment.paidAt;
      }
      return acc;
    }, {});

    // Get clips created after each user's last payment (or all clips if never paid)
    const whereClause = {};
    if (campaignId) {
      whereClause.CampaignId = campaignId;
    }

    const clips = await db.Clip.findAll({
      where: whereClause,
      attributes: ['id', 'url', 'UserId', 'CampaignId', 'createdAt'],
      raw: true
    });

    // Filter clips to only include those after last payment
    const unpaidClips = clips.filter(clip => {
      const lastPayment = lastPaymentByUser[clip.UserId];
      return !lastPayment || new Date(clip.createdAt) > new Date(lastPayment);
    });

    // Get unique user and campaign IDs
    const userIds = [...new Set(unpaidClips.map(clip => clip.UserId))];
    const campaignIds = [...new Set(unpaidClips.map(clip => clip.CampaignId))];

    // Fetch users and campaigns
    const [users, campaigns] = await Promise.all([
      db.User.findAll({
        where: { id: userIds },
        attributes: ['id', 'discordId', 'paypalEmail'],
        raw: true
      }),
      db.Campaign.findAll({
        where: { id: campaignIds },
        attributes: ['id', 'name', 'rate'],
        raw: true
      })
    ]);

    // Create lookup maps
    const userMap = new Map(users.map(user => [user.id, user]));
    const campaignMap = new Map(campaigns.map(campaign => [campaign.id, campaign]));

    // Group clips by user and calculate totals
    const paymentsByUser = unpaidClips.reduce((acc, clip) => {
      const userId = clip.UserId;
      const user = userMap.get(userId);
      const campaign = campaignMap.get(clip.CampaignId);

      if (!user || !campaign) return acc;

      if (!acc[userId]) {
        acc[userId] = {
          userId: userId,
          discordId: user.discordId,
          paypalEmail: user.paypalEmail,
          totalOwed: 0,
          clips: [],
          campaigns: new Set(),
          lastPaidAt: lastPaymentByUser[userId] || null
        };
      }
      
      acc[userId].totalOwed += campaign.rate;
      acc[userId].clips.push({
        id: clip.id,
        url: clip.url,
        campaignName: campaign.name,
        rate: campaign.rate,
        createdAt: clip.createdAt
      });
      acc[userId].campaigns.add(campaign.name);
      
      return acc;
    }, {});

    // Convert to array and format campaigns
    const paymentData = Object.values(paymentsByUser)
      .filter(payment => payment.totalOwed > 0) // Only include users with unpaid earnings
      .map(payment => ({
        ...payment,
        campaigns: Array.from(payment.campaigns),
        clipCount: payment.clips.length
      }));

    res.json(paymentData);
  } catch (error) {
    console.error('Error fetching payment data:', error);
    res.status(500).json({ error: 'Failed to fetch payment data' });
  }
});

// Get all active campaigns for filtering
router.get('/dashboard/payment-campaigns', async (req, res) => {
  try {
    const campaigns = await db.Campaign.findAll({
      attributes: ['id', 'name'],
      where: { status: 'ACTIVE' },
      raw: true
    });
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

export default router; 