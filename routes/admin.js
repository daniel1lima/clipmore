import express from 'express';
import db from '../models/index.js';
import moment from 'moment';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { testCampaignPayouts } from '../utils/extractMetadata.js';
dotenv.config();

const router = express.Router();


// Dashboard home
router.get('/', async (req, res) => {
  try {
    // Fetch all clips with user info directly through association
    const clips = await db.Clip.findAll({
      include: [{
        model: db.User,
        attributes: ['discordId']
      }],
      order: [['createdAt', 'DESC']]
    });

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
      clips,
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
      include: [{
        model: db.User,
        attributes: ['discordId']
      }, {
        model: db.Campaign,
        attributes: ['discordGuildId', 'name']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // No need for separate user/campaign fetching since we're using includes

    res.render('admin/clips', {
      clips,
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
    const campaigns = await db.Campaign.findAll({
      include: [{
        model: db.Clip,
        attributes: ['id']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Add clip count to each campaign
    const campaignsWithData = campaigns.map(campaign => ({
      ...campaign.toJSON(),
      clipCount: campaign.Clips?.length || 0
    }));

    res.render('admin/campaigns', { 
      campaigns: campaignsWithData,
      moment
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
        attributes: ['discordId', 'username']
      }],
      attributes: [
        'id', 'url', 'platform', 'views', 'likes', 
        'createdAt', 'userDiscordId', 'discordGuildId'
      ],
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

// Clean up the payments listing endpoint to use associations
router.get('/dashboard/payments', async (req, res) => {
  try {
    const { discordGuildId } = req.query;
    
    // Build where clause for payments if filtering by campaign
    const whereClause = discordGuildId ? { discordGuildId } : {};
    
    // Get all payments with their related data
    const payments = await db.Payment.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          attributes: ['discordId', 'paypalEmail', 'username']
        },
        {
          model: db.Campaign,
          attributes: ['name', 'discordGuildId', 'status']
        },
        {
          model: db.Clip,
          attributes: ['id', 'url', 'views', 'likes']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Transform data for frontend
    const formattedPayments = payments.map(payment => ({
      id: payment.id,  // Make sure to include the payment ID for updates
      discordId: payment.userDiscordId,
      discordGuildId: payment.discordGuildId,
      paypalEmail: payment.User?.paypalEmail || '',
      totalOwed: Number(payment.amount),
      amountPaid: payment.status === 'PAID' ? Number(payment.amount) : 0,
      status: payment.status,
      paymentDate: payment.paidAt,
      paymentMethod: payment.paymentMethod,
      expedite: payment.expedite || false,
      createdBy: payment.createdBy,
      paidBy: payment.paidBy,
      createdAt: payment.createdAt,
      campaign: payment.Campaign?.name || 'Unknown Campaign',
      clipCount: payment.Clips?.length || payment.clipCount || 0,
      username: payment.User?.username || 'Unknown User'
    }));

    // For campaigns that are completed but don't have payments yet,
    // we don't need to handle that here anymore since you're creating
    // payments at the time campaign completes

    res.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching payment data:', error);
    res.status(500).json({ error: 'Failed to fetch payment data' });
  }
});

// Update payment status and handle clips relationship
router.patch('/dashboard/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, paymentMethod, expedite } = req.body;

    const payment = await db.Payment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const updates = {
      status,
      paymentMethod,
      expedite,
      paidAt: status === 'PAID' ? new Date() : null,
      paidBy: status === 'PAID' ? req.user?.discordId : null
    };

    await payment.update(updates);

    // If the payment status changed to PAID, make sure all the clips are associated
    if (status === 'PAID') {
      // Find any clips that should be associated with this payment but aren't yet
      const unassociatedClips = await db.Clip.findAll({
        where: {
          userDiscordId: payment.userDiscordId,
          discordGuildId: payment.discordGuildId,
          paymentId: null
        }
      });
      
      if (unassociatedClips.length > 0) {
        await db.Clip.update(
          { paymentId: payment.id },
          { where: { id: unassociatedClips.map(clip => clip.id) } }
        );
      }
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Add route to create new payment
router.post('/dashboard/payments', async (req, res) => {
  try {
    const { userDiscordId, discordGuildId, amount, paymentMethod, expedite } = req.body;

    const payment = await db.Payment.create({
      userDiscordId,
      discordGuildId,
      amount,
      status: 'PENDING',
      paymentMethod,
      expedite,
      createdBy: req.user?.discordId // Assuming you have user info in req
    });

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Add route to bulk update payments
router.post('/dashboard/payments/bulk', async (req, res) => {
  try {
    const { paymentIds, status, paymentMethod } = req.body;

    await db.Payment.update({
      status,
      paymentMethod,
      paidAt: status === 'PAID' ? new Date() : null,
      paidBy: status === 'PAID' ? req.user?.discordId : null
    }, {
      where: {
        id: paymentIds
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk updating payments:', error);
    res.status(500).json({ error: 'Failed to update payments' });
  }
});

// Get all active campaigns for filtering
router.get('/dashboard/payment-campaigns', async (req, res) => {
  try {
    const campaigns = await db.Campaign.findAll({
      attributes: ['discordGuildId', 'name'],
      where: { status: 'ACTIVE' },
      raw: true
    });
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Add this near your other routes
router.post('/test/campaign-payout/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const results = await testCampaignPayouts(campaignId);
    res.json(results);
  } catch (error) { 
    res.status(500).json({ error: error.message });
  }
});

// Simplified route to get clips for a payment
router.get('/dashboard/payment-clips/:discordId/:discordGuildId', async (req, res) => {
  try {
    const { discordId, discordGuildId } = req.params;
    
    // Get the campaign info
    const campaign = await db.Campaign.findByPk(discordGuildId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Find the payment with all its associated clips in one query
    const payment = await db.Payment.findOne({
      where: {
        userDiscordId: discordId,
        discordGuildId
      },
      include: [{
        model: db.Clip,
        order: [['createdAt', 'DESC']]
      }]
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // If payment exists but no clips are associated with it
    if (!payment.Clips || payment.Clips.length === 0) {
      // Find clips by user and campaign as fallback
      const fallbackClips = await db.Clip.findAll({
        where: {
          userDiscordId: discordId,
          discordGuildId
        },
        order: [['createdAt', 'DESC']]
      });
      
      // Transform clips for response
      const clipsWithEarnings = fallbackClips.map(clip => ({
        id: clip.id,
        url: clip.url,
        views: clip.views,
        rate: campaign.rate,
        earnings: clip.views * campaign.rate,
        createdAt: clip.createdAt
      }));
      
      // Update clips with payment association
      if (fallbackClips.length > 0) {
        await db.Clip.update(
          { paymentId: payment.id },
          { where: { id: fallbackClips.map(clip => clip.id) } }
        );
      }

      return res.json({
        campaignName: campaign.name,
        clips: clipsWithEarnings,
        note: "Associated clips with payment"
      });
    }
    
    // Transform clips with earnings calculation
    const clipsWithEarnings = payment.Clips.map(clip => ({
      id: clip.id,
      url: clip.url,
      views: clip.views,
      rate: campaign.rate,
      earnings: clip.views * campaign.rate,
      createdAt: clip.createdAt
    }));

    res.json({
      campaignName: campaign.name,
      clips: clipsWithEarnings
    });
  } catch (error) {
    console.error('Error fetching payment clips:', error);
    res.status(500).json({ error: 'Failed to fetch payment clips' });
  }
});

export default router; 