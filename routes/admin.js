import express from 'express';
import db from '../models/index.js';
import moment from 'moment';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { testCampaignPayouts } from '../utils/extractMetadata.js';
dotenv.config();

const router = express.Router();

// // Handle clip moderation actions
// router.post('/moderation/:clipId', async (req, res) => {
//   const { clipId } = req.params;
//   const { action, reason } = req.body;

//   try {
//     const clip = await db.Clip.findByPk(clipId);
//     if (!clip) {
//       throw new Error('Clip not found');
//     }

//     const user = await db.User.findByPk(clip.UserId);

//     // Update clip moderation status
//     await db.ClipModeration.update({
//       status: action,
//       reason: reason || null,
//       reviewedAt: new Date()
//     }, {
//       where: { clipId }
//     });

//     // Log the moderation action
//     await Logger.log(LogLevel.AUDIT, LogCategory.CLIP, `Clip ${action.toLowerCase()}`, {
//       clipId,
//       action,
//       reason,
//       clipUrl: clip.url,
//       userId: user?.id,
//       username: user?.username
//     });

//     res.json({ success: true });
//   } catch (error) {
//     console.error('Moderation error:', error);
//     await Logger.log(LogLevel.ERROR, LogCategory.CLIP, 'Moderation action failed', {
//       clipId,
//       error: error.message
//     });
//     res.status(500).json({ error: 'Moderation action failed' });
//   }
// });


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



// API Routes for Dashboard
router.get('/dashboard/stats', async (req, res) => {

  try {
    const DashboardStats = {
      totalCampaigns: await db.Campaign.count(),
      totalViews: await db.Clip.sum('views'),
      totalBudget: await db.Campaign.sum('maxPayout'),
      totalClipperEarnings: await db.Payment.sum('amount', {
        where: {
          status: 'PAID'
        }
      }),
      totalActiveClippers: await db.User.count({
        where: {
          isVerified: true
        }
      }),
    }
    
    res.json(DashboardStats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/dashboard/campaigns', async (req, res) => {
  try {
    const campaigns = await db.Campaign.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    const campaignsWithClipCount = await Promise.all(campaigns.map(async (campaign) => {
      const clipCount = await db.Clip.count({
        where: { discordGuildId: campaign.discordGuildId }
      });
      return { ...campaign.toJSON(), clipCount };
    }));
    res.json(campaignsWithClipCount);
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