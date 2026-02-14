/**
 * Smart Photo Frame - Production Version
 * English only, gradient theme, improved descriptions
 */

const SIZES = {
  'portrait': { width: 1200, height: 1600, label: 'Portrait (1200×1600)' },
  'landscape': { width: 1600, height: 1200, label: 'Landscape (1600×1200)' },
  'small_portrait': { width: 480, height: 800, label: 'Small Portrait (480×800)' },
  'small_landscape': { width: 800, height: 480, label: 'Small Landscape (800×480)' },
  'square': { width: 1600, height: 1600, label: 'Square (1600×1600)' }
};

const INTERVALS = {
  3600: '1 hour',
  21600: '6 hours',
  43200: '12 hours',
  86400: '1 day',
  604800: '1 week'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    try {
      if (url.pathname === '/') return handleHome(request, env);
      if (url.pathname === '/app') return handleApp(request, env);
      if (url.pathname === '/api/feeds') return handleApiFeeds(request, env);
      if (url.pathname === '/api/feed/create') return handleCreateFeed(request, env);
      if (url.pathname === '/api/feed/update') return handleUpdateFeed(request, env);
      if (url.pathname === '/api/feed/delete') return handleDeleteFeed(request, env);
      if (url.pathname === '/api/feed/refresh') return handleRefreshFeed(request, env);
      if (url.pathname === '/photo') return handlePhoto(request, env);
      
      return new Response('404', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(updateAllFeeds(env).catch(() => {}));
  }
};

function getUserToken(request) {
  const url = new URL(request.url);
  return url.searchParams.get('token') || 'default';
}

function getUserKey(token, key) {
  return `user_${token}_${key}`;
}

async function handleHome(request, env) {
  return new Response(getWelcomeHTML(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function handleApp(request, env) {
  return new Response(getAppHTML(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function handleApiFeeds(request, env) {
  const token = getUserToken(request);
  const feedsJson = await env.PHOTO_KV.get(getUserKey(token, 'feeds')) || '[]';
  return new Response(feedsJson, {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleCreateFeed(request, env) {
  const token = getUserToken(request);
  const body = await request.json();
  const { albumUrl, interval, size, name } = body;

  if (!albumUrl) {
    return new Response(JSON.stringify({ error: 'No album URL' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const feedId = crypto.randomUUID();
  const feedsJson = await env.PHOTO_KV.get(getUserKey(token, 'feeds')) || '[]';
  const feeds = JSON.parse(feedsJson);

  try {
    const photos = await fetchPhotosFromAlbum(albumUrl, size);
    
    if (photos.length === 0) {
      throw new Error('No media found in album');
    }
    
    const currentPhoto = photos[Math.floor(Math.random() * photos.length)];

    const newFeed = {
      id: feedId,
      name: name || 'Unnamed Feed',
      albumUrl,
      interval: parseInt(interval) || 3600,
      size,
      photos,
      currentPhoto,
      lastUpdate: new Date().toISOString(),
      photoCount: photos.length
    };

    feeds.push(newFeed);
    await env.PHOTO_KV.put(getUserKey(token, 'feeds'), JSON.stringify(feeds));

    return new Response(JSON.stringify(newFeed), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleUpdateFeed(request, env) {
  const token = getUserToken(request);
  const body = await request.json();
  const { feedId, name, interval, size } = body;

  const feedsJson = await env.PHOTO_KV.get(getUserKey(token, 'feeds')) || '[]';
  const feeds = JSON.parse(feedsJson);
  const feed = feeds.find(f => f.id === feedId);

  if (!feed) {
    return new Response(JSON.stringify({ error: 'Feed not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (name) feed.name = name;
  if (interval) feed.interval = parseInt(interval);
  if (size && size !== feed.size) {
    feed.size = size;
    const sizeConfig = SIZES[size];
    feed.photos = feed.photos.map(url => {
      const baseUrl = url.split('=')[0];
      return `${baseUrl}=w${sizeConfig.width}-h${sizeConfig.height}-c`;
    });
    feed.currentPhoto = feed.photos[Math.floor(Math.random() * feed.photos.length)];
  }

  await env.PHOTO_KV.put(getUserKey(token, 'feeds'), JSON.stringify(feeds));

  return new Response(JSON.stringify(feed), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleDeleteFeed(request, env) {
  const url = new URL(request.url);
  const token = getUserToken(request);
  const feedId = url.searchParams.get('id');

  const feedsJson = await env.PHOTO_KV.get(getUserKey(token, 'feeds')) || '[]';
  const feeds = JSON.parse(feedsJson);
  const filtered = feeds.filter(f => f.id !== feedId);

  await env.PHOTO_KV.put(getUserKey(token, 'feeds'), JSON.stringify(filtered));

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleRefreshFeed(request, env) {
  const url = new URL(request.url);
  const token = getUserToken(request);
  const feedId = url.searchParams.get('id');

  const feedsJson = await env.PHOTO_KV.get(getUserKey(token, 'feeds')) || '[]';
  const feeds = JSON.parse(feedsJson);
  const feed = feeds.find(f => f.id === feedId);

  if (!feed) {
    return new Response(JSON.stringify({ error: 'Feed not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const randomPhoto = feed.photos[Math.floor(Math.random() * feed.photos.length)];
  feed.currentPhoto = randomPhoto;
  feed.lastUpdate = new Date().toISOString();

  await env.PHOTO_KV.put(getUserKey(token, 'feeds'), JSON.stringify(feeds));

  return new Response(JSON.stringify(feed), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handlePhoto(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const feedId = url.searchParams.get('id');

  if (!feedId || !token) {
    return new Response('Missing parameters', { status: 400 });
  }

  const feedsJson = await env.PHOTO_KV.get(getUserKey(token, 'feeds')) || '[]';
  const feeds = JSON.parse(feedsJson);
  const feed = feeds.find(f => f.id === feedId);

  if (!feed || !feed.currentPhoto) {
    return new Response('Feed not found', { status: 404 });
  }

  return Response.redirect(feed.currentPhoto, 302);
}

async function fetchPhotosFromAlbum(albumUrl, size) {
  const response = await fetch(albumUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Cannot access album (HTTP ${response.status})`);
  }

  const html = await response.text();
  const sizeConfig = SIZES[size] || SIZES.portrait;
  
  const pwPattern = /https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_-]+/g;
  const pwUrls = html.match(pwPattern) || [];
  
  const regularPattern = /https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9_-]{20,}/g;
  const regularUrls = html.match(regularPattern) || [];
  
  const allUrls = [...new Set([...pwUrls, ...regularUrls])];
  
  if (allUrls.length === 0) {
    const anyPattern = /https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>)}\]]+/g;
    const anyUrls = html.match(anyPattern) || [];
    
    if (anyUrls.length > 0) {
      const cleanUrls = anyUrls.map(url => {
        url = url.split('=')[0];
        url = url.replace(/[,;:)\]}>'"]+$/, '');
        return url;
      }).filter(url => url.length > 40);
      
      allUrls.push(...cleanUrls);
    }
  }
  
  if (allUrls.length === 0) {
    throw new Error('No photos found. Make sure album is publicly shared.');
  }
  
  const uniqueUrls = [...new Set(allUrls)];
  const photos = uniqueUrls.map(url => {
    const baseUrl = url.split('=')[0];
    return `${baseUrl}=w${sizeConfig.width}-h${sizeConfig.height}-c`;
  });
  
  return photos;
}

async function updateAllFeeds(env) {
  const list = await env.PHOTO_KV.list({ prefix: 'user_' });
  
  for (const key of list.keys) {
    if (!key.name.endsWith('_feeds')) continue;
    
    const feedsJson = await env.PHOTO_KV.get(key.name);
    if (!feedsJson) continue;
    
    const feeds = JSON.parse(feedsJson);
    const now = Date.now();
    let updated = false;

    for (const feed of feeds) {
      const lastUpdate = new Date(feed.lastUpdate).getTime();
      const intervalMs = feed.interval * 1000;
      
      if (now - lastUpdate >= intervalMs) {
        const randomPhoto = feed.photos[Math.floor(Math.random() * feed.photos.length)];
        feed.currentPhoto = randomPhoto;
        feed.lastUpdate = new Date().toISOString();
        updated = true;
      }
    }

    if (updated) {
      await env.PHOTO_KV.put(key.name, JSON.stringify(feeds));
    }
  }
}

function getWelcomeHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Smart Photo Frame - Random Photos from Google Photos Albums</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: white;
    }
    
    .container { max-width: 900px; margin: 0 auto; padding: 60px 24px; }
    
    .header { text-align: center; margin-bottom: 60px; }
    
    .beta-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      margin-bottom: 20px;
      backdrop-filter: blur(10px);
    }
    
    .logo { font-size: 80px; margin-bottom: 20px; }
    
    h1 { font-size: 48px; margin-bottom: 16px; font-weight: 700; }
    
    .subtitle {
      font-size: 20px;
      opacity: 0.95;
      margin-bottom: 12px;
      line-height: 1.5;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .credits {
      font-size: 14px;
      opacity: 0.8;
      margin-bottom: 40px;
    }
    
    .credits a { color: white; text-decoration: underline; }
    
    .cta-button {
      display: inline-block;
      background: white;
      color: #667eea;
      padding: 16px 48px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      font-size: 18px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      transition: all 0.3s;
    }
    
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.3);
    }
    
    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin: 60px 0;
    }
    
    @media (max-width: 768px) {
      .features { grid-template-columns: repeat(2, 1fr); }
    }
    
    .feature {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 32px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .feature-icon { font-size: 40px; margin-bottom: 16px; }
    .feature h3 { font-size: 20px; margin-bottom: 12px; }
    .feature p { opacity: 0.9; line-height: 1.6; font-size: 15px; }
    
    .how-it-works {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 48px;
      border-radius: 20px;
      margin: 40px 0;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .how-it-works h2 { font-size: 32px; margin-bottom: 32px; text-align: center; }
    
    .steps { display: grid; gap: 24px; }
    
    .step { display: flex; gap: 20px; align-items: start; }
    
    .step-number {
      background: white;
      color: #667eea;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }
    
    .step-content h3 { margin-bottom: 8px; }
    .step-content p { opacity: 0.9; line-height: 1.6; }
    
    .security {
      background: rgba(0, 0, 0, 0.2);
      padding: 32px;
      border-radius: 16px;
      margin: 40px 0;
    }
    
    .security h2 {
      font-size: 24px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .security-content { line-height: 1.8; opacity: 0.95; }
    .security-content strong { display: block; margin-top: 16px; margin-bottom: 8px; }
    
    details { margin-top: 16px; cursor: pointer; }
    
    summary {
      font-weight: 600;
      padding: 12px 0;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    summary::-webkit-details-marker { display: none; }
    summary::before { content: '▶'; font-size: 12px; transition: transform 0.2s; }
    details[open] summary::before { transform: rotate(90deg); }
    
    .tech-details {
      background: rgba(0, 0, 0, 0.2);
      padding: 20px;
      border-radius: 8px;
      margin-top: 12px;
      font-size: 14px;
      line-height: 1.8;
    }
    
    .footer {
      text-align: center;
      margin-top: 60px;
      opacity: 0.8;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="beta-badge">BETA</div>
      <div class="logo">🖼️</div>
      <h1>Smart Photo Frame</h1>
      <p class="subtitle">Get a permanent URL to display random photos from your shared Google Photos album. Perfect for e-ink displays, digital frames, and any screen.</p>
      <p class="credits">🤖 AI Powered • Built for <a href="https://sensecraft.seeed.cc/" target="_blank">SenseCraft HMI</a></p>
      <div style="margin-top: 40px;">
        <a href="/app" class="cta-button">Get Started →</a>
      </div>
    </div>
    
    <div class="features">
      <div class="feature">
        <div class="feature-icon">🔗</div>
        <h3>Simple Setup</h3>
        <p>No OAuth, API keys, or authentication. Just paste a shared album link.</p>
      </div>
      
      <div class="feature">
        <div class="feature-icon">📐</div>
        <h3>Multiple Formats</h3>
        <p>Portrait, landscape, and square formats for any display size.</p>
      </div>
      
      <div class="feature">
        <div class="feature-icon">⏱️</div>
        <h3>Auto-Update</h3>
        <p>Photos change automatically from 1 hour to 1 week intervals.</p>
      </div>
      
      <div class="feature">
        <div class="feature-icon">🔒</div>
        <h3>Privacy First</h3>
        <p>Unique tokens ensure only you access your feeds. No tracking.</p>
      </div>
      
      <div class="feature">
        <div class="feature-icon">🤖</div>
        <h3>AI Powered</h3>
        <p>Built with Claude AI for optimal code quality and UX.</p>
      </div>
      
      <div class="feature">
        <div class="feature-icon">🖥️</div>
        <h3>SenseCraft HMI</h3>
        <p>Optimized formats for SenseCraft HMI displays.</p>
      </div>
    </div>
    
    <div class="how-it-works">
      <h2>How It Works</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>Create Album</h3>
            <p>Open Google Photos, create album with photos only (no videos)</p>
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>Share Link</h3>
            <p>Click "Share", enable link sharing, copy the URL</p>
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>Create Feed</h3>
            <p>Paste link, choose format and update interval</p>
          </div>
        </div>
        
        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3>Get URL</h3>
            <p>Copy feed URL and use on any device or display</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="security">
      <h2>🔒 Privacy & Security</h2>
      <div class="security-content">
        <p>Your privacy matters. Here's how your data is protected:</p>
        
        <strong>🎫 Token-Based Access</strong>
        <p>A unique UUID token is generated on first visit. This token is your key - no passwords needed.</p>
        
        <strong>📱 Multi-Device</strong>
        <p>Feed URLs contain your token, enabling access on any device.</p>
        
        <strong>💾 Isolated Storage</strong>
        <p>Your feeds are stored as <code>user_{token}_feeds</code>. Complete isolation from other users.</p>
        
        <strong>⚠️ Important</strong>
        <p>Save your feed URLs! Anyone with a feed URL can view that feed.</p>
        
        <details>
          <summary>Technical Details</summary>
          <div class="tech-details">
            <strong>Token:</strong> UUID v4 via crypto.randomUUID()<br>
            <strong>Storage:</strong> Cloudflare KV with token-prefixed keys<br>
            <strong>Tracking:</strong> Zero analytics, cookies, or monitoring<br>
            <strong>Access:</strong> Public album URLs only<br>
            <strong>Open Source:</strong> Deploy your own instance
          </div>
        </details>
      </div>
    </div>
    
    <div class="footer">
      <p>Smart Photo Frame • Beta • Open Source • No tracking</p>
    </div>
  </div>
</body>
</html>`;
}

function getAppHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Feeds - Smart Photo Frame</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 24px;
    }
    
    .container { max-width: 1200px; margin: 0 auto; }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      color: white;
    }
    
    .logo { font-size: 48px; margin-bottom: 12px; }
    .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .beta { 
      background: rgba(255,255,255,0.2); 
      padding: 4px 12px; 
      border-radius: 12px; 
      font-size: 11px; 
      font-weight: 600;
      margin-left: 8px;
    }
    .header p { font-size: 16px; opacity: 0.9; margin-bottom: 24px; }
    
    .header-actions { display: flex; gap: 12px; justify-content: center; }
    
    .header-actions .btn-secondary {
      background: rgba(255,255,255,0.2); 
      color: white;
    }
    
    .header-actions .btn-secondary:hover { 
      background: rgba(255,255,255,0.3); 
    }
    
    .btn {
      background: white;
      color: #667eea;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .btn:hover { 
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    }
    .btn-secondary { 
      background: #f5f5f5;
      color: #333;
      box-shadow: none;
    }
    .btn-secondary:hover { 
      background: #e0e0e0;
    }
    .btn-danger { 
      background: #ef4444; 
      color: white; 
      box-shadow: none;
    }
    .btn-danger:hover { background: #dc2626; }
    .btn-sm { padding: 6px 14px; font-size: 13px; }
    
    .feeds-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }
    
    .feed-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.2s;
    }
    
    .feed-card:hover { 
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    }
    
    .feed-thumb {
      width: 100%;
      height: 180px;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .feed-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
    
    .feed-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .feed-meta {
      font-size: 13px;
      color: #666;
      margin-bottom: 12px;
      line-height: 1.8;
    }
    
    .feed-album-link {
      font-size: 12px;
      color: #667eea;
      text-decoration: none;
      display: block;
      margin-bottom: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .feed-album-link:hover { text-decoration: underline; }
    
    .feed-url-box {
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      color: #666;
      word-break: break-all;
      margin-bottom: 16px;
    }
    
    .feed-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .feed-actions .btn { width: 100%; }
    
    .empty-state { 
      text-align: center; 
      padding: 100px 20px;
      color: white;
    }
    .empty-icon { font-size: 80px; margin-bottom: 24px; }
    .empty-state h2 { font-size: 28px; margin-bottom: 12px; }
    .empty-state p { font-size: 16px; margin-bottom: 32px; opacity: 0.9; }
    
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }
    
    .modal.active { display: flex; }
    
    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 520px;
      width: 100%;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .modal-title { font-size: 22px; font-weight: 600; color: #1a1a1a; }
    
    .close-btn {
      background: none;
      border: none;
      color: #999;
      font-size: 28px;
      cursor: pointer;
    }
    
    .close-btn:hover { background: #f5f5f5; border-radius: 4px; }
    
    .warning-box {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #856404;
    }
    
    .form-group { margin-bottom: 20px; }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    input, select {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }
    
    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🖼️</div>
      <h1>Smart Photo Frame <span class="beta">BETA</span></h1>
      <p>My Photo Feeds</p>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" onclick="window.location.href='/'">ℹ️ Info</button>
        <button class="btn btn-sm" onclick="openCreateModal()">+ Add Feed</button>
      </div>
    </div>
    
    <div id="feedsContainer"></div>
  </div>

  <div id="createModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Create Feed</h2>
        <button class="close-btn" onclick="closeModal('createModal')">×</button>
      </div>
      
      <div class="warning-box">⚠️ Use albums with photos only (no videos)</div>

      <form id="createForm" onsubmit="handleCreate(event)">
        <div class="form-group">
          <label>Feed Name</label>
          <input type="text" id="createName" placeholder="My Photos" required>
        </div>

        <div class="form-group">
          <label>Album URL</label>
          <input type="url" id="createUrl" placeholder="https://photos.app.goo.gl/xxxxx" required>
        </div>
        
        <div class="form-group">
          <label>Image Format</label>
          <select id="createSize">
            <option value="portrait">Portrait (1200×1600)</option>
            <option value="landscape">Landscape (1600×1200)</option>
            <option value="small_portrait">Small Portrait (480×800)</option>
            <option value="small_landscape">Small Landscape (800×480)</option>
            <option value="square">Square (1600×1600)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Update Interval</label>
          <select id="createInterval">
            <option value="3600" selected>1 hour</option>
            <option value="21600">6 hours</option>
            <option value="43200">12 hours</option>
            <option value="86400">1 day</option>
            <option value="604800">1 week</option>
          </select>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal('createModal')">Cancel</button>
          <button type="submit" class="btn">Create</button>
        </div>
      </form>
    </div>
  </div>

  <div id="editModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Edit Feed</h2>
        <button class="close-btn" onclick="closeModal('editModal')">×</button>
      </div>

      <form id="editForm" onsubmit="handleEdit(event)">
        <input type="hidden" id="editId">
        
        <div class="form-group">
          <label>Feed Name</label>
          <input type="text" id="editName" required>
        </div>
        
        <div class="form-group">
          <label>Image Format</label>
          <select id="editSize">
            <option value="portrait">Portrait (1200×1600)</option>
            <option value="landscape">Landscape (1600×1200)</option>
            <option value="small_portrait">Small Portrait (480×800)</option>
            <option value="small_landscape">Small Landscape (800×480)</option>
            <option value="square">Square (1600×1600)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Update Interval</label>
          <select id="editInterval">
            <option value="3600">1 hour</option>
            <option value="21600">6 hours</option>
            <option value="43200">12 hours</option>
            <option value="86400">1 day</option>
            <option value="604800">1 week</option>
          </select>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal('editModal')">Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let token = localStorage.getItem('token');
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem('token', token);
    }

    const INTERVALS = ${JSON.stringify(INTERVALS)};

    function openCreateModal() {
      document.getElementById('createModal').classList.add('active');
    }

    function openEditModal(feed) {
      document.getElementById('editId').value = feed.id;
      document.getElementById('editName').value = feed.name;
      document.getElementById('editSize').value = feed.size;
      document.getElementById('editInterval').value = feed.interval;
      document.getElementById('editModal').classList.add('active');
    }

    function closeModal(id) {
      document.getElementById(id).classList.remove('active');
    }

    async function loadFeeds() {
      const container = document.getElementById('feedsContainer');
      container.innerHTML = '<div style="text-align:center;padding:40px;color:white;">Loading...</div>';
      
      try {
        const res = await fetch('/api/feeds?token=' + token);
        const feeds = await res.json();
        
        if (feeds.length === 0) {
          container.innerHTML = \`
            <div class="empty-state">
              <div class="empty-icon">📸</div>
              <h2>No feeds yet</h2>
              <p>Create your first photo feed to get started</p>
              <button class="btn" onclick="openCreateModal()">+ Create Feed</button>
            </div>
          \`;
          return;
        }
        
        window.feedsData = feeds;
        
        container.innerHTML = '<div class="feeds-grid">' + feeds.map(f => {
          const url = location.origin + '/photo?token=' + token + '&id=' + f.id;
          const intervalText = INTERVALS[f.interval] || f.interval + 's';
          return \`
            <div class="feed-card">
              <div class="feed-thumb">
                <img src="\${f.currentPhoto}" alt="">
              </div>
              <div class="feed-name">\${f.name}</div>
              <div class="feed-meta">
                <div>📸 \${f.photoCount} photos</div>
                <div>⏱️ Updates: \${intervalText}</div>
                <div>🕐 Updated \${formatTime(f.lastUpdate)}</div>
              </div>
              <a href="\${f.albumUrl}" target="_blank" class="feed-album-link">🔗 View album</a>
              <div class="feed-url-box">\${url}</div>
              <div class="feed-actions">
                <button class="btn btn-sm" onclick="copy('\${f.id}')" id="copy-\${f.id}">Copy URL</button>
                <button class="btn btn-sm" onclick="refresh('\${f.id}')">Refresh</button>
                <button class="btn btn-secondary btn-sm" onclick="edit('\${f.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="del('\${f.id}')">Delete</button>
              </div>
            </div>
          \`;
        }).join('') + '</div>';
      } catch (e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:white;">Error: ' + e.message + '</div>';
      }
    }

    async function handleCreate(e) {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Creating...';
      
      try {
        const data = {
          name: document.getElementById('createName').value,
          albumUrl: document.getElementById('createUrl').value,
          interval: document.getElementById('createInterval').value,
          size: document.getElementById('createSize').value
        };
        
        const res = await fetch('/api/feed/create?token=' + token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
        
        closeModal('createModal');
        document.getElementById('createForm').reset();
        loadFeeds();
      } catch (e) {
        alert('Error: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create';
      }
    }

    async function handleEdit(e) {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      
      try {
        const data = {
          feedId: document.getElementById('editId').value,
          name: document.getElementById('editName').value,
          interval: document.getElementById('editInterval').value,
          size: document.getElementById('editSize').value
        };
        
        const res = await fetch('/api/feed/update?token=' + token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!res.ok) throw new Error('Failed to update');
        
        closeModal('editModal');
        loadFeeds();
      } catch (e) {
        alert('Error: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
      }
    }

    function edit(id) {
      const feed = window.feedsData.find(f => f.id === id);
      if (feed) openEditModal(feed);
    }

    async function refresh(id) {
      event.target.disabled = true;
      await fetch('/api/feed/refresh?token=' + token + '&id=' + id);
      loadFeeds();
    }

    async function del(id) {
      if (!confirm('Delete this feed?')) return;
      await fetch('/api/feed/delete?token=' + token + '&id=' + id);
      loadFeeds();
    }

    function copy(id) {
      const url = location.origin + '/photo?token=' + token + '&id=' + id;
      navigator.clipboard.writeText(url);
      const btn = document.getElementById('copy-' + id);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy URL', 2000);
    }

    function formatTime(iso) {
      const ms = Date.now() - new Date(iso).getTime();
      const m = Math.floor(ms / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return m + 'm ago';
      const h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
    }

    loadFeeds();
    setInterval(loadFeeds, 30000);
  </script>
</body>
</html>`;
}
