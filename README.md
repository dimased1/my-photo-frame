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
3. **5 minutes** of your time

### How It Works

1. Share a Google Photos album publicly
2. Paste the album link into the app
3. Get a permanent photo URL (e.g., `https://your-worker.dev/photo?token=xxx&id=yyy`)
4. Use this URL on any device - it returns a random photo from your album

---

## 📦 Installation (Web Dashboard)

### Step 1: Create Cloudflare Account

Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and create a free account.

### Step 2: Create KV Namespace

1. In Cloudflare Dashboard, go to **Workers & Pages** → **KV**
2. Click **Create namespace**
3. Name it: `PHOTO_KV`
4. Click **Add**
5. **Copy the namespace ID** (you'll need it in Step 4)

### Step 3: Create Worker

1. Go to **Workers & Pages** → **Create application**
2. Click **Create Worker**
3. Name it: `smart-photo-frame` (or any name you like)
4. Click **Deploy**

### Step 4: Upload Code

1. Click **Edit code** button
2. **Delete all the default code**
3. Copy the entire contents of `worker.js` from this repository
4. **Paste** it into the editor
5. Click **Save and Deploy**

### Step 5: Add KV Binding

1. Go to **Settings** tab
2. Scroll to **Variables and Secrets**
3. Under **KV Namespace Bindings**, click **Add binding**
4. Variable name: `PHOTO_KV`
5. KV namespace: Select the namespace you created in Step 2
6. Click **Save**

### Step 6: Setup Cron Trigger (Optional)

Auto-update photos every hour:

1. Go to **Triggers** tab
2. Scroll to **Cron Triggers**
3. Click **Add Cron Trigger**
4. Enter: `0 * * * *` (updates every hour)
5. Click **Add Trigger**

**Done!** 🎉 Your worker is live at `https://smart-photo-frame.YOUR_SUBDOMAIN.workers.dev`

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

1. Visit your Worker URL: `https://your-worker.workers.dev`
2. Click **"Get Started"**
3. Click **"+ Add Feed"**
4. Paste your album link
5. Choose image format and update interval
6. Click **"Create"**

### 3. Get Your Photo URL

After creating a feed, you'll see a permanent URL:
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
from io import BytesIO

url = "https://your-worker.workers.dev/photo?token=xxx&id=yyy"
response = requests.get(url, allow_redirects=True)

img = Image.open(BytesIO(response.content))
# Display on your e-ink screen
```

### 5. Example: HTML

```html
<img src="https://your-worker.workers.dev/photo?token=xxx&id=yyy" 
     alt="Random photo" 
     width="800" 
     height="600">
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

### Cron Schedule Examples

In the **Triggers** tab, you can use different cron schedules:

| Schedule | Description |
|----------|-------------|
| `0 * * * *` | Every hour |
| `0 */6 * * *` | Every 6 hours |
| `0 */12 * * *` | Every 12 hours |
| `0 0 * * *` | Once per day (midnight UTC) |

**Cron format:**
```
┌─ minute (0-59)
│ ┌─ hour (0-23)
│ │ ┌─ day of month (1-31)
│ │ │ ┌─ month (1-12)
│ │ │ │ ┌─ day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

---

## 💾 Cloudflare Free Tier

The free tier is **more than enough** for personal use:

| Resource | Free Tier | Typical Usage (50 users) |
|----------|-----------|--------------------------|
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

### Multi-Device Access

Your feed URL contains your token, so you can:
- Access from any browser
- Share across devices
- Bookmark your feeds

**⚠️ Important:** Save your feed URLs! Clearing browser data = lost token.

---

## 🐛 Troubleshooting

### "No photos found" Error

- ✅ Ensure album is **publicly shared** (link sharing enabled)
- ✅ Album must contain **photos only** (videos are filtered out)
- ✅ Try with a different album
- ✅ Check the share link is correct format

### KV Binding Not Working

1. Go to Worker → **Settings** → **Variables and Secrets**
2. Check **KV Namespace Bindings** section
3. Must have: `PHOTO_KV` binding to your KV namespace
4. If missing, add it (see Step 5 in Installation)

### Cron Not Updating Photos

1. Go to **Triggers** tab
2. Check **Cron Triggers** section
3. Verify cron schedule is present
4. Wait for the scheduled time (check logs in **Logs** tab)

### Photos Not Loading

- Check if the photo URL redirects properly (open in browser)
- Verify feed was created successfully
- Try manual refresh button in the app
- Check Worker logs for errors

---

## 📚 How It Works

### Architecture

```
User Browser
    ↓
Cloudflare Worker (worker.js)
    ↓
Cloudflare KV (stores feed configs)
    ↓
Google Photos (fetches random photo)
    ↓
Returns image URL
```

### Token System

- On first visit: UUID token generated → saved in browser localStorage
- Your feeds: stored as `user_{token}_feeds` in KV
- Feed URL format: `/photo?token={YOUR_TOKEN}&id={FEED_ID}`
- Anyone with feed URL can view that specific feed

### Photo Rotation

1. Cron trigger runs every hour (configurable)
2. Checks all feeds in KV storage
3. For each feed where interval passed:
   - Select random photo from the stored photo list
   - Update `currentPhoto` field
   - Update `lastUpdate` timestamp

---

## 💡 Use Cases

- **E-ink Displays** - Battery-powered photo frames that fetch new image periodically
- **Smart Home Dashboards** - Display family photos on Home Assistant or similar
- **Digital Signage** - Rotate promotional images in offices or stores
- **IoT Projects** - Add photos to Arduino/ESP32/Raspberry Pi displays
- **Live Wallpapers** - Dynamic desktop background that changes daily
- **Website Headers** - Add rotating photography without hosting images

---

## 🔗 Useful Links

- **Cloudflare Dashboard:** [dash.cloudflare.com](https://dash.cloudflare.com)
- **Cloudflare Workers Docs:** [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)
- **Google Photos:** [photos.google.com](https://photos.google.com)
- **SenseCraft HMI:** [sensecraft.seeed.cc](https://sensecraft.seeed.cc/)

---

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs via [Issues](https://github.com/YOUR_USERNAME/smart-photo-frame/issues)
- Suggest features
- Submit pull requests

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Credits

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Powered by [Google Photos](https://photos.google.com/)
- Created with [Claude AI](https://www.anthropic.com/claude)
- Optimized for [SenseCraft HMI](https://sensecraft.seeed.cc/)

---

## ⭐ Support

If you find this useful, please **star the repository**! It helps others discover the project.

---

**Made with ❤️ and AI**
