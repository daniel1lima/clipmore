import { InteractionResponseType } from 'discord-interactions';
import db from '../models/index.js';

export async function handleMyAccounts(req, res, member) {
  try {
    const discordId = member.user.id;
    
    // Find user and include their social media accounts
    const user = await db.User.findByPk(discordId);

    if (!user) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "You haven't registered yet. Please use `/register` to get started!",
          flags: 64
        }
      });
    }

    const socialMediaAccounts = await db.SocialMediaAccount.findAll({
      where: { userDiscordId: user.discordId }
    });

    // Group accounts by platform
    const accounts = socialMediaAccounts || [];
    if (accounts.length === 0) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "You don't have any social media accounts linked yet. Use `/add-account` in the '#command-center' channel to link one!",
          flags: 64
        }
      });
    }

    // Format accounts by platform
    const platformEmojis = {
      'INSTAGRAM': '📸',
      'TIKTOK': '🎵',
      'YOUTUBE': '🎥',
      'X': '🐦'
    };

    const accountsList = accounts.map(account => {
      const emoji = platformEmojis[account.platform] || '📱';
      const verificationStatus = account.isVerified ? '✅ Verified' : '❌ Not verified';
      return `${emoji} **${account.platform}**\n• Username: \`${account.username}\`\n• Status: ${verificationStatus}`;
    }).join('\n\n');

    // Format payment information
    const paymentInfo = user.paypalEmail 
      ? `**PayPal Email:** ||${maskEmail(user.paypalEmail)}||`
      : '❌ No PayPal email set. Use `/add-paypal` to set up payments.';

    const response = {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [
          {
            title: '🔗 Your Linked Social Media Accounts',
            description: accountsList,
            color: 0x3498db,
            footer: {
              text: 'Use /add-account in the #command-center channel to link more accounts'
            }
          },
          {
            title: '💰 Payment Information',
            description: paymentInfo,
            color: 0x2ecc71, // Green color for payment section
            footer: {
              text: 'Your PayPal email is hidden for security. Click to reveal.'
            }
          }
        ],
        flags: 64
      }
    };

    return res.send(response);
  } catch (error) {
    console.error('Error in handleMyAccounts:', error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error fetching your accounts. Please try again later.',
        flags: 64
      }
    });
  }
}

// Helper function to mask email
function maskEmail(email) {
  if (!email) return '';
  const [username, domain] = email.split('@');
  const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
  return `${maskedUsername}@${domain}`;
}

export default handleMyAccounts;