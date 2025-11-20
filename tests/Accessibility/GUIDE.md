# Accessibility Testing Guide

## Overview
This guide provides step-by-step instructions for testing web accessibility using Chrome Lighthouse and other accessibility tools to ensure the EuMatter application is accessible to all users.

**Estimated Time:** 10 minutes  
**Tools:** Chrome Lighthouse, axe DevTools (optional), WAVE (optional)

---

## Prerequisites

1. Google Chrome browser (latest version)
2. Node.js (v18 or higher) - for CLI tools (optional)
3. Frontend application built and running
4. Internet connection (for online tools)

---

## Setup Instructions

### 1. Build and Run Application

```bash
cd EuMatter-Thesis-Project/frontend
npm run build
npm run preview
```

Or run development server:

```bash
npm run dev
```

### 2. Install Accessibility Tools (Optional)

#### Install axe DevTools Extension
1. Open Chrome Web Store
2. Search for "axe DevTools"
3. Click "Add to Chrome"

#### Install WAVE Extension (Optional)
1. Open Chrome Web Store
2. Search for "WAVE Evaluation Tool"
3. Click "Add to Chrome"

---

## Testing with Chrome Lighthouse

### Method 1: Chrome DevTools (Recommended)

#### Step 1: Open Chrome DevTools
1. Open your application in Chrome: `http://localhost:5173`
2. Press `F12` or right-click → "Inspect"
3. Navigate to the **Lighthouse** tab

#### Step 2: Configure Lighthouse
1. Select **Accessibility** category
   - Optionally select other categories (Performance, PWA, etc.)
2. Select device type:
   - **Desktop** - for desktop testing
   - **Mobile** - for mobile testing
3. Click **"Analyze page load"** or **"Generate report"**

#### Step 3: Review Results
Lighthouse will generate an accessibility score (0-100) and list issues.

### Method 2: Lighthouse CLI

#### Install Lighthouse CLI

```bash
npm install -g lighthouse
```

#### Run Accessibility Audit

```bash
# Basic accessibility audit
lighthouse http://localhost:5173 --only-categories=accessibility --view

# Generate HTML report
lighthouse http://localhost:5173 --only-categories=accessibility --output=html --output-path=./Tests/Accessibility/lighthouse-accessibility-report.html

# Generate JSON report
lighthouse http://localhost:5173 --only-categories=accessibility --output=json --output-path=./Tests/Accessibility/lighthouse-accessibility-report.json
```

#### Automated Script

Create `Tests/Accessibility/run-accessibility-test.js`:

```javascript
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import fs from 'fs';

async function runAccessibilityTest() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['accessibility'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse('http://localhost:5173', options);

  // Save report
  fs.writeFileSync('Tests/Accessibility/lighthouse-accessibility-report.html', runnerResult.report);

  // Log score
  const accessibilityScore = runnerResult.lhr.categories.accessibility.score * 100;
  console.log('Accessibility Score:', accessibilityScore);

  // Log issues
  const audits = runnerResult.lhr.audits;
  const failedAudits = Object.values(audits).filter(audit => audit.score !== null && audit.score < 1);
  
  console.log('\nAccessibility Issues Found:');
  failedAudits.forEach(audit => {
    console.log(`- ${audit.title}: ${audit.description}`);
  });

  await chrome.kill();
}

runAccessibilityTest().catch(console.error);
```

Run the script:
```bash
node Tests/Accessibility/run-accessibility-test.js
```

---

## Accessibility Testing Checklist

### 1. Accessibility Score (Target: 90+)

Lighthouse checks the following accessibility criteria:

#### ✅ ARIA Attributes
- [ ] Elements have proper ARIA labels
- [ ] ARIA roles are correctly used
- [ ] ARIA attributes are valid
- [ ] No duplicate ARIA IDs

**Common Issues:**
- Missing `aria-label` on icon buttons
- Missing `aria-describedby` for form fields
- Incorrect `role` attributes

**Fix Example:**
```jsx
// Bad
<button><FaIcon /></button>

// Good
<button aria-label="Close dialog">
  <FaIcon aria-hidden="true" />
</button>
```

#### ✅ Color Contrast
- [ ] Text has sufficient contrast ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] Interactive elements have sufficient contrast
- [ ] Focus indicators are visible

**Check Contrast:**
- Use Chrome DevTools → Elements → Computed → Check color contrast
- Or use online tools like WebAIM Contrast Checker

**Fix Example:**
```css
/* Bad - Low contrast */
.text {
  color: #999999;
  background: #ffffff;
}

/* Good - High contrast */
.text {
  color: #333333;
  background: #ffffff;
}
```

