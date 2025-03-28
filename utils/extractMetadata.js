import https from 'https';
import db from '../models/index.js';

export const PLATFORM_PATTERNS = {
  INSTAGRAM: {
    REEL: /^https?:\/\/(?:www\.)?instagram\.com\/reels?\/([a-zA-Z0-9_-]+)/,
    POST: /^https?:\/\/(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/
  },
  TIKTOK: {
    VIDEO: /^https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)\/video\/(\d+)/,
    PHOTO: /^https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)\/photo\/(\d+)/
  },
  YOUTUBE: {
    SHORTS: /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    VIDEO: /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/
  }
};

export async function extractClipMetadata(url, bypass = false) {
  try {
    const urlObj = new URL(url);
    
    // Check if clip already exists in database
    const existingClip = await db.Clip.findOne({
      where: { url }
    });

    if (existingClip && !bypass) {
      throw new Error('Clip has already been uploaded');
    }

    // Instagram metadata extraction
    if (urlObj.hostname.includes('instagram.com')) {
      return await extractInstagramMetadata(url);
    }
    
    // TikTok metadata extraction
    if (urlObj.hostname.includes('tiktok.com')) {
      return await extractTikTokMetadata(url);
    }
    
    // YouTube metadata extraction
    if (urlObj.hostname.includes('youtube.com')) {
      return await extractYouTubeMetadata(url);
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

  // Basic metadata since we're not using YouTube API
  return {
    views: 0,
    likes: 0,
    platform: 'YOUTUBE',
    duration: 0,
    author: {
      username: 'unknown', // Would need YouTube API to get this
      nickname: 'unknown'
    }
  };
}

export async function updateClipsMetadata() {
  try {
    const clips = await db.Clip.findAll();
    console.log(`Starting metadata update for ${clips.length} clips`);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const clip of clips) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        const metadata = await extractClipMetadata(clip.url, true);
        
        await clip.update({
          views: metadata.views,
          likes: metadata.likes,
          lastMetadataUpdate: new Date()
        });

        results.success++;
        console.log(`Updated metadata for clip: ${clip.url}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          url: clip.url,
          error: error.message
        });
        console.error(`Failed to update metadata for ${clip.url}:`, error.message);
      }
    }

    console.log('Metadata update complete:', {
      totalProcessed: clips.length,
      successful: results.success,
      failed: results.failed
    });

    return results;
  } catch (error) {
    console.error('Failed to update clips metadata:', error);
    throw error;
  }
} 