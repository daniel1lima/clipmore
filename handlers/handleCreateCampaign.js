import { InteractionResponseType, InteractionResponseFlags} from 'discord-interactions';
import { SlashCommandBuilder } from '@discordjs/builders';
import db from '../models/index.js';
import client from '../utils/discordClient.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { sendDM } from '../utils/discordManager.js';


export default async function handleCreateCampaign(req, res, guild, member, options) {
  const ANNOUNCEMENT_CHANNEL_ID = '1354216779374792805';
  
  console.log(req.body);
  
  try {
    // Extract all options from the options array

    console.log(options);
    const name = options.find(opt => opt.name === 'name')?.value;
    const description = options.find(opt => opt.name === 'description')?.value;
    const rate = Number(options.find(opt => opt.name === 'rate')?.value);
    const maxPayout = Number(options.find(opt => opt.name === 'max-payout')?.value);
    const serverUrl = options.find(opt => opt.name === 'server-url')?.value;
    const endDateStr = options.find(opt => opt.name === 'end-date')?.value;
    const guildId = options.find(opt => opt.name === 'guild-id')?.value;
    const allowedPlatforms = options.find(opt => opt.name === 'allowed-platforms')?.value;
    const soundURL = options.find(opt => opt.name === 'sound-url')?.value;

    // Parse allowedPlatforms string into an array
    const platformsArray = allowedPlatforms ? allowedPlatforms.split(',').map(p => p.trim()) : ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'X'];
    const soundURLArray = soundURL ? soundURL.split(',').map(p => p.trim()) : [];

    const guild = await client.guilds.fetch(guildId);

    console.log(platformsArray);

    // Send immediate response
    res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Creating campaign...',
        flags: InteractionResponseFlags.EPHEMERAL,
      }
    });

    // Validate end date if provided
    let endDate = null;
    if (endDateStr) {
      endDate = new Date(endDateStr);
      if (isNaN(endDate.getTime())) {
        await sendDM(member.user.id, 'Invalid end date format. Please use YYYY-MM-DD');
        return;
      }
    }

    // Create the campaign
    const campaign = await db.Campaign.create({
      discordGuildId: guildId,
      name,
      description,
      rate,
      maxPayout,
      serverUrl,
      endDate,
      allowedPlatforms: platformsArray,
      status: 'ACTIVE',
      totalViews: 0,
      totalLikes: 0,
      soundURL: soundURLArray
    });

    // Post announcement in the specified channel
    try {
      const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
      await channel.send(MessageTemplates.campaignAnnouncement(campaign, guild.iconURL()));
    } catch (error) {
      console.error('Error posting campaign announcement:', error);
      await sendDM(member.user.id, 'Campaign created but failed to post announcement.');
      return;
    }

    // Send confirmation DM to creator
    await sendDM(member.user.id, `Campaign "${name}" created successfully!\nID: ${campaign.discordGuildId}\nStatus: ${campaign.status}`);

  } catch (error) {
    console.error('Error creating campaign:', error);
    await sendDM(member.user.id, 'There was an error creating the campaign. Please try again.');
  }
}


