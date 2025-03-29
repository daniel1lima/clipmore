import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const SETUP_REGISTER_COMMAND = {
  name: 'setup-register',
  description: 'Setup the registration channel with welcome message (Admin only)',
  type: 1,
  default_member_permissions: '8', // Requires administrator permission (8)
};

const REGISTER_COMMAND = {
  name: 'register',
  description: 'Register your social media accounts',
  type: 1,
};

const ADD_ACCOUNT_COMMAND = {
  name: 'add-account',
  description: 'Add a new social media account',
  options: [
    {
      type: 3,
      name: 'platform',
      description: 'Social media platform',
      required: true,
      choices: [
        { name: 'Instagram', value: 'INSTAGRAM' },
        { name: 'TikTok', value: 'TIKTOK' },
        { name: 'YouTube', value: 'YOUTUBE' },
        { name: 'X', value: 'X' }
      ]
    },
    {
      type: 3,
      name: 'username',
      description: 'Your username on the platform',
      required: true
    }
  ],
  type: 1
};

const VERIFY_STATUS_COMMAND = {
  name: 'verify-status',
  description: 'Check verification status of your account',
  options: [
    {
      type: 3,
      name: 'platform',
      description: 'Social media platform',
      required: true,
      choices: [
        { name: 'Instagram', value: 'INSTAGRAM' },
        { name: 'TikTok', value: 'TIKTOK' },
        { name: 'YouTube', value: 'YOUTUBE' },
        { name: 'X', value: 'X' }
      ]
    },
    {
      type: 3,
      name: 'username',
      description: 'Username to check',
      required: true
    }
  ],
  type: 1
};

const UPLOAD_COMMAND = {
  name: 'upload',
  description: 'Upload clips for tracking',
  options: [
    {
      type: 3,
      name: 'urls',
      description: 'Clip URLs (up to 10, separated by commas)',
      required: true
    }
  ],
  type: 1
};

const STATS_COMMAND = {
  name: 'stats',
  description: 'View your engagement metrics',
  type: 1
};

const LEADERBOARD_COMMAND = {
  name: 'leaderboard',
  description: 'View community leaderboard',
  type: 1
};

const MY_ACCOUNTS_COMMAND = {
  name: 'my-accounts',
  description: 'View your registered accounts',
  type: 1
};

const MY_CLIPS_COMMAND = {
  name: 'my-clips',
  description: 'View your clips',
  type: 1
};

const CREATE_CAMPAIGN_COMMAND = {
  name: 'create-campaign',
  description: 'Create a new campaign',
  type: 1,
  default_member_permissions: '8', // Requires administrator permission
  options: [
    {
      type: 3, // STRING type
      name: 'name',
      description: 'Name of the campaign',
      required: true
    },
    {
      type: 10, // NUMBER type (float)
      name: 'rate',
      description: 'Rate per view/like',
      required: true
    },
    {
      type: 10, // NUMBER type (float)
      name: 'max-payout',
      description: 'Maximum payout for the campaign',
      required: true
    },
    {
      type: 3, // STRING type
      name: 'server-url',
      description: 'URL of the server',
      required: true
    },
    {
      type: 3, // STRING type
      name: 'guild-id',
      description: 'ID of the guild',
      required: true
    },
    {
      type: 3, // STRING type
      name: 'sound-url',
      description: 'Sound URL',
      required: false
    },
    {
      type: 3, // STRING type
      name: 'allowed-platforms',
      description: 'Allowed platforms (comma-separated)',
      required: false
    },
    {
      type: 3, // STRING type
      name: 'description',
      description: 'Description of the campaign',
      required: false
    },
    {
      type: 3, // STRING type
      name: 'end-date',
      description: 'End date of the campaign (YYYY-MM-DD)',
      required: false
    }
  ]
};

const REMOVE_ACCOUNT_COMMAND = {
  name: 'remove-account',
  description: 'Remove a social media account',
  options: [
    {
      type: 3,
      name: 'platform',
      description: 'Social media platform',
      required: true,
      choices: [
        { name: 'Instagram', value: 'INSTAGRAM' },
        { name: 'TikTok', value: 'TIKTOK' },
        { name: 'YouTube', value: 'YOUTUBE' },
        { name: 'X', value: 'X' }
      ]
    },
    {
      type: 3,
      name: 'username',
      description: 'Username to remove',
      required: true
    }
  ],
  type: 1
};

const REMOVE_CLIP_COMMAND = {
  name: 'remove-clip',
  description: 'Remove a tracked clip',
  options: [
    {
      type: 3,
      name: 'url',
      description: 'URL of the video to remove',
      required: true
    }
  ],
  type: 1
};

const ADD_PAYPAL_COMMAND = {
  name: 'add-paypal',
  description: 'Add your PayPal email for payments',
  options: [
    {
      type: 3,
      name: 'email',
      description: 'Your PayPal email address',
      required: true
    }
  ],
  type: 1
};

const PAUSE_CAMPAIGN_COMMAND = {
  name: 'pause-campaign',
  description: 'Pause an active campaign (Admin only)',
  type: 1,
  default_member_permissions: '8',
  
};

const END_CAMPAIGN_COMMAND = {
  name: 'end-campaign',
  description: 'End a campaign (Admin only)',
  type: 1,
  default_member_permissions: '8',
};

const START_CAMPAIGN_COMMAND = {
  name: 'start-campaign',
  description: 'Start a paused campaign (Admin only)',
  type: 1,
  default_member_permissions: '8',
};

const UPDATE_CAMPAIGN_COMMAND = {
  name: 'update-campaign',
  description: 'Update campaign fields (Admin only)',
  type: 1,
  default_member_permissions: '8',
  options: [
    {
      type: 3,
      name: 'field',
      description: 'Field to update',
      required: true,
      choices: [
        { name: 'Name', value: 'name' },
        { name: 'Rate', value: 'rate' },
        { name: 'Max Payout', value: 'maxPayout' },
        { name: 'Server URL', value: 'serverUrl' },
        { name: 'Sound URL', value: 'soundUrl' },
        { name: 'Description', value: 'description' },
        { name: 'End Date', value: 'endDate' },
        { name: 'Allowed Platforms', value: 'allowedPlatforms' }
      ]
    },
    {
      type: 3,
      name: 'value',
      description: 'New value for the field',
      required: true
    }
  ]
};

const ALL_COMMANDS = [
  TEST_COMMAND,
  CREATE_CAMPAIGN_COMMAND,
  SETUP_REGISTER_COMMAND,
  REGISTER_COMMAND,
  ADD_ACCOUNT_COMMAND,
  REMOVE_ACCOUNT_COMMAND,
  VERIFY_STATUS_COMMAND,
  UPLOAD_COMMAND,
  REMOVE_CLIP_COMMAND,
  STATS_COMMAND,
  LEADERBOARD_COMMAND,
  MY_ACCOUNTS_COMMAND,
  MY_CLIPS_COMMAND,
  ADD_PAYPAL_COMMAND,
  PAUSE_CAMPAIGN_COMMAND,
  END_CAMPAIGN_COMMAND,
  START_CAMPAIGN_COMMAND,
  UPDATE_CAMPAIGN_COMMAND
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
