import { InteractionResponseType } from 'discord-interactions';
import db from '../models/index.js';
import { extractClipMetadata } from '../utils/extractMetadata.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { sendDM } from '../utils/discordManager.js';
import { CampaignStatus } from '../models/Campaign.js';

export default async function handleUpload(req, res, member, options, guild) {
  const urlsString = options.find(opt => opt.name === 'urls').value;
  const urls = urlsString.split(',').map(url => url.trim()).slice(0, 10);

  // Send immediate response that we're processing
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: MessageTemplates.uploadProcessing(urls.length)
  });

  try {
    const user = await db.User.findByPk(member.user.id);

    // Check if user exists first
    if (!user) {
      await sendDM(member.user.id, MessageTemplates.noUserFound());
      return;
    }

    // ACTIVE CAMPAIGN ONLY
    const activeCampaign = await db.Campaign.findByPk(guild.id);

    if (!activeCampaign) {
      sendDM(member.user.id, MessageTemplates.noCampaignFound());
      return;
    }

    if (activeCampaign.status !== CampaignStatus.ACTIVE) {
      sendDM(member.user.id, MessageTemplates.campaignNotActive());
      return;
    }

    const socialMediaAccounts = await db.SocialMediaAccount.findAll({
      where: { userDiscordId: user.discordId, isVerified: true }
    });

    if (!user || !socialMediaAccounts.length) {
      sendDM(member.user.id, MessageTemplates.noVerifiedAccounts());
      return;
    }

    const results = [];
    const errors = [];

    for (const url of urls) {
      try {
        // Get all metadata first
        console.log(url);
        const metadata = await extractClipMetadata(url);
        const platform = metadata.platform;
        const clipUsername = metadata.author.username;

        // console.log(metadata);

        // Check if platform is allowed in campaign
        if (!activeCampaign.allowedPlatforms.includes(platform)) {
          errors.push(`Platform ${platform} is not allowed in this campaign: ${url}`);
          continue;
        }

        // Find matching social media account
        const account = socialMediaAccounts.find(acc => {
          if (platform === 'YOUTUBE') {
            // For YouTube, compare channel IDs
            return acc.platform === platform && acc.ytChannelId === metadata.author.id;
          }
          // For other platforms, compare usernames
          return acc.platform === platform && acc.username === clipUsername;
        });

        if (!account) {
          errors.push(`Clip doesn't belong to any of your verified accounts: ${url}`);
          continue;
        }

        // Check audio requirements based on platform
        if (metadata.audioClusterId && activeCampaign.soundURL) {
          // Filter sound URLs by platform
          const platformSoundURLs = activeCampaign.soundURL.filter(soundUrl => {
            if (platform === 'INSTAGRAM') {
              return soundUrl.includes('instagram.com');
            } else if (platform === 'TIKTOK') {
              return soundUrl.includes('tiktok.com');
            }
            return false;
          });

          // Only validate audio if there are sound URLs for this platform
          if (platformSoundURLs.length > 0) {
            const hasMatchingAudio = platformSoundURLs.some(soundUrl => {
              const matches = soundUrl.match(/\d+/);
              return matches && matches[0] === metadata.audioClusterId.toString();
            });

            if (!hasMatchingAudio) {
              errors.push(`Audio not allowed for this ${platform} campaign: ${url}`);
              continue;
            }
          }
        }

        const [clip, created] = await db.Clip.findOrCreate({
          where: {
            url,
            socialMediaAccountId: account.id,
          },
          defaults: {
            platform,
            views: metadata.views,
            likes: metadata.likes,
            discordGuildId: activeCampaign.discordGuildId,
            userDiscordId: user.discordId,
          }
        });
        

        if (created) {
          results.push({
            platform: platform.toString().padEnd(8),
            url: url.length > 50 ? url.substring(0, 47) + '...' : url
          });
        } else {
          errors.push(`Clip has already been uploaded: ${url}`);
        }
      } catch (error) {
        errors.push(`Error processing ${url}: ${error.message}`);
      }
    }

    // Send results via DM
    await sendDM(member.user.id, MessageTemplates.uploadResults(results, errors));

  } catch (error) {
    console.error('Upload error:', error);
    await sendDM(member.user.id, MessageTemplates.uploadError());
  }
}

