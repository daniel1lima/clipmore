export const MessageTemplates = {
  // Verification status messages
  verificationSuccess: (platform, username) => ({
    embeds: [{
      title: "🎉 Verification Successful 🎉",
      description: `Your ${platform} account (@${username}) has been successfully verified! You can now start posting and tracking content from this account.`,
      color: 0x00FF00,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  verificationInProgress: (platform, username) => ({
    embeds: [{
      title: "🔄 Verification In Progress 🔄",
      description: `Your ${platform} account (@${username}) has been added and verification is in progress. You will receive a DM from the ClipMore Bot once verified. If it has been longer than 5 minutes, run \`/verify-status\` again.\n\nIf it has been longer than 15 minutes, please open a ticket on the main ClipMore server.`,
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
      title: "🎉 Welcome to the Server! 🎉",
      description: "You have been successfully verified and granted access to the server.",
      color: 0x00FF00,
      fields: [
        {
          name: "Next Steps",
          value: "Feel free to explore the channels and engage with the community!"
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
          value: "Please use `/add-account` to link your social media accounts."
        }
      ],
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  // Add new upload-related templates
  noVerifiedAccounts: () => ({
    embeds: [{
      title: "❌ Upload Failed ❌",
      description: "You need at least one verified social media account to upload clips. Please add an account by running \`/add-account\` and try again. ",
      color: 0xFF0000,
      timestamp: new Date().toISOString()
    }],
    flags: 64
  }),

  uploadResults: (results, errors) => {
    const successCount = results.length;
    const errorCount = errors.length;
    
    // Create success table if there are successful uploads
    const successTable = results.length > 0 ? 
      "| Platform | URL |\n" +
      "|----------|-----|\n" +
      results.map(({platform, url}) => `| ${platform} | ${url} |`).join('\n') +
      "\n```\n" : '';

    // Format errors with bullet points
    const errorList = errors.length > 0 ?
      "**Errors**\n" + errors.map(error => `• ${error}`).join('\n') : '';

    return {
      embeds: [{
        title: "📤 Upload Results",
        description: `${successCount} successful, ${errorCount} failed`,
        color: errors.length === 0 ? 0x00FF00 : (results.length > 0 ? 0xFFA500 : 0xFF0000),
        fields: [
          ...(successTable ? [{
            name: "Successful Uploads",
            value: successTable,
            inline: false
          }] : []),
          ...(errorList ? [{
            name: "Errors",
            value: errorList,
            inline: false
          }] : [])
        ],
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
  })
}; 