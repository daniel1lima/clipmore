import { InteractionResponseType } from 'discord-interactions';
import db from '../models/index.js';
import { MessageTemplates } from '../utils/messageTemplates.js';

export default async function handleAddPaypal(req, res, member, options) {
  const email = options.find(opt => opt.name === 'email')?.value;
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Please provide a valid PayPal email address.',
        flags: 64
      }
    });
  }

  try {
    // First check if user exists
    const user = await db.User.findOne({
      where: { discordId: member.user.id }
    });

    if (!user) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: MessageTemplates.noUserFound()
      });
    }

    const hadExistingEmail = user.paypalEmail;
    
    // Update PayPal email for existing user
    user.paypalEmail = email;
    await user.save();

    // Safely display partial email addresses
    const maskEmail = (email) => {
      if (!email) return '';
      const [username, domain] = email.split('@');
      const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
      return `${maskedUsername}@${domain}`;
    };

    const successMessage = hadExistingEmail 
      ? `Successfully updated your PayPal email to ${maskEmail(email)}.`
      : `Successfully added your PayPal email address: ${maskEmail(email)}`;

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: successMessage,
        flags: 64
      }
    });

  } catch (error) {
    console.error('Error adding PayPal email:', error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'There was an error saving your PayPal email. Please try again later.',
        flags: 64
      }
    });
  }
} 