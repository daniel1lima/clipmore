import db from '../models/index.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { InteractionResponseType } from 'discord-interactions';

export default async function handleMyClips(req, res, member) {
  const user = await db.User.findOne({
    where: { discordId: member.user.id }
  });

  if (!user) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: MessageTemplates.noUserFound()
    });
  }

  const clips = await db.Clip.findAll({
    where: { UserId: user.id },
  });

  console.log(clips.map(clip => clip.toJSON()));

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

  // Helper function to get platform-specific colors
  function getPlatformColor(platform) {
    const colors = {
      'Twitch': 0x9146FF,
      'YouTube': 0xFF0000,
      'TikTok': 0x000000,
      'Instagram': 0x000000,
      'default': 0x5865F2
    };
    return colors[platform] || colors.default;
  }


  const embeds = Object.entries(clipsByPlatform).map(([platform, clips]) => {
    return {
      title: `${platform} Clips Collection`,
      description: clips.map((clip, index) => (
        `**${index + 1}.** [Watch Clip](${clip.url}) ${clip.title ? `• *${clip.title}*` : ''}`
      )).join('\n\n'),
      color: getPlatformColor(platform),
      timestamp: new Date().toISOString()
    };
  });

  

  

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: embeds,
      flags: 64
    }
  });
}
