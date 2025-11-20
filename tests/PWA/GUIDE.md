# PWA & Performance Testing Guide

## Overview
This guide provides step-by-step instructions for testing Progressive Web App (PWA) features and performance metrics using Chrome Lighthouse and other tools.

**Estimated Time:** 30 minutes  
**Tools:** Chrome Lighthouse, Chrome DevTools

---

## Prerequisites

1. Google Chrome browser (latest version)
2. Node.js (v18 or higher) - for CLI tools
3. Backend server running
4. Frontend application built and running
5. HTTPS enabled (required for PWA features) or localhost (exempt from HTTPS requirement)

---

## Setup Instructions

### 1. Build Production Version

Before testing, ensure you're testing the production build:

```bash
cd EuMatter-Thesis-Project/frontend
npm run build
npm run preview
```

Or run the development server:

```bash
npm run dev
```

### 2. Verify PWA Configuration

Check that your PWA is properly configured:

- `manifest.json` exists in `public/` folder
- Service worker is registered
- Icons are present
- HTTPS is enabled (or using localhost)

---

## Testing with Chrome Lighthouse

### Method 1: Chrome DevTools (Recommended)

#### Step 1: Open Chrome DevTools
1. Open your application in Chrome: `http://localhost:5173` (or your preview URL)
2. Press `F12` or right-click → "Inspect"
3. Navigate to the **Lighthouse** tab

#### Step 2: Configure Lighthouse
1. Select the categories you want to test:
   - ✅ **Performance**
   - ✅ **Progressive Web App**
   - ✅ **Accessibility** (optional, see Accessibility guide)
   - ✅ **Best Practices** (optional)
   - ✅ **SEO** (optional)

2. Select device type:
   - **Desktop** - for desktop testing
   - **Mobile** - for mobile testing (recommended for PWA)

3. Click **"Analyze page load"** or **"Generate report"**

#### Step 3: Review Results
Lighthouse will generate a report with scores and recommendations.

### Method 2: Lighthouse CLI

#### Install Lighthouse CLI

```bash
npm install -g lighthouse
```

#### Run Lighthouse Audit

```bash
# Basic audit
lighthouse http://localhost:5173 --view

# Generate report for specific categories
lighthouse http://localhost:5173 --only-categories=pwa,performance --output=html --output-path=./lighthouse-report.html

# Mobile emulation
lighthouse http://localhost:5173 --only-categories=pwa,performance --preset=mobile --output=html --output-path=./mobile-report.html

# Desktop
lighthouse http://localhost:5173 --only-categories=pwa,performance --preset=desktop --output=html --output-path=./desktop-report.html
```

#### Automated Script

Create `Tests/PWA/run-lighthouse.js`:

```javascript
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import fs from 'fs';

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['pwa', 'performance'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse('http://localhost:5173', options);

  // Save report
  fs.writeFileSync('lighthouse-report.html', runnerResult.report);

  // Log scores
  console.log('PWA Score:', runnerResult.lhr.categories.pwa.score * 100);
  console.log('Performance Score:', runnerResult.lhr.categories.performance.score * 100);

  await chrome.kill();
}

runLighthouse().catch(console.error);
```

Run the script:
```bash
node Tests/PWA/run-lighthouse.js
```

---

## PWA Testing Checklist

### 1. PWA Score (Target: 90+)

Lighthouse checks the following PWA criteria:

#### ✅ Installable
- [ ] Web app manifest exists
- [ ] Manifest has valid `name` and `short_name`
- [ ] Manifest has valid `start_url`
- [ ] Manifest has valid icons (at least 192x192 and 512x512)
- [ ] Service worker is registered
- [ ] Service worker serves content for offline use
- [ ] App is served over HTTPS (or localhost)

