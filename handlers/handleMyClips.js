import db from '../models/index.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { InteractionResponseType } from 'discord-interactions';

export default async function handleMyClips(req, res, member) {
  const user = await db.User.findByPk(member.user.id);

  if (!user) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: MessageTemplates.noUserFound()
    });
  }

  const clips = await db.Clip.findAll({
    where: { userDiscordId: user.discordId },
    order: [['createdAt', 'DESC']] // Show newest clips first
  });

  if (clips.length === 0) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: MessageTemplates.noClipsFound()
    });
  }

  const clipsByPlatform = clips.reduce((acc, clip) => {
    const platform = clip.platform;
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(clip);
    return acc;
  }, {});

  // Platform-specific styling
  const platformStyles = {
    'INSTAGRAM': {
      color: 0xE1306C,
      emoji: '📸',
      name: 'Instagram'
    },
    'YOUTUBE': {
      color: 0xFF0000,
      emoji: '📺',
      name: 'YouTube'
    },
    'TIKTOK': {
      color: 0x000000,
      emoji: '🎵',
      name: 'TikTok'
    },
    'X': {
      color: 0x1DA1F2,
      emoji: '🐦',
      name: 'X'
    }
  };

  const embeds = [
    // Main header embed
    {
      title: "📎 Your Content Collection",
      description: `Total Clips: ${clips.length}\nView your uploaded content across all platforms below`,
      color: 0x2b2d31, // Discord dark theme color
      timestamp: new Date().toISOString(),
      footer: {
        text: 'ClipMore Content Library • Updated'
      }
    },
    // Platform-specific embeds
    ...Object.entries(clipsByPlatform).map(([platform, platformClips]) => {
      const style = platformStyles[platform] || { color: 0x5865F2, emoji: '🎯', name: platform };
      
      // Calculate platform stats
      const totalViews = platformClips.reduce((sum, clip) => sum + clip.views, 0);
      const totalLikes = platformClips.reduce((sum, clip) => sum + clip.likes, 0);

      return {
        title: `${style.emoji} ${style.name} Content`,
        description: [
          `**Platform Stats:**`,
          `• Total Clips: ${platformClips.length}`,
          `• Total Views: ${totalViews.toLocaleString()}`,
          `• Total Likes: ${totalLikes.toLocaleString()}`,
          '\n**Your Clips:**',
          ...platformClips.map((clip, index) => (
            `\`${(index + 1).toString().padStart(2, '0')}\` [${clip.views.toLocaleString()} views](${clip.url})` +
            `${clip.title ? ` • *${clip.title}*` : ''}`
          ))
        ].join('\n'),
        color: style.color,
        timestamp: new Date().toISOString()
      };
    })
  ];

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: embeds,
      flags: 64
    }
  });
}
