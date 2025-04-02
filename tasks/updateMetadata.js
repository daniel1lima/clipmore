import cron from 'node-cron';
import { updateClipsMetadata } from '../utils/extractMetadata.js';
import db from '../models/index.js';

// Run every 2 hours (at minute 0)
export function scheduleMetadataUpdates() {
  // '0 */2 * * *' means: 
  // - 0: at minute 0
  // - */2: every 2 hours
  // - * * *: any day of month, any month, any day of week
  cron.schedule('0 */2 * * *', async () => {
    console.log(`Starting scheduled metadata update at ${new Date().toISOString()}`);
    try {
      const results = await updateClipsMetadata();
      console.log('Scheduled metadata update completed:', {
        timestamp: new Date().toISOString(),
        ...results
      });
    } catch (error) {
      console.error('Scheduled metadata update failed:', {
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });
  
  console.log('Metadata update scheduler initialized - running every 2 hours');
}

async function checkAndCloseCampaign(campaign, clips) {
  const totalSpent = clips.reduce((sum, clip) => {
    return sum + (clip.views * campaign.rate);
  }, 0);

  if (totalSpent >= campaign.maxPayout) {
    // Create payment entries for all users in this campaign
    const userClips = {};
    
    // Group clips by user
    clips.forEach(clip => {
      if (!userClips[clip.userDiscordId]) {
        userClips[clip.userDiscordId] = {
          clips: [],
          totalViews: 0,
          amount: 0
        };
      }
      userClips[clip.userDiscordId].clips.push(clip);
      userClips[clip.userDiscordId].totalViews += clip.views;
      userClips[clip.userDiscordId].amount += clip.views * campaign.rate;
    });

    // Create payment entries for each user
    const paymentPromises = Object.entries(userClips).map(([userDiscordId, data]) => {
      return db.Payment.create({
        userDiscordId,
        discordGuildId: campaign.discordGuildId,
        amount: data.amount,
        totalViews: data.totalViews,
        clipCount: data.clips.length,
        status: 'PENDING'
      });
    });

    await Promise.all([
      // Update campaign status
      db.Campaign.update(
        { status: 'COMPLETED', endDate: new Date() },
        { where: { discordGuildId: campaign.discordGuildId } }
      ),
      // Create payment entries
      ...paymentPromises
    ]);

    console.log(`Campaign ${campaign.name} closed - max payout reached`);
  }
}

export async function runMetadataUpdate() {
  console.log(`Starting manual metadata update at ${new Date().toISOString()}`);
  try {
    const results = await updateClipsMetadata();

    // Check active campaigns for max payout
    const activeCampaigns = await db.Campaign.findAll({
      where: { status: 'ACTIVE' }
    });

    for (const campaign of activeCampaigns) {
      const campaignClips = await db.Clip.findAll({
        where: { discordGuildId: campaign.discordGuildId }
      });
      
      await checkAndCloseCampaign(campaign, campaignClips);
    }

    console.log('Manual metadata update completed:', {
      timestamp: new Date().toISOString(),
      ...results
    });
    return results;
  } catch (error) {
    console.error('Manual metadata update failed:', {
      timestamp: new Date().toISOString(),
      error: error.message
    });
    throw error;
  }
} 