import { InteractionResponseType } from 'discord-interactions';
import db from '../models/index.js';

export default async function handleRemoveClip(req, res, member, options) {
  const url = options.find(opt => opt.name === 'url')?.value;
  
  try {
    // Check if the clip exists and belongs to the user
    const user = await db.User.findByPk(member.user.id);
    let clip;
    
    if (user) {
      clip = await db.Clip.findOne({
        where: {
          url,
          userDiscordId: user.discordId
        }
      });
    } else {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'You are not registered in the database.',
        }
      });
    }

    if (!clip) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Clip not found or does not belong to you.',
          flags: 64
        }
      });
    }

    // Delete the clip
    await clip.destroy();

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Successfully removed your clip.',
        flags: 64
      }
    });

  } catch (error) {
    console.error('Error removing clip:', error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error removing your clip. Please try again later.',
        flags: 64
      }
    });
  }
} 