**Check manifest.json:**
```json
{
  "name": "EuMatter",
  "short_name": "EuMatter",
  "description": "Community Relations Department platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#800000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

#### ✅ Offline Capability
- [ ] Service worker caches static assets
- [ ] Service worker handles offline requests
- [ ] App works offline (at least shows cached content)

**Test offline mode:**
1. Open Chrome DevTools → Network tab
2. Check "Offline" checkbox
3. Reload the page
4. Verify app still functions or shows offline message

#### ✅ Fast and Reliable
- [ ] Page loads quickly (see Performance section)
- [ ] Service worker responds quickly
- [ ] App works on slow networks

### 2. Performance Score (Target: 90+)

Key metrics to check:

#### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

#### Other Metrics
- **FCP (First Contentful Paint)**: < 1.8s
- **TTI (Time to Interactive)**: < 3.8s
- **Speed Index**: < 3.4s
- **Total Blocking Time**: < 200ms

---

## Manual PWA Testing

### 1. Installability Test

#### Desktop (Chrome/Edge)
1. Visit your app in Chrome
2. Look for install icon in address bar
3. Click install icon
4. Verify app installs and opens in standalone window
5. Check app icon appears in applications menu

#### Mobile (Android Chrome)
1. Visit your app in Chrome mobile
2. Tap menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. Verify app icon appears on home screen
5. Tap icon and verify app opens in standalone mode

#### iOS Safari
1. Visit your app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Verify app icon appears on home screen
5. Tap icon and verify app opens in standalone mode

### 2. Offline Functionality Test

#### Test Steps:
1. Open your app
2. Navigate to different pages (ensure assets are cached)
3. Open Chrome DevTools → Application → Service Workers
4. Check "Offline" checkbox
5. Reload the page
6. Verify:
   - App still loads
   - Cached pages work
   - Navigation works
   - Forms can be filled (submission may queue for when online)

### 3. Service Worker Test

#### Check Service Worker Registration:
1. Open Chrome DevTools → Application → Service Workers
2. Verify service worker is registered and active
3. Check "Update on reload" to test updates

#### Test Service Worker Update:
1. Make changes to service worker file
2. Reload page
3. Verify new service worker activates
4. Check old service worker is replaced

### 4. Push Notifications Test (if implemented)

1. Request notification permission
2. Verify permission prompt appears
3. Grant permission
4. Send test notification
5. Verify notification appears
6. Test notification click action

---

## Performance Optimization Checklist

### 1. Image Optimization
- [ ] Images are optimized (WebP, compressed)
- [ ] Images have proper dimensions
- [ ] Lazy loading implemented for below-fold images
- [ ] Responsive images with srcset

### 2. Code Splitting
- [ ] Route-based code splitting implemented
- [ ] Large dependencies are lazy-loaded
- [ ] Bundle size is optimized

### 3. Caching Strategy
- [ ] Static assets cached by service worker
- [ ] API responses cached appropriately
- [ ] Cache invalidation strategy in place

### 4. Network Optimization
- [ ] HTTP/2 or HTTP/3 enabled
- [ ] Gzip/Brotli compression enabled
- [ ] CDN used for static assets (if applicable)

---

## Automated Testing Script

Create `Tests/PWA/test-pwa.sh` (Linux/Mac) or `Tests/PWA/test-pwa.ps1` (Windows):

### PowerShell Script (Windows)

```powershell
# test-pwa.ps1
Write-Host "Building production version..."
cd EuMatter-Thesis-Project/frontend
npm run build

Write-Host "Starting preview server..."
Start-Process npm -ArgumentList "run preview" -PassThru

Start-Sleep -Seconds 5

Write-Host "Running Lighthouse audit..."
lighthouse http://localhost:4173 --only-categories=pwa,performance --output=html --output-path=./Tests/PWA/lighthouse-report.html

Write-Host "Report saved to Tests/PWA/lighthouse-report.html"
```

### Bash Script (Linux/Mac)

```bash
#!/bin/bash
# test-pwa.sh

echo "Building production version..."
cd EuMatter-Thesis-Project/frontend
npm run build

echo "Starting preview server..."
npm run preview &
PREVIEW_PID=$!

sleep 5

echo "Running Lighthouse audit..."
lighthouse http://localhost:4173 --only-categories=pwa,performance --output=html --output-path=./Tests/PWA/lighthouse-report.html

kill $PREVIEW_PID

echo "Report saved to Tests/PWA/lighthouse-report.html"
```

---

## Interpreting Results

### PWA Score Breakdown

- **100**: All PWA criteria met
- **90-99**: Minor issues (usually installability or offline)
- **50-89**: Missing key features (service worker, manifest)
- **0-49**: Not a PWA

### Common Issues and Fixes

1. **Missing Service Worker**
   - Register service worker in `main.jsx` or `App.jsx`
   - Ensure service worker file exists

2. **Missing Manifest**
   - Create `public/manifest.json`
   - Link in `index.html`: `<link rel="manifest" href="/manifest.json">`

3. **Invalid Icons**
   - Generate icons in required sizes (192x192, 512x512)
   - Ensure icons are in manifest

4. **Not Served Over HTTPS**
   - Use HTTPS in production
   - Localhost is exempt from HTTPS requirement

5. **Poor Performance**
   - Optimize images
   - Implement code splitting
   - Reduce bundle size
   - Optimize API calls

---

## Continuous Monitoring

### Set Up Lighthouse CI

Install Lighthouse CI:

```bash
npm install -g @lhci/cli
```

Create `lighthouserc.js`:

```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

Run:
```bash
lhci autorun
```

---

## Next Steps

After completing PWA testing:
1. Fix any issues identified
2. Re-run Lighthouse to verify improvements
3. Move to Security Testing (see `../Security/GUIDE.md`)

