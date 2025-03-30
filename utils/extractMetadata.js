import https from 'https';
import db from '../models/index.js';
import { MessageTemplates } from './messageTemplates.js';
import { sendDM } from './discordManager.js';
import { Logger, LogLevel, LogCategory } from './logger.js';
import client from './discordClient.js';

export const PLATFORM_PATTERNS = {
  INSTAGRAM: {
    REEL: /^https?:\/\/(?:www\.)?instagram\.com\/reels?\/([a-zA-Z0-9_-]+)/,
    POST: /^https?:\/\/(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/
  },
  TIKTOK: {
    VIDEO: /^https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)\/video\/(\d+)/,
    PHOTO: /^https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)\/photo\/(\d+)/,
    SHORT: /^https?:\/\/(?:vm\.)?tiktok\.com\/\w+/
  },
  YOUTUBE: {
    SHORTS: /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    VIDEO: /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/
  },
  X: {
    POST: /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/status\/(\d+)/
  }
};

// Add this helper function
async function expandShortUrl(shortUrl) {
  return new Promise((resolve, reject) => {
    https.get(shortUrl, {
      followRedirect: true,
      maxRedirects: 5
    }, (response) => {
      const finalUrl = response.req.res.responseUrl || response.headers.location || shortUrl;
      console.log(finalUrl);
      resolve(finalUrl);
    }).on('error', (error) => {
      reject(new Error(`Failed to expand shortened URL: ${error.message}`));
    });
  });
}

export async function extractClipMetadata(url, bypass = false) {
  try {

    let processedUrl = url;
    let urlObj = new URL(url);

    // Only expand URL if it's a shortened TikTok URL
    if (PLATFORM_PATTERNS.TIKTOK.SHORT.test(url)) {

      console.log(url);
      processedUrl = await expandShortUrl(url);
      urlObj = new URL(processedUrl);
    }

    
    // Check if clip already exists in database
    const existingClip = await db.Clip.findOne({
      where: { url: processedUrl }
    });

    if (existingClip && !bypass) {
      throw new Error('Clip has already been uploaded');
    }

    // Instagram metadata extraction
    if (urlObj.hostname.includes('instagram.com')) {
      return await extractInstagramMetadata(processedUrl);
    }
    
    // TikTok metadata extraction
    if (urlObj.hostname.includes('tiktok.com')) {
      return await extractTikTokMetadata(processedUrl);
    }
    
    // YouTube metadata extraction
    if (urlObj.hostname.includes('youtube.com')) {
      return await extractYouTubeMetadata(processedUrl);
    }

    if (urlObj.hostname.includes('x.com')) {
      return await extractXMetadata(processedUrl);
    }
    
    throw new Error('Unsupported platform');
  } catch (error) {
    throw new Error(`Failed to extract metadata: ${error.message}`);
  }
}

async function extractInstagramMetadata(url) {
  if (!PLATFORM_PATTERNS.INSTAGRAM.REEL.test(url) && 
      !PLATFORM_PATTERNS.INSTAGRAM.POST.test(url)) {
    throw new Error('URL must be an Instagram reel or post');
  }

  const options = {
    method: 'GET',
    hostname: 'real-time-instagram-scraper-api1.p.rapidapi.com',
    path: `/v1/media_info?code_or_id_or_url=${encodeURIComponent(url)}`,
    headers: {
      'x-rapidapi-key': process.env.X_API_KEY,
      'x-rapidapi-host': 'real-time-instagram-scraper-api1.p.rapidapi.com'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          
          if (!data.data?.items?.[0]) {
            throw new Error('Could not extract metadata from Instagram response');
          }

          const item = data.data.items[0];
          resolve({
            views: item.play_count || item.video_view_count || 0,
            likes: item.like_count || 0,
            platform: 'INSTAGRAM',
            duration: item.video_duration || 0,
            audioClusterId: item.clips_metadata?.music_info?.music_asset_info?.audio_cluster_id,
            author: {
              id: item.owner.id,
              username: item.owner.username,
              nickname: item.owner.full_name
            }
          });
        } catch (error) {
          reject(new Error(`Failed to parse Instagram API response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Instagram API request failed: ${error.message}`));
    });

    req.end();
  });
}

