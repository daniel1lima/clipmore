import { InteractionResponseType } from 'discord-interactions';
import db from '../models/index.js';
import { formatNumber } from '../utils/formatting.js';
import { Op } from 'sequelize';

export default async function handleLeaderboard(req, res) {
  try {
    // Get all clips with views > 0
    const topClips = await db.Clip.findAll({
      where: {
        views: {
          [Op.gt]: 0
        }
      },
      order: [['views', 'DESC']],
      limit: 5
    });

    // Get additional info for top clips
    const enrichedTopClips = await Promise.all(topClips.map(async (clip) => {
      const account = await db.SocialMediaAccount.findByPk(clip.socialMediaAccountId);
      const user = await db.User.findByPk(account.userId);
      
      return {
        ...clip.dataValues,
        platform: account.platform,
        username: account.username,
        discordId: user.discordId
      };
    }));

    // Get all users and their clips
    const users = await db.User.findAll();
    const userStats = await Promise.all(users.map(async (user) => {
      const accounts = await db.SocialMediaAccount.findAll({
        where: { userId: user.id }
      });

      let totalViews = 0;
      for (const account of accounts) {
        const clips = await db.Clip.findAll({
          where: { socialMediaAccountId: account.id }
        });
        totalViews += clips.reduce((sum, clip) => sum + clip.views, 0);
      }

      return {
        discordId: user.discordId,
        totalViews
      };
    }));

    // Sort users by total views
    const sortedUserStats = userStats
      .filter(stat => stat.totalViews > 0)
      .sort((a, b) => b.totalViews - a.totalViews);

    // Find requesting user's position
    const userIndex = sortedUserStats.findIndex(stat => stat.discordId === req.body.member.user.id);

    const getPlatformEmoji = (platform) => {
      const emojis = {
        'INSTAGRAM': '📸',
        'TIKTOK': '🎵',
        'YOUTUBE': '📺',
        'X': '🐦'
      };
      return emojis[platform] || '🎯';
    };

    const getPositionEmoji = (position) => {
      const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      return emojis[position - 1] || `${position}.`;
    };

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          // Top Users Embed
          {
            title: "👑 Top Content Creators",
            color: 0xfee75c, // Discord yellow
            description: sortedUserStats.slice(0, 5).map((stat, i) => 
              `${getPositionEmoji(i + 1)} <@${stat.discordId}>\n` +
              `┗ ${formatNumber(stat.totalViews)} total views`
            ).join('\n\n'),
            footer: {
              text: "ClipMore Leaderboard • Updated"
            },
            timestamp: new Date().toISOString()
          },
          // User Position Embed (if not in top 5)
          ...(userIndex >= 5 ? [{
            title: "📊 Your Ranking",
            color: 0x57f287, // Discord green
            description: [
              `**Current Position:** #${userIndex + 1} of ${sortedUserStats.length}`,
              `**Total Views:** ${formatNumber(sortedUserStats[userIndex].totalViews)}`,
              '',
              sortedUserStats[userIndex - 1] ? 
                `**Views to Next Rank:** ${formatNumber(sortedUserStats[userIndex - 1].totalViews - sortedUserStats[userIndex].totalViews)}` : '',
              sortedUserStats[userIndex + 1] ?
                `**Lead Over Next:** ${formatNumber(sortedUserStats[userIndex].totalViews - sortedUserStats[userIndex + 1].totalViews)}` : ''
            ].filter(Boolean).join('\n')
          }] : []),
          // Top Clips Embed
          {
            title: "🔥 Trending Content",
            color: 0x5865f2, // Discord blurple
            description: enrichedTopClips.map((clip, i) => 
              `${getPositionEmoji(i + 1)} [${getPlatformEmoji(clip.platform)} View Clip](${clip.url})\n` +
              `┣ **Creator:** <@${clip.discordId}>\n` +
              `┣ **Platform:** ${clip.platform}\n` +
              `┗ **Views:** ${formatNumber(clip.views)}`
            ).join('\n\n')
          }
        ]
      }
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error fetching the leaderboard. Please try again.'
      }
    });
  }
} 