#### ✅ Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical
- [ ] Focus indicators are visible
- [ ] No keyboard traps

**Test:**
1. Press `Tab` to navigate through page
2. Verify all interactive elements receive focus
3. Verify focus order is logical
4. Verify focus indicators are visible

#### ✅ Form Labels
- [ ] All form inputs have associated labels
- [ ] Labels are properly linked to inputs
- [ ] Required fields are indicated
- [ ] Error messages are associated with inputs

**Fix Example:**
```jsx
// Bad
<input type="email" name="email" />

// Good
<label htmlFor="email">Email Address</label>
<input type="email" id="email" name="email" aria-required="true" />
```

#### ✅ Image Alt Text
- [ ] All images have alt text
- [ ] Decorative images have empty alt text
- [ ] Alt text is descriptive and meaningful

**Fix Example:**
```jsx
// Bad
<img src="logo.png" />

// Good - Decorative
<img src="logo.png" alt="" />

// Good - Informative
<img src="event-photo.jpg" alt="Community volunteers planting trees in the park" />
```

#### ✅ Heading Structure
- [ ] Headings are in logical order (h1 → h2 → h3)
- [ ] No skipped heading levels
- [ ] Headings describe content sections

**Fix Example:**
```jsx
// Bad
<h1>Page Title</h1>
<h3>Section Title</h3>

// Good
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

#### ✅ Language Declaration
- [ ] HTML has lang attribute
- [ ] Language changes are marked

**Fix Example:**
```html
<html lang="en">
```

#### ✅ Document Title
- [ ] Page has descriptive title
- [ ] Title is unique for each page

**Fix Example:**
```jsx
// In your React app
useEffect(() => {
  document.title = 'EuMatter - Donate';
}, []);
```

---

## Manual Accessibility Testing

### 1. Keyboard Navigation Test

**Test Steps:**
1. Open your application
2. Use only keyboard (no mouse):
   - `Tab` - Navigate forward
   - `Shift + Tab` - Navigate backward
   - `Enter` - Activate buttons/links
   - `Space` - Activate buttons
   - `Arrow keys` - Navigate menus/options
3. Verify:
   - All interactive elements are reachable
   - Focus order is logical
   - Focus indicators are visible
   - No keyboard traps

### 2. Screen Reader Test

**Using NVDA (Windows - Free):**
1. Download NVDA from https://www.nvaccess.org/
2. Install and start NVDA
3. Navigate your application using keyboard
4. Listen to screen reader announcements
5. Verify:
   - All content is announced
   - Form labels are announced
   - Button purposes are clear
   - Navigation is logical

**Using VoiceOver (Mac - Built-in):**
1. Enable VoiceOver: `Cmd + F5`
2. Navigate using VoiceOver commands
3. Verify content is properly announced

### 3. Color Contrast Test

**Using Chrome DevTools:**
1. Inspect text element
2. Check Computed styles
3. Verify contrast ratio meets WCAG standards

**Using Online Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Contrast Ratio: https://contrast-ratio.com/

### 4. Zoom Test

**Test Steps:**
1. Zoom page to 200% (`Ctrl/Cmd + +`)
2. Verify:
   - Content remains readable
   - Layout doesn't break
   - All functionality works
   - No horizontal scrolling (at 400px width)

### 5. Form Accessibility Test

**Test Steps:**
1. Navigate to forms using keyboard
2. Verify:
   - All inputs have labels
   - Required fields are indicated
   - Error messages are associated with inputs
   - Error messages are announced by screen readers
   - Form validation is accessible

---

## Using axe DevTools (Optional)

### Step 1: Open axe DevTools
1. Open Chrome DevTools (`F12`)
2. Navigate to **axe DevTools** tab
3. Click **"Scan ALL of my page"**

### Step 2: Review Results
- Issues are categorized by severity
- Click on issues for details and fixes
- Review "Needs Review" items

### Step 3: Fix Issues
- Follow suggested fixes
- Re-scan to verify fixes

---

## Using WAVE Extension (Optional)

### Step 1: Install and Activate
1. Install WAVE extension from Chrome Web Store
2. Navigate to your application
3. Click WAVE extension icon

### Step 2: Review Results
- Errors (red) - Must fix
- Alerts (yellow) - Should fix
- Features (green) - Good accessibility features
- Structural elements (blue) - Document structure

### Step 3: Fix Issues
- Click on icons to see details
- Follow suggestions to fix issues

---

## Common Accessibility Issues and Fixes

### Issue 1: Missing Alt Text
```jsx
// Fix
<img src="image.jpg" alt="Descriptive text about the image" />
```

### Issue 2: Missing Form Labels
```jsx
// Fix
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Issue 3: Low Color Contrast
```css
/* Fix - Ensure 4.5:1 contrast ratio */
.text {
  color: #000000; /* Instead of #666666 */
}
```