async function extractTikTokMetadata(url) {
  const isVideo = PLATFORM_PATTERNS.TIKTOK.VIDEO.test(url);
  const isPhoto = PLATFORM_PATTERNS.TIKTOK.PHOTO.test(url);

  if (!isVideo && !isPhoto) {
    throw new Error('URL must be a TikTok video or photo');
  }

  const match = url.match(isPhoto ? PLATFORM_PATTERNS.TIKTOK.PHOTO : PLATFORM_PATTERNS.TIKTOK.VIDEO);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid TikTok ${isPhoto ? 'photo' : 'video'} URL`);
  }

  const urlUsername = match[1];
  const contentId = match[2];

  const options = {
    method: 'GET',
    hostname: 'tiktok-api23.p.rapidapi.com',
    path: `/api/post/detail?videoId=${contentId}`,
    headers: {
      'x-rapidapi-key': process.env.X_API_KEY,
      'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          
          if (!data.itemInfo?.itemStruct) {
            throw new Error(`Could not extract metadata from TikTok ${isPhoto ? 'photo' : 'video'} response`);
          }

          const item = data.itemInfo.itemStruct;
          resolve({
            views: parseInt(item.stats.playCount) || 0,
            likes: parseInt(item.stats.diggCount) || 0,
            platform: 'TIKTOK',
            duration: isPhoto ? 0 : (item.video?.duration || 0),
            audioClusterId: item.music?.id,
            author: {
              id: item.author.id,
              username: urlUsername,
              nickname: item.author.nickname
            }
          });
        } catch (error) {
          reject(new Error(`Failed to parse TikTok API response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`TikTok API request failed: ${error.message}`));
    });

    req.end();
  });
}

