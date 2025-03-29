import http from 'https';

export async function verifyPlatformAccount(platform, username, code) {
  // This would need to be implemented based on each platform's API
  // or using a scraping solution
  switch (platform) {
    case 'INSTAGRAM':
      return {
        isVerified: await verifyInstagram(username, code)
      };
    case 'TIKTOK':
      return {
        isVerified: await verifyTikTok(username, code)
      };
    case 'YOUTUBE':
      const result = await verifyYouTube(username, code);
      return {
        isVerified: result.success,
        ytChannelId: result.ytChannelId
      };
    case 'X':
      return {
        isVerified: await verifyX(username, code)
      };
    default:
      throw new Error('Unsupported platform');
  }
}

async function verifyInstagram(username, code) {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        method: 'GET',
        hostname: 'real-time-instagram-scraper-api1.p.rapidapi.com',
        port: null,
        path: `/v1/user_info?username_or_id=${username}`,
        headers: {
          'x-rapidapi-key': process.env.X_API_KEY,
          'x-rapidapi-host': 'real-time-instagram-scraper-api1.p.rapidapi.com'
        }
      };
      
      const req = http.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const userData = JSON.parse(body.toString());
            const bio = userData.data.biography;
            console.log(bio);
            resolve(bio.includes(code));
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Request error:', error);
        resolve(false);
      });

      req.end();
    } catch (error) {
      console.error('Instagram verification failed:', error);
      resolve(false);
    }
  });
}

function verifyTikTok(username, code) {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        method: 'GET',
        hostname: 'tiktok-api23.p.rapidapi.com',
        port: null,
        path: `/api/user/info?uniqueId=${encodeURIComponent(username)}`,
        headers: {
          'x-rapidapi-key': process.env.X_API_KEY,
          'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
        }
      };
      
      const req = http.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const userData = JSON.parse(body.toString());
            
            // Check if we have valid user data and signature
            if (userData.userInfo?.user?.signature) {
              const bio = userData.userInfo.user.signature;
              console.log('TikTok bio:', bio);
              resolve(bio.includes(code));
            } else {
              console.error('Invalid TikTok API response structure:', userData);
              resolve(false);
            }
          } catch (parseError) {
            console.error('Error parsing TikTok response:', parseError);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error('TikTok request error:', error);
        resolve(false);
      });

      req.end();
    } catch (error) {
      console.error('TikTok verification failed:', error);
      resolve(false);
    }
  });
}

function verifyYouTube(username, code) {
  return new Promise((resolve, reject) => {
    try {
      // Remove @ if user included it
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
      
      // Construct full YouTube URL
      const channelUrl = `https://www.youtube.com/@${cleanUsername}`;

      const options = {
        method: 'GET',
        hostname: 'youtube138.p.rapidapi.com',
        port: null,
        path: `/channel/details/?id=${encodeURIComponent(channelUrl)}&hl=en&gl=US`,
        headers: {
          'x-rapidapi-key': process.env.X_API_KEY,
          'x-rapidapi-host': 'youtube138.p.rapidapi.com'
        }
      };
      
      const req = http.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const userData = JSON.parse(body.toString());
            
            if (userData.description && userData.channelId) {
              const description = userData.description;
              resolve({
                success: description.includes(code),
                ytChannelId: userData.channelId
              });
            } else {
              console.error('Invalid YouTube API response structure:', userData);
              resolve({ success: false, ytChannelId: null });
            }
          } catch (parseError) {
            console.error('Error parsing YouTube response:', parseError);
            resolve({ success: false, ytChannelId: null });
          }
        });
      });

      req.on('error', (error) => {
        console.error('YouTube request error:', error);
        resolve({ success: false, ytChannelId: null });
      });

      req.end();
    } catch (error) {
      console.error('YouTube verification failed:', error);
      resolve({ success: false, ytChannelId: null });
    }
  });
}

function verifyX(username, code) {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        method: 'GET',
        hostname: 'real-time-x-com-data-scraper.p.rapidapi.com',
        port: null,
        path: `/v2/UserByScreenName/?username=${encodeURIComponent(username)}`,
        headers: {
          'x-rapidapi-key': process.env.X_API_KEY,
          'x-rapidapi-host': 'real-time-x-com-data-scraper.p.rapidapi.com'
        }
      };
      
      const req = http.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const userData = JSON.parse(body.toString());
            
            // Check if we have valid user data and description
            if (userData.data?.user?.result?.legacy?.description) {
              const bio = userData.data.user.result.legacy.description;
              console.log('X bio:', bio);
              resolve(bio.includes(code));
            } else {
              console.error('Invalid X API response structure:', userData);
              resolve(false);
            }
          } catch (parseError) {
            console.error('Error parsing X response:', parseError);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error('X request error:', error);
        resolve(false);
      });

      req.end();
    } catch (error) {
      console.error('X verification failed:', error);
      resolve(false);
    }
  });
}

