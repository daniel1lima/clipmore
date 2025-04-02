import { InteractionResponseType } from "discord-interactions";
import db from "../models/index.js";

export default async function handleRemoveAccount(req, res, member, options) {
  const platform = options.find((opt) => opt.name === "platform")?.value;
  const username = options.find((opt) => opt.name === "username")?.value;

  try {
    // First find the user
    const user = await db.User.findByPk(member.user.id);

    if (!user) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Please register first using /register",
          flags: 64,
        },
      });
    }

    // Then find their social media account
    const account = await db.SocialMediaAccount.findOne({
      where: {
        platform,
        username,
        userDiscordId: user.discordId // This should match the foreign key in your database
      }
    });

    if (!account) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Account not found or does not belong to you.",
          flags: 64,
        },
      });
    }

    // Delete the account
    await account.destroy();

    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Successfully removed your ${platform} account: ${username}`,
        flags: 64,
      },
    });
  } catch (error) {
    console.error("Error removing account:", error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "There was an error removing your account. Please try again later.",
        flags: 64,
      },
    });
  }
}
