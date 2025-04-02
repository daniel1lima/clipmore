import { InteractionResponseType } from 'discord-interactions';
import db from '../models/index.js';
import { verifyPlatformAccount } from '../utils/platformVerification.js';
import { addRole } from '../utils/discordManager.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { sendDM } from '../utils/discordManager.js';

export default async function handleVerifyStatus(req, res, guild, member, options) {
  const platform = options.find(opt => opt.name === 'platform').value;
  const username = options.find(opt => opt.name === 'username').value;
  const guildId = guild['id'];

  try {
    const basicUser = await db.User.findByPk(member.user.id);

    const account = await db.SocialMediaAccount.findOne({
      where: { platform, username, userDiscordId: basicUser.discordId }
    });

    if (!basicUser || !account) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: MessageTemplates.accountNotFound()
      });
    }
    
    // If already verified, add role and return success message
    if (account.isVerified) {
      if (!guildId) {
        throw new Error('Guild ID is undefined');
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: MessageTemplates.verificationSuccess(platform, username)
      });
    }

    // If not verified, first send the "in progress" message
    await res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: MessageTemplates.verificationInProgress(platform, username)
    });

    // Then attempt verification (this happens after we've already sent the response)
    const verificationResult = await verifyPlatformAccount(platform, username, account.verificationCode);
    
    if (verificationResult.isVerified) {
      // Update account with verification status and YouTube channel ID if present
      const updateData = { isVerified: true };
      if (platform === 'YOUTUBE' && verificationResult.ytChannelId) {
        updateData.ytChannelId = verificationResult.ytChannelId;
      }
      
      await account.update(updateData);
      await basicUser.update({ isVerified: true });

      await addRole(member.user.id, guildId, process.env[`${platform.toUpperCase()}_ROLE_NAME`], false);

      await sendDM(member.user.id, MessageTemplates.verificationSuccess(platform, username));
    } else {
      await sendDM(member.user.id, MessageTemplates.verificationFailed(platform, username, account.verificationCode));
    }

  } catch (error) {
    console.error('Verification status error:', error);
    if (!res.headersSent) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: MessageTemplates.generalError()
      });
    }
  }
}

