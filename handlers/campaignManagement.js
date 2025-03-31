import { InteractionResponseType } from 'discord-interactions';
import db from '../models/index.js';
import { CampaignStatus } from '../models/Campaign.js';
export async function handlePauseCampaign(req, res, guild, member, options) {

  try {
    const campaign = await db.Campaign.findByPk(guild.id);

    if (!campaign) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Campaign not found.',
          flags: 64
        }
      });
    }

    campaign.status = CampaignStatus.PAUSED;
    await campaign.save();

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Campaign "${campaign.name}" has been paused.`,
        flags: 64
      }
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error pausing the campaign. Please try again later.',
        flags: 64
      }
    });
  }
}

export async function handleEndCampaign(req, res, guild, member, options) {

  try {
    const campaign = await db.Campaign.findByPk(guild.id);

    if (!campaign) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Campaign not found.',
          flags: 64
        }
      });
    }

    campaign.status = CampaignStatus.COMPLETED;
    campaign.endDate = new Date();
    await campaign.save();

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Campaign "${campaign.name}" has been completed.`,
        flags: 64
      }
    });
  } catch (error) {
    console.error('Error ending campaign:', error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error ending the campaign. Please try again later.',
        flags: 64
      }
    });
  }
}

export async function handleStartCampaign(req, res, guild, member, options) {

  try {
    const campaign = await db.Campaign.findByPk(guild.id);

    if (!campaign) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Campaign not found.',
          flags: 64
        }
      });
    }

    campaign.status = CampaignStatus.ACTIVE;
    await campaign.save();

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Campaign "${campaign.name}" has been started.`,
        flags: 64
      }
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error starting the campaign. Please try again later.',
        flags: 64
      }
    });
  }
}

export async function handleUpdateCampaign(req, res, guild, member, options) {
  const field = options.find(opt => opt.name === 'field')?.value;
  const value = options.find(opt => opt.name === 'value')?.value;

  try {
    const campaign = await db.Campaign.findByPk(guild.id);

    if (!campaign) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Campaign not found.',
          flags: 64
        }
      });
    }

    // Handle different field types
    switch (field) {
      case 'rate':
      case 'maxPayout':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Please provide a valid number.',
              flags: 64
            }
          });
        }
        campaign[field] = numValue;
        break;
      case 'endDate':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Please provide a valid date in YYYY-MM-DD format.',
              flags: 64
            }
          });
        }
        campaign[field] = date;
        break;
      default:
        campaign[field] = value;
    }

    await campaign.save();

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Successfully updated campaign "${campaign.name}" ${field} to: ${value}`,
        flags: 64
      }
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error updating the campaign. Please try again later.',
        flags: 64
      }
    });
  }
} 