async function extractYouTubeMetadata(url) {
  if (!PLATFORM_PATTERNS.YOUTUBE.SHORTS.test(url) && 
      !PLATFORM_PATTERNS.YOUTUBE.VIDEO.test(url)) {
    throw new Error('URL must be a YouTube video or short');
  }

  const videoId = url.match(PLATFORM_PATTERNS.YOUTUBE.SHORTS)?.[1] || 
                  url.match(PLATFORM_PATTERNS.YOUTUBE.VIDEO)?.[1];

  if (!videoId) {
    throw new Error('Could not extract video ID from URL');
  }

  const options = {
    method: 'GET',
    hostname: 'youtube138.p.rapidapi.com',
    path: `/video/details?id=${videoId}&hl=en&gl=US`,
    headers: {
      'x-rapidapi-key': process.env.X_API_KEY,
      'x-rapidapi-host': 'youtube138.p.rapidapi.com'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());

          console.log(data);
          
          if (!data.title) {
            throw new Error('Could not extract metadata from YouTube response');
          }

          resolve({
            views: parseInt(data.viewCount) || 0,
            likes: parseInt(data.likeCount) || 0,
            platform: 'YOUTUBE',
            duration: parseInt(data.lengthSeconds) || 0,
            author: {
              id: data.author.channelId,
              username: data.author.channelId,
              nickname: data.author.channelId
            }
          });
        } catch (error) {
          reject(new Error(`Failed to parse YouTube API response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`YouTube API request failed: ${error.message}`));
    });

    req.end();
  });
}

async function extractXMetadata(url) {
  if (!PLATFORM_PATTERNS.X.POST.test(url)) {
    throw new Error('URL must be an X post');
  }

  const match = url.match(PLATFORM_PATTERNS.X.POST);
  if (!match || !match[2]) {
    throw new Error('Invalid X post URL');
  }

  const postId = match[2];

  const options = {
    method: 'GET',
    hostname: 'real-time-x-com-data-scraper.p.rapidapi.com',
    path: `/v2/TweetDetail/?id=${postId}`,
    headers: {
      'x-rapidapi-key': process.env.X_API_KEY,
      'x-rapidapi-host': 'real-time-x-com-data-scraper.p.rapidapi.com'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          
          if (!data.data?.threaded_conversation_with_injections_v2?.instructions?.[0]?.entries?.[0]?.content?.itemContent?.tweet_results?.result) {
            throw new Error('Could not extract metadata from X response');
          }

          const tweet = data.data.threaded_conversation_with_injections_v2.instructions[0].entries[0]
            .content.itemContent.tweet_results.result;

          resolve({
            views: tweet.views?.count || 0,
            likes: parseInt(tweet.legacy?.favorite_count) || 0,
            platform: 'X',
            duration: 0,
            author: {
              id: tweet.core.user_results.result.rest_id,
              username: tweet.core.user_results.result.legacy.screen_name,
              nickname: tweet.core.user_results.result.legacy.name
            }
          });
        } catch (error) {
          reject(new Error(`Failed to parse X API response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`X API request failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Updates metadata for all clips and their associated campaigns
 * @returns {Promise<Object>} Results of the update operation
 */
export async function updateClipsMetadata() {
  const ERROR_THRESHOLD = 3; // Define a threshold for consecutive errors

  try {
    const campaignClips = new Map();
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      viewUpdates: []
    };

    const clips = await db.Clip.findAll();
    
    await Logger.log(LogLevel.INFO, LogCategory.METADATA, 
      `Starting metadata update for ${clips.length} clips`
    );

    for (const clip of clips) {
      try {
        const oldViews = clip.views;
        const metadata = await extractClipMetadata(clip.url, true);
        
        await clip.update({
          views: metadata.views,
          likes: metadata.likes,
          lastMetadataUpdate: new Date(),
          consecutiveErrors: 0 // Reset error counter on success
        });

        const viewDiff = metadata.views - oldViews;
        
        await Logger.log(LogLevel.INFO, LogCategory.CLIP, 'Clip metadata updated', {
          clipId: clip.id,
          url: clip.url,
          oldViews,
          newViews: metadata.views,
          viewDiff,
          campaignId: clip.CampaignId
        });

        // Group clips by campaign
        if (clip.CampaignId) {
          if (!campaignClips.has(clip.CampaignId)) {
            campaignClips.set(clip.CampaignId, []);
          }
          campaignClips.get(clip.CampaignId).push(clip);
        }

        results.success++;
      } catch (error) {
        // Increment consecutive error counter
        await clip.increment('consecutiveErrors');

        // Check if error threshold is exceeded
        if (clip.consecutiveErrors >= ERROR_THRESHOLD) {
          await Logger.log(LogLevel.AUDIT, LogCategory.CLIP, 'Clip deleted due to repeated errors', {
            clipId: clip.id,
            url: clip.url
          });
          await clip.destroy(); // Remove clip from the database
        } else {
          await Logger.log(LogLevel.ERROR, LogCategory.CLIP, 'Failed to update clip metadata', {
            clipId: clip.id,
            url: clip.url,
            error: error.message
          });
        }

        results.failed++;
        results.errors.push({
          url: clip.url,
          error: error.message
        });
        console.error(
          `❌ Error updating clip:\n` +
          `   URL: ${clip.url}\n` +
          `   Error: ${error.message}\n` +
          `${'-'.repeat(50)}`
        );
      }
    }

    // Fetch all campaigns to ensure all are included in the status
    const allCampaigns = await db.Campaign.findAll();
    const campaignStatuses = [];

    for (const campaign of allCampaigns) {
      const clips = campaignClips.get(campaign.id) || [];
      const newTotalViews = clips.reduce((sum, clip) => sum + clip.views, 0);
      const progressPercentage = (newTotalViews / campaign.maxPayout) * 100;
      campaignStatuses.push(`${campaign.name}: ${progressPercentage.toFixed(2)}%`);

      if (clips.length > 0) {
        const oldTotalViews = campaign.totalViews;
        const viewDiff = newTotalViews - oldTotalViews;
        const potentialEarnings = newTotalViews * campaign.rate;

        console.log(
          `Campaign ID: ${campaign.id}\n` +
          `Name: ${campaign.name}\n` +
          `Status: ${campaign.status}\n` +
          `Total Views: ${oldTotalViews.toLocaleString()} → ${newTotalViews.toLocaleString()} (${viewDiff >= 0 ? '+' : ''}${viewDiff.toLocaleString()})\n` +
          `Earnings: $${potentialEarnings.toFixed(2)} / $${campaign.maxPayout}\n` +
          `${'-'.repeat(50)}`
        );

        if (campaign.status === 'ACTIVE' && newTotalViews !== oldTotalViews) {
          await campaign.update({
            totalViews: newTotalViews
          });

          await Logger.log(LogLevel.INFO, LogCategory.CAMPAIGN, 
            'Campaign update', {
              campaignId: campaign.id,
              totalViews: newTotalViews
            }
          );

          if (campaign.maxPayout && potentialEarnings >= campaign.maxPayout - 100) {
            await Logger.log(LogLevel.WARNING, LogCategory.CAMPAIGN, 
              'Campaign approaching max payout - Auto-paused', {
                campaignId: campaign.id,
                currentEarnings: potentialEarnings,
                maxPayout: campaign.maxPayout
              }
            );
            
            await campaign.update({
              status: 'PAUSED',
              updatedAt: new Date()
            });
          }
        }
      }
    }

    // Update bot status with all campaigns' progress
    const statusMessage = campaignStatuses.join(' | ');
    await updateBotDescription('all', statusMessage);

    // Final summary
    console.log('\n📊 Update Summary:\n' + '-'.repeat(50));
    console.log(`Total Clips Processed: ${clips.length}`);
    console.log(`Successful Updates: ${results.success}`);
    console.log(`Failed Updates: ${results.failed}`);
    console.log(`Campaigns Updated: ${campaignClips.size}`);
    console.log('-'.repeat(50) + '\n');

    return {
      ...results,
      campaignsUpdated: Array.from(campaignClips.entries()).map(([id, clips]) => ({
        campaignId: id,
        totalViews: clips.reduce((sum, clip) => sum + clip.views, 0)
      })),
      viewUpdates: results.viewUpdates
    };
  } catch (error) {
    await Logger.log(LogLevel.ERROR, LogCategory.SYSTEM, 
      'Metadata update process failed', {
        error: error.message,
        stack: error.stack
      }
    );
    throw error;
  }
}

// Function to update the bot's status
async function updateBotDescription(campaignId, description) {
  try {
    // Ensure the client is ready
    if (!client.isReady()) {
      console.error('Discord client is not ready');
      return;
    }

    // Set the bot's presence
    client.user.setPresence({
      activities: [{ name: description }],
      status: 'online'
    });

    console.log(`Bot status updated for campaign ${campaignId}: ${description}`);
  } catch (error) {
    console.error(`Failed to update bot status for campaign ${campaignId}: ${error.message}`);
  }
}


