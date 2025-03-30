import { InteractionResponseType } from 'discord-interactions';
import db from '../models/index.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { CampaignStatus } from '../models/Campaign.js';

export default async function handleStats(req, res, member) {
  try {
    // First find the user
    const user = await db.User.findOne({
      where: { discordId: member.user.id }
    });

    console.log(user);

    if (!user) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'No stats available. Please register first!'
        }
      });
    }

    // Then find all their social media accounts
    const accounts = await db.SocialMediaAccount.findAll({
      where: { UserId: user.id }
    });

    console.log(accounts);

    if (!accounts.length) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'No stats available. Please add some social media accounts first!'
        }
      });
    }

    // Get active campaign for the rate
    const activeCampaign = await db.Campaign.findOne({
      where: { 
        discordGuildId: req.body.guild_id
      }
    });

    // Get all clips for each account
    const stats = await Promise.all(accounts.map(async (account) => {
      const clips = await db.Clip.findAll({
        where: { 
          SocialMediaAccountId: account.id,
          CampaignId: activeCampaign.id
        }
      });

      if (clips.length === 0) {
        return null; // Skip accounts with no clips
      }

      const totalViews = clips.reduce((sum, clip) => sum + clip.views, 0);
      const totalLikes = clips.reduce((sum, clip) => sum + clip.likes, 0);
      
      // Calculate earnings based on total views and the campaign rate
      const earnings = totalViews * activeCampaign.rate; // Assuming rate is defined in activeCampaign
      
      return {
        platform: account.platform,
        username: account.username,
        clipCount: clips.length,
        totalViews,
        totalLikes,
        earnings // Include earnings in the stats
      };
    }));

    // Filter out null entries (accounts with no clips)
    const filteredStats = stats.filter(stat => stat !== null);

    const totalStats = filteredStats.reduce((acc, stat) => ({
      clipCount: acc.clipCount + stat.clipCount,
      totalViews: acc.totalViews + stat.totalViews,
      totalLikes: acc.totalLikes + stat.totalLikes,
      totalEarnings: acc.totalEarnings + stat.earnings // Sum up total earnings
    }), { clipCount: 0, totalViews: 0, totalLikes: 0, totalEarnings: 0 });

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: MessageTemplates.statsPanel(filteredStats, totalStats, activeCampaign)
    });

  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error fetching your stats. Please try again.'
      }
    });
  }
} 