### Issue 4: Missing Focus Indicators
```css
/* Fix */
button:focus,
a:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### Issue 5: Missing ARIA Labels
```jsx
// Fix
<button aria-label="Close dialog">
  <FaTimes />
</button>
```

### Issue 6: Incorrect Heading Order
```jsx
// Fix - Use proper heading hierarchy
<h1>Main Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

---

## Automated Accessibility Testing Script

Create `Tests/Accessibility/test-accessibility.sh` (Linux/Mac):

```bash
#!/bin/bash

echo "♿ Running Accessibility Tests..."
echo ""

echo "Building production version..."
cd EuMatter-Thesis-Project/frontend
npm run build

echo "Starting preview server..."
npm run preview &
PREVIEW_PID=$!

sleep 5

echo "Running Lighthouse accessibility audit..."
lighthouse http://localhost:4173 \
  --only-categories=accessibility \
  --output=html \
  --output-path=./Tests/Accessibility/lighthouse-accessibility-report.html

kill $PREVIEW_PID

echo "✅ Accessibility test complete!"
echo "Report saved to Tests/Accessibility/lighthouse-accessibility-report.html"
```

Create `Tests/Accessibility/test-accessibility.ps1` (Windows):

```powershell
# test-accessibility.ps1

Write-Host "♿ Running Accessibility Tests..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Building production version..." -ForegroundColor Yellow
cd EuMatter-Thesis-Project/frontend
npm run build

Write-Host "Starting preview server..." -ForegroundColor Yellow
Start-Process npm -ArgumentList "run preview" -PassThru
$PREVIEW_PID = $LASTEXITCODE

Start-Sleep -Seconds 5

Write-Host "Running Lighthouse accessibility audit..." -ForegroundColor Yellow
lighthouse http://localhost:4173 `
  --only-categories=accessibility `
  --output=html `
  --output-path=./Tests/Accessibility/lighthouse-accessibility-report.html

Stop-Process -Id $PREVIEW_PID -ErrorAction SilentlyContinue

Write-Host "✅ Accessibility test complete!" -ForegroundColor Green
Write-Host "Report saved to Tests/Accessibility/lighthouse-accessibility-report.html" -ForegroundColor Cyan
```

---

## Interpreting Results

### Accessibility Score Breakdown

- **90-100**: Excellent - Minor issues only
- **80-89**: Good - Some issues to address
- **50-79**: Needs Improvement - Several issues
- **0-49**: Poor - Major accessibility issues

### Common Issues Priority

1. **Critical (Must Fix):**
   - Missing alt text on images
   - Missing form labels
   - Keyboard navigation issues
   - Color contrast violations

2. **Important (Should Fix):**
   - Missing ARIA labels
   - Incorrect heading structure
   - Missing document language
   - Missing page titles

3. **Nice to Have:**
   - ARIA best practices
   - Semantic HTML improvements

---

## WCAG Compliance Levels

### WCAG 2.1 Levels

- **Level A**: Minimum requirements (must meet)
- **Level AA**: Recommended (should meet) - Most common target
- **Level AAA**: Enhanced (nice to have)

### Target Compliance

Aim for **WCAG 2.1 Level AA** compliance, which includes:
- Color contrast ratio of 4.5:1 (normal text) or 3:1 (large text)
- Keyboard accessible
- Proper heading structure
- Form labels
- Alt text for images
- And more...

---

## Continuous Accessibility Testing

### Integrate into CI/CD

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Accessibility Tests
  run: |
    npm run build
    npm run preview &
    sleep 5
    lighthouse http://localhost:4173 \
      --only-categories=accessibility \
      --output=json \
      --output-path=./accessibility-report.json
```

### Set Up Monitoring

Use tools like:
- **Pa11y** - Command-line accessibility testing
- **axe-core** - Automated accessibility testing library
- **Lighthouse CI** - Continuous Lighthouse testing

---

## Next Steps

After completing accessibility testing:
1. Fix all critical and important issues
2. Re-run Lighthouse to verify improvements
3. Test with actual screen readers
4. Get feedback from users with disabilities
5. Document accessibility features and improvements

---

## Resources

- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM**: https://webaim.org/
- **a11y Project**: https://www.a11yproject.com/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/

