import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
  MessageComponentTypes,
} from 'discord-interactions';
import {
  handleRegister,
  handleAddAccount,
  handleVerifyStatus,
  handleUpload,
  handleStats,
  handleLeaderboard,
  handleTest,
  handleSetupRegister,
  handleMyAccounts,
  handleCreateCampaign,
  handleMyClips,
  handleRemoveAccount,
  handleRemoveClip,
  handleAddPaypal,
  handlePauseCampaign,
  handleEndCampaign,
  handleStartCampaign,
  handleUpdateCampaign
} from './handlers/index.js';
import { scheduleMetadataUpdates, runMetadataUpdate } from './tasks/updateMetadata.js';
import adminRouter from './routes/admin.js';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// Create an express app
const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Add CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080', // Your Next.js app URL
  credentials: true // Allow credentials
}));

app.use('/admin', adminRouter);

// Add root route
// app.get('/', (req, res) => {
//   res.redirect('/admin');
// });

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, data, member, guild } = req.body;
  
  // Silently ignore DMs by returning early if there's no guild
  if (!guild) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Commands can only be used in a server',
        flags: 64
      }
    });
  }

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Add handling for button interactions
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id } = data;
    
    if (custom_id === 'register_button') {
      // Return an ephemeral message (only visible to the user)
      return handleRegister(req, res, guild, member, true);
    }
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    switch (name) {
      case 'test':
        return handleTest(req, res, member);

      case 'register':
        return handleRegister(req, res, guild, member);
      
      case 'add-account':
        return handleAddAccount(req, res, member, options);
      
      case 'verify-status':
        return handleVerifyStatus(req, res, guild, member, options);
      
      case 'upload':
        return handleUpload(req, res, member, options, guild);
      
      case 'stats':
        return handleStats(req, res, member);
      
      case 'leaderboard':
        return handleLeaderboard(req, res);
      
      case 'setup-register':
        // Handle setting up the registration channel
        return handleSetupRegister(req, res, guild);
      
      case 'my-accounts':
        return handleMyAccounts(req, res, member);

      case 'create-campaign':
        return handleCreateCampaign(req, res, guild, member, options);
      
      case 'my-clips':
        return handleMyClips(req, res, member);
      
      case 'remove-account':
        return handleRemoveAccount(req, res, member, options);
      
      case 'remove-clip':
        return handleRemoveClip(req, res, member, options);
      
      case 'add-paypal':
        return handleAddPaypal(req, res, member, options);
      
      case 'pause-campaign':
        return handlePauseCampaign(req, res, guild, member, options);
      
      case 'end-campaign':
        return handleEndCampaign(req, res, guild, member, options);
      
      case 'start-campaign':
        return handleStartCampaign(req, res, guild, member, options);
      
      case 'update-campaign':
        return handleUpdateCampaign(req, res, guild, member, options);
      
      default:
        console.error(`Unknown command: ${name}`);
        return res.status(400).json({ error: 'Unknown command' });
    }
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

// Add error handling for 404s
app.use((req, res, next) => {
  res.status(404).render('error', {
    message: 'Page not found',
    error: {
      status: 404,
      stack: process.env.NODE_ENV === 'development' ? 'Page not found' : ''
    }
  });
});

// Add error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).render('error', {
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start the cron job
scheduleMetadataUpdates();
// runMetadataUpdate()

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
