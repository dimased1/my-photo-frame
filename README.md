# 🖼️ Smart Photo Frame

**Get a permanent URL to display random photos from your shared Google Photos album.**

Perfect for e-ink displays, digital frames, Raspberry Pi projects, and any screen that needs rotating photos.

![License](https://img.shields.io/badge/license-MIT-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![Status](https://img.shields.io/badge/status-beta-yellow)

---

## ✨ Features

- 🔗 **Zero Setup** - No OAuth, API keys, or authentication required
- 📐 **5 Image Formats** - Portrait, landscape, and square (perfect for any display)
- ⏱️ **Auto-Update** - Photos change automatically (1 hour to 1 week intervals)
- 🔒 **Privacy First** - Token-based isolation, no tracking, no personal data
- 🤖 **AI Powered** - Built with Claude AI for optimal code quality
- 🖥️ **Built for [SenseCraft HMI](https://sensecraft.seeed.cc/)** - Optimized formats

---

## 🚀 Quick Start

### What You Need

1. **Google Photos** account with a shared album
2. **Cloudflare** account (free tier works perfectly)
3. **10 minutes** of your time

### How It Works

1. Share a Google Photos album publicly
2. Paste the album link into the app
3. Get a permanent photo URL (e.g., `https://your-worker.dev/photo?token=xxx&id=yyy`)
4. Use this URL on any device - it returns a random photo from your album

---

## 📦 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is fine)

### Step 1: Install Wrangler CLI

Wrangler is Cloudflare's command-line tool for Workers.

```bash
npm install -g wrangler
```

Verify installation:
```bash
wrangler --version
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate with Cloudflare.

### Step 3: Clone This Repository

```bash
git clone https://github.com/YOUR_USERNAME/smart-photo-frame.git
cd smart-photo-frame
```

Or download the `worker.js` file directly.

### Step 4: Create KV Namespace

KV (Key-Value) storage is where your photo feeds are stored.

```bash
wrangler kv:namespace create "PHOTO_KV"
```

You'll see output like:
```
🌀 Creating namespace with title "smart-photo-frame-PHOTO_KV"
✨ Success!
Add the following to your wrangler.toml:
{ binding = "PHOTO_KV", id = "abc123def456" }
```

**Copy the `id` value** - you'll need it in the next step.

### Step 5: Create Configuration File

Create a file named `wrangler.toml` in the project directory:

```toml
name = "smart-photo-frame"
main = "worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "PHOTO_KV"
id = "abc123def456"  # Replace with YOUR KV namespace ID from Step 4

[triggers]
crons = ["0 * * * *"]  # Updates photos every hour
```

**Important:** Replace `abc123def456` with your actual KV namespace ID!

### Step 6: Deploy

```bash
wrangler deploy
```

You'll see:
```
✨ Success! Uploaded 1 file
🌍 Deployed to https://smart-photo-frame.YOUR_SUBDOMAIN.workers.dev
```

**That's it!** Your photo frame is now live. 🎉

---

## 🎨 Usage

### 1. Create a Google Photos Album

1. Open [Google Photos](https://photos.google.com)
2. Create a new album (or select existing)
3. Add **photos only** (videos will be filtered out)
4. Click **Share** button
5. Enable **Link sharing**
6. Copy the share link (looks like `https://photos.app.goo.gl/xxxxx`)

### 2. Create Your Feed

1. Visit your deployed Worker URL: `https://your-worker.workers.dev`
2. Click **"Get Started"**
3. Click **"+ Add Feed"**
4. Paste your album link
5. Choose image format and update interval
6. Click **"Create"**

### 3. Get Your Photo URL

After creating a feed, you'll see a permanent URL like:
```
https://your-worker.workers.dev/photo?token=abc-123&id=feed-456
```

**Use this URL anywhere:**
- E-ink displays (Waveshare, Inkplate, etc.)
- Digital photo frames
- Raspberry Pi projects
- IoT devices (ESP32, Arduino)
- HTML `<img>` tags
- As a live wallpaper source

### 4. Example: E-ink Display

```python
import requests
from PIL import Image

url = "https://your-worker.workers.dev/photo?token=xxx&id=yyy"
response = requests.get(url, allow_redirects=True)

img = Image.open(BytesIO(response.content))
# Display on your e-ink screen
```

---

## ⚙️ Configuration

### Image Formats

| Format | Size | Best For |
|--------|------|----------|
| Portrait | 1200×1600 | Vertical displays, tablets |
| Landscape | 1600×1200 | Horizontal monitors, TVs |
| Small Portrait | 480×800 | E-ink displays, small screens |
| Small Landscape | 800×480 | Raspberry Pi displays |
| Square | 1600×1600 | Square displays |

### Update Intervals

- 1 hour
- 6 hours
- 12 hours
- 1 day
- 1 week

### Cron Schedule

Edit `wrangler.toml` to change update frequency:

```toml
[triggers]
crons = ["0 * * * *"]  # Every hour at minute 0
# crons = ["*/30 * * * *"]  # Every 30 minutes
# crons = ["0 */6 * * *"]  # Every 6 hours
# crons = ["0 0 * * *"]  # Once per day at midnight
```

**Cron syntax:**
```
┌─ minute (0-59)
│ ┌─ hour (0-23)
│ │ ┌─ day of month (1-31)
│ │ │ ┌─ month (1-12)
│ │ │ │ ┌─ day of week (0-6, 0=Sunday)
│ │ │ │ │
* * * * *
```

---

## 💾 Cloudflare Free Tier Limits

The free tier is **more than enough** for personal use:

| Resource | Free Tier | Your Usage (50 users) |
|----------|-----------|----------------------|
| Requests | 100,000/day | ~2,000/day (2%) |
| KV Reads | 100,000/day | ~500/day (0.5%) |
| KV Writes | 1,000/day | ~50/day (5%) |
| Storage | 1 GB | ~50 KB (0.005%) |

**You can handle 1,000+ users on the free tier!**

---

## 🔒 Privacy & Security

- **No authentication required** - Works with public album links only
- **Token-based access** - Unique UUID token generated per user
- **Isolated storage** - Your feeds stored as `user_{token}_feeds`
- **No tracking** - Zero analytics, cookies, or monitoring
- **No personal data** - Only stores album URLs and preferences
- **Open source** - Inspect and modify the code freely

### Multi-Device Access

Your feed URL contains your token, so you can:
- Access from any browser
- Share across devices
- Bookmark your feeds
- **Important:** Save your feed URLs! Clearing browser data = lost token

---

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start local dev server
wrangler dev

# Visit http://localhost:8787
```

### Testing

```bash
# Test your worker locally
wrangler dev

# Tail live logs from deployed worker
wrangler tail
```

### Update Deployment

After making changes:

```bash
wrangler deploy
```

---

## 🐛 Troubleshooting

### "No photos found" Error

- Ensure album is **publicly shared** (not private)
- Album must contain **photos only** (no videos)
- Try a different album
- Check if the share link is correct

### KV Namespace Not Found

```bash
# List your namespaces
wrangler kv:namespace list

# Create new namespace if needed
wrangler kv:namespace create "PHOTO_KV"
```

### Cron Not Working

- Verify `wrangler.toml` has `[triggers]` section
- Deploy after changing cron schedule: `wrangler deploy`
- Check logs: `wrangler tail`

### Photos Not Updating

- Check cron is configured correctly
- Manually refresh a feed to test
- Verify interval has passed since last update
- Check logs: `wrangler tail`

---

## 📚 API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Welcome page |
| `/app` | GET | Feed management UI |
| `/photo?token=X&id=Y` | GET | Get current photo (redirects to Google) |
| `/api/feeds?token=X` | GET | List user's feeds |
| `/api/feed/create?token=X` | POST | Create new feed |
| `/api/feed/update?token=X` | POST | Update feed settings |
| `/api/feed/refresh?token=X&id=Y` | GET | Force photo refresh |
| `/api/feed/delete?token=X&id=Y` | GET | Delete feed |

### Create Feed Request

```json
POST /api/feed/create?token=YOUR_TOKEN
Content-Type: application/json

{
  "name": "My Vacation Photos",
  "albumUrl": "https://photos.app.goo.gl/xxxxx",
  "interval": 3600,
  "size": "portrait"
}
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Powered by [Google Photos](https://photos.google.com/)
- Created with [Claude AI](https://www.anthropic.com/claude)
- Optimized for [SenseCraft HMI](https://sensecraft.seeed.cc/)

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/smart-photo-frame/issues)
- **Discussions:** [GitHub Discussions](https://github.com/YOUR_USERNAME/smart-photo-frame/discussions)

---

## 🌟 Star This Project

If you find this useful, please star the repository! It helps others discover the project.

---

**Made with ❤️ and AI**
