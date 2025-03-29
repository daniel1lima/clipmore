import { formatNumber } from './formatting.js';

export const MessageTemplates = {
  // Verification status messages
  verificationSuccess: (platform, username) => ({
    embeds: [{
      title: "✨ Account Verified Successfully ✨",
      description: `Welcome to the ClipMore family! Your ${platform} account (@${username}) is now verified and ready to go. Start sharing your amazing content and track your growth with us!`,
      color: 0x00FF00,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  verificationInProgress: (platform, username) => ({
    embeds: [{
      title: "🎬 Verification In Progress 🎬",
      description: `We're setting up your ${platform} account (@${username}) with ClipMore! You'll receive confirmation once everything is ready.\n\n⏱️ Taking longer than 5 minutes? Try \`/verify-status\` to check progress.\n\n⚡ Still waiting after 15 minutes? Our support team is ready to help - open a ticket in the main ClipMore server.`,
      color: 0xFFA500,
      fields: [
        {
          name: "Platform",
          value: platform,
          inline: true
        },
        {
          name: "Username",
          value: `@${username}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  verificationFailed: (platform, username, verificationCode) => ({
    embeds: [{
      title: "❌ Verification Failed ❌",
      description: `Verification code (${verificationCode}) not found in your ${platform} bio. Please add it and try again.`,
      color: 0xFF0000,
      fields: [
        {
          name: "Platform",
          value: platform,
          inline: true
        },
        {
          name: "Username",
          value: `@${username}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  // Welcome DM message
  welcomeMessage: () => ({
    embeds: [{
      title: "🌟 Welcome to ClipMore! 🌟",
      description: "Your journey with ClipMore begins now! We're excited to help monetize your content across platforms.",
      color: 0x00FF00,
      fields: [
        {
          name: "Getting Started",
          value: "• Explore our channels\n• Check out active opportunities\n• Start uploading and tracking your clips!"
        }
      ],
      timestamp: new Date().toISOString()
    }]
  }),

  // Error messages
  accountNotFound: () => ({
    embeds: [{
      title: "❌ Account Not Found ❌",
      description: "Account not found. Please register this account first using `/register`.",
      color: 0xFF0000,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  generalError: () => ({
    embeds: [{
      title: "❌ Error ❌",
      description: "There was an error checking verification status. Please try again. If this continues happening, please reach out to us by opening a ticket on the main ClipMore server.",
      color: 0xFF0000,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  // Registration messages
  alreadyRegistered: () => ({
    embeds: [{
      title: "✅ Already Registered ✅",
      description: "You are already registered! Use `/add-account` to link some more social media accounts.",
      color: 0x00FF00,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  registrationSuccess: () => ({
    embeds: [{
      title: "👋 Welcome! 👋",
      description: "Your registration was successful.",
      color: 0x00FF00,
      fields: [
        {
          name: "Next Steps",
          value: "Please use `/add-account` in the '#command-center' channel to link your social media accounts."
        }
      ],
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  // Add new upload-related templates
  noVerifiedAccounts: () => ({
    embeds: [{
      title: "❌ Upload Failed - Account Verification Needed ❌",
      description: "You'll need at least one verified social media account to upload clips. Run `/add-account` in the `#command-center`channel to connect your platforms and join the ClipMore ecosystem.",
      color: 0xFF0000,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  uploadResults: (results, errors) => {
    const successCount = results.length;
    const errorCount = errors.length;
    
    const getPlatformEmoji = (platform) => {
      const emojis = {
        'YouTube': '📺',
        'TikTok': '🎵',
        'Instagram': '📸',
        'Twitter': '🐦',
        'default': '🎯'
      };
      return emojis[platform] || emojis.default;
    };
    
    // Create success table if there are successful uploads
    const successTable = results.length > 0 
      ? results.map(({platform, url}, index) => (
          `• ${getPlatformEmoji(platform)} ${platform} ┊ [View Content ${index + 1}](${url})`
        )).join('\n')
      : '';

    // Format errors with more detailed bullet points
    const errorList = errors.length > 0 ?
      errors.map(error => `❌ ${error}`).join('\n') : '';

    // Prepare fields based on whether there are successful uploads
    const fields = [];
    
    if (successTable) {
      fields.push({
        name: "Upload Status",
        value: successTable,
        inline: false
      });
      fields.push({
        name: "",
        value: "\n",
        inline: false
      });
    }
    
    if (errorList) {
      fields.push({
        name: "Issues to Resolve",
        value: errorList,
        inline: false
      });
      fields.push({
        name: "",
        value: "\n",
        inline: false
      });
    }
    
    // Only add "What's Next" section if there were successful uploads
    if (successCount > 0) {
      fields.push({
        name: "📱 What's Next?",
        value: "• Your content metrics are now being tracked\n• Check performance with `/stats`\n",
        inline: false
      });
    }

    // Create appropriate description based on results
    let description;
    if (successCount > 0) {
      description = `${successCount} upload${successCount !== 1 ? 's' : ''} completed${errorCount ? ` • ${errorCount} need${errorCount === 1 ? 's' : ''} attention` : '!'}\n\n🔍 We're now tracking your content performance across platforms. Use \`/stats\` to check your metrics anytime!`;
    } else {
      description = `No uploads were successful. ${errorCount} error${errorCount !== 1 ? 's' : ''} found.`;
    }

    return {
      embeds: [{
        title: "📊 Content Upload Summary 📊",
        description: description,
        color: errors.length === 0 ? 0x00FF00 : (results.length > 0 ? 0xFFA500 : 0xFF0000),
        fields: fields,
        timestamp: new Date().toISOString()
      }],
      flags: 64
    };
  },

  uploadError: () => ({
    embeds: [{
      title: "❌ Upload Error ❌",
      description: "There was an error processing your upload. Please try again.",
      color: 0xFF0000,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  uploadProcessing: (clipCount) => ({
    embeds: [{
      title: "🔄 Processing Uploads 🔄",
      description: `Processing ${clipCount} clip${clipCount > 1 ? 's' : ''}. You'll receive a DM from the ClipMore Bot when complete.`,
      color: 0xFFA500,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  // Add new campaign-related templates
  campaignCreationInProgress: () => ({
    data: {
      content: 'Creating campaign...',
      flags: 64
    }
  }),

  campaignAnnouncement: (campaign, iconURL) => ({
    embeds: [{
      title: '🌟 NEW OPPORTUNITY ALERT 🌟',
      description: '```diff\n+ Limited Time Clipping Campaign!\n```',
      color: 0x2b2d31, // Discord dark theme color
      fields: [
        {
          name: '📢 Campaign',
          value: `**${campaign.name}**\n━━━━━━━━━━━━━━━━`,
          inline: false
        },
        {
          name: '💰 Payrate',
          value: `**$${campaign.rate * 1000000} per 1M views**\n*Payouts begin at 100k views*`,
          inline: false
        },
        ...(campaign.description ? [{
          name: '📝 Campaign Details',
          value: `>>> ${campaign.description}`,
          inline: false
        }] : []),
        ...(campaign.endDate ? [{
          name: '⏰ Available Until',
          value: `<t:${Math.floor(campaign.endDate.getTime() / 1000)}:F>`,
          inline: false
        }] : [])
      ],
      thumbnail: {
        url: iconURL || 'https://drive.usercontent.google.com/download?id=1Aq7kl39paKgFaxqiNAjRcRPw7QoQfGSM'
      },
      footer: {
        text: `Campaign Reference: ${campaign.id} • ClipMore`,
      },
      timestamp: new Date()
    }],
    components: [{
      type: 1,
      components: [{
        type: 2,
        style: 5, // Link button style
        label: '🚀 Join Campaign',
        url: campaign.serverUrl
      }]
    }]
  }),

  campaignCreationSuccess: (name, id, status) => ({
    content: `Campaign "${name}" created successfully!\nID: ${id}\nStatus: ${status}`
  }),

  campaignCreationError: () => ({
    content: 'There was an error creating the campaign. Please try again.'
  }),

  noCampaignFound: () => ({
    embeds: [{
      title: "❌ No Active Campaign Found ❌",
      description: "There is no active campaign in this server. Please contact an administrator if you think this is an error.",
      color: 0xFF0000,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  campaignNotActive: () => ({
    embeds: [{
      title: "❌ Campaign Not Active ❌",
      description: "The campaign is not active. Please contact an administrator if you think this is an error.",
      color: 0xFF0000,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  campaignAnnouncementError: () => ({
    content: 'Campaign created but failed to post announcement.'
  }),

  invalidEndDate: () => ({
    content: 'Invalid end date format. Please use YYYY-MM-DD'
  }),

  // Add account messages
  accountAlreadyRegistered: (platform, username) => ({
    embeds: [{
      title: "⚠️ Account Already Registered ⚠️",
      description: "You have already registered this account. Use `/verify-status` to check verification.",
      color: 0xFFA500,
      fields: [
        {
          name: "Platform",
          value: platform,
          inline: true
        },
        {
          name: "Username",
          value: `@${username}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  accountAlreadyClaimed: (platform, username) => ({
    embeds: [{
      title: "❌ Account Already Claimed ❌",
      description: "This account has already been registered by another user. Please try again with a different account.",
      color: 0xFF0000,
      fields: [
        {
          name: "Platform",
          value: platform,
          inline: true
        },
        {
          name: "Username",
          value: `@${username}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  noUserFound: () => ({
    embeds: [{
      title: "❌ User Not Found ❌",
      description: "We couldn't find this user in our system. Please make sure you're registered with ClipMore.",
      color: 0xFF0000,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  noClipsFound: () => ({
    embeds: [{
      title: "📭 No Clips Found",
      description: "You haven't uploaded any clips yet! Use `/upload` in the `#command-center` channel to start tracking your content.",
      color: 0xFFA500,
      fields: [
        {
          name: "Getting Started",
          value: "1. Go to `#command-center`\n2. Use `/upload`\n3. Follow the prompts to add your content"
        }
      ],
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  statsPanel: (stats, totalStats, activeCampaign) => {
    const platformEmojis = {
      'INSTAGRAM': '📸',
      'TIKTOK': '🎵',
      'YOUTUBE': '📺',
      'X': '🐦'
    };

    return {
      embeds: [
        // Main embed
        {
          title: "📊 Your Content Statistics",
          color: 0x2b2d31, // Discord dark theme color
          description: "Overview of your performance across all platforms",
          timestamp: new Date().toISOString(),
          footer: {
            text: 'ClipMore Stats • Updated'
          }
        },
        // Platform Stats embed
        {
          title: "🎯 Platform Breakdown",
          color: 0x5865f2, // Discord blurple
          fields: stats.map(stat => ({
            name: `${platformEmojis[stat.platform] || '🎯'} ${stat.platform}`,
            value: [
              `**Username:** @${stat.username}`,
              `**Clips:** ${stat.clipCount}`,
              `**Views:** ${formatNumber(stat.totalViews)}`,
              `**Likes:** ${formatNumber(stat.totalLikes)}`
            ].join('\n'),
            inline: true
          })),
        },
        // Overall Stats embed
        {
          title: "📈 Overall Performance",
          color: 0x57f287, // Discord green
          description: [
            `**Total Clips:** ${totalStats.clipCount}`,
            `**Total Views:** ${formatNumber(totalStats.totalViews)}`,
            `**Total Likes:** ${formatNumber(totalStats.totalLikes)}`
          ].join('\n')
        },
        // Earnings embed
        {
          title: "💰 Earnings Information",
          color: 0xfee75c, // Discord yellow
          description: activeCampaign
            ? [
                `**Estimated Earnings:** $${(totalStats.totalViews * activeCampaign.rate).toFixed(2)}`,
                `**Current Rate:** $${activeCampaign.rate} per view`,
                activeCampaign.maxPayout ? `**Maximum Payout:** $${activeCampaign.maxPayout}` : '',
                '',
                `*Campaign: ${activeCampaign.name}*`
              ].filter(Boolean).join('\n')
            : '*No active campaign found*'
        }
      ],
      flags: 64 // Ephemeral message
    };
  },

  campaignMaxPayoutReached: (campaign) => ({
    embeds: [{
      title: "🚨 Campaign Payout Limit Approaching 🚨",
      description: "```diff\n- Campaign Automatically Paused\n```",
      color: 0xFF0000, // Red color for urgency
      fields: [
        {
          name: "📢 Campaign Details",
          value: [
            `**Name:** ${campaign.name}`,
            `**ID:** ${campaign.id}`,
            `**Total Views:** ${formatNumber(campaign.totalViews)}`,
            `**Rate:** $${campaign.rate} per view`,
            `**Current Earnings:** $${(campaign.totalViews * campaign.rate).toFixed(2)}`,
            `**Max Payout:** $${campaign.maxPayout}`
          ].join('\n'),
          inline: false
        },
        {
          name: "ℹ️ Status Update",
          value: [
            "The campaign has been automatically paused as it's approaching the maximum payout limit.",
            "",
            "**Actions Required:**",
            "• Review current engagement metrics",
            "• Adjust campaign settings if needed",
            "• Contact support for assistance"
          ].join('\n'),
          inline: false
        }
      ],
      footer: {
        text: "ClipMore Campaign Alert • Auto-Paused"
      },
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),
}; 