# Accessibility Test Script - Result Documentation

## Script: `run-accessibility-test.js`

### Issue Fixed
The script had an import error with `chrome-launcher`. The package uses named exports, not default exports.

### Solution
Changed from:
```javascript
import chromeLauncher from 'chrome-launcher';
const chrome = await chromeLauncher.launch({...});
```

To:
```javascript
import { launch as launchChrome } from 'chrome-launcher';
const chrome = await launchChrome({...});
```

---

## Script Overview

### Purpose
Automated accessibility testing using Lighthouse to check WCAG compliance and identify accessibility issues in the EuMatter application.

### Features
- ✅ Launches Chrome headlessly
- ✅ Runs Lighthouse accessibility audit
- ✅ Generates HTML and JSON reports
- ✅ Groups issues by severity (errors vs warnings)
- ✅ Provides detailed console output
- ✅ Supports custom URLs via environment variables
- ✅ Exits with proper codes for CI/CD integration

---

## Prerequisites

### Install Dependencies
```bash
npm install lighthouse chrome-launcher
```

### Ensure Application is Running
The script tests `http://localhost:5173` by default. Make sure your frontend is running:
```bash
cd EuMatter-Thesis-Project/frontend
npm run dev
# or
npm run build && npm run preview
```

---

## Usage

### Basic Usage
```bash
node Tests/Accessibility/run-accessibility-test.js
```

### Custom URL
```bash
TEST_URL=http://localhost:4173 node Tests/Accessibility/run-accessibility-test.js
```

### Using Brave Browser
The script automatically detects Brave browser. If it's not found, you can specify the path:

**PowerShell:**
```powershell
$env:BRAVE_PATH="C:\Users\YourName\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe"
node Tests/Accessibility/run-accessibility-test.js
```

**Find Brave Path (PowerShell):**
```powershell
Get-Command brave | Select-Object -ExpandProperty Source
```

**Or use CHROME_PATH:**
```powershell
$env:CHROME_PATH="C:\path\to\brave.exe"
node Tests/Accessibility/run-accessibility-test.js
```

### From Project Root
```bash
# From F:\eumatter deployed\Eumatter
node Tests/Accessibility/run-accessibility-test.js
```

---

## Expected Output

### Successful Test Run (With Issues)

```
🚀 Starting Accessibility Test...

 browser: Launching Chrome...
🌐 Testing URL: http://localhost:5173

🔍 Running Lighthouse accessibility audit...
✅ Report saved to: F:\eumatter deployed\Eumatter\Tests\Accessibility\lighthouse-accessibility-report.html

📊 Accessibility Score: 85/100

⚠️  Accessibility Issues Found: 5

❌ Errors (Must Fix):
   - Image elements do not have [alt] attributes
     Informative elements should aim for short, descriptive alternate text...
   - Form elements do not have associated labels
     Labels ensure that form controls are announced properly by assistive technologies...

⚠️  Warnings (Should Fix):
   - ARIA attributes are not valid
   - Elements have insufficient color contrast
   - Heading elements are not in a sequentially-descending order
   - ... and 2 more warnings

📄 Summary saved to: F:\eumatter deployed\Eumatter\Tests\Accessibility\accessibility-summary.json

✅ Accessibility test complete!
```

### Perfect Score Example

```
🚀 Starting Accessibility Test...

 browser: Launching Chrome...
🌐 Testing URL: http://localhost:5173

🔍 Running Lighthouse accessibility audit...
✅ Report saved to: F:\eumatter deployed\Eumatter\Tests\Accessibility\lighthouse-accessibility-report.html

📊 Accessibility Score: 100/100

✅ No accessibility issues found!

📄 Summary saved to: F:\eumatter deployed\Eumatter\Tests\Accessibility\accessibility-summary.json

✅ Accessibility test complete!
```

---

## Generated Files

### 1. `lighthouse-accessibility-report.html`
- **Type:** Full HTML Report
- **Location:** `Tests/Accessibility/lighthouse-accessibility-report.html`
- **Content:** Complete Lighthouse accessibility audit with:
  - Detailed findings
  - Screenshots
  - Recommendations
  - Fix suggestions
- **Usage:** Open in any web browser to view comprehensive results

### 2. `accessibility-summary.json`
- **Type:** JSON Summary
- **Location:** `Tests/Accessibility/accessibility-summary.json`
- **Content:** Structured summary with:
  - Overall score
  - Issue counts (errors, warnings, total)
  - List of failed audits
  - Timestamp
  - Test URL

**Example JSON Structure:**
```json
{
  "score": 85,
  "timestamp": "2025-11-19T12:00:00.000Z",
  "url": "http://localhost:5173",
  "issues": {
    "errors": 2,
    "warnings": 3,
    "total": 5
  },
  "failedAudits": [
    {
      "title": "Image elements do not have [alt] attributes",
      "description": "Informative elements should aim for short, descriptive alternate text...",
      "score": 0
    },
    {
      "title": "Form elements do not have associated labels",
      "description": "Labels ensure that form controls are announced properly...",
      "score": 0
    }
  ]
}
```

---

## Score Interpretation

| Score Range | Rating | Action Required |
|------------|--------|-----------------|
| **90-100** | ✅ Excellent | Minor improvements only |
| **80-89** | ⚠️ Good | Some issues to address |
| **50-79** | ⚠️ Needs Improvement | Several issues need fixing |
| **0-49** | ❌ Poor | Major accessibility issues |

### Target Score
**Aim for 90+** to meet WCAG 2.1 Level AA compliance standards.

---

## Common Issues and Quick Fixes

### 1. Missing Alt Text (Error - Score: 0)
**Issue:** Images without alt attributes
```jsx
// ❌ Bad
<img src="logo.png" />

// ✅ Good - Decorative image
<img src="logo.png" alt="" />

// ✅ Good - Informative image
<img src="event.jpg" alt="Community volunteers planting trees at the park event" />
```

### 2. Missing Form Labels (Error - Score: 0)
**Issue:** Form inputs without associated labels
```jsx
// ❌ Bad
<input type="email" name="email" />

// ✅ Good
<label htmlFor="email">Email Address</label>
<input type="email" id="email" name="email" />
```

### 3. Low Color Contrast (Warning)
**Issue:** Text doesn't meet 4.5:1 contrast ratio
```css
/* ❌ Bad - Low contrast */
.text {
  color: #999999;
  background: #ffffff;
}

/* ✅ Good - High contrast */
.text {
  color: #333333;
  background: #ffffff;
}
```

### 4. Missing ARIA Labels (Warning)
**Issue:** Icon buttons without accessible labels
```jsx
// ❌ Bad
<button><FaIcon /></button>

// ✅ Good
<button aria-label="Close dialog">
  <FaIcon aria-hidden="true" />
</button>
```

### 5. Incorrect Heading Structure (Warning)
**Issue:** Headings not in logical order
```jsx
// ❌ Bad
<h1>Title</h1>
<h3>Section</h3> {/* Skipped h2 */}

// ✅ Good
<h1>Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

---

## Troubleshooting

### Issue: "Cannot find module 'lighthouse'"
**Solution:** Install dependencies in the correct directory
```bash
# From project root (F:\eumatter deployed\Eumatter)
npm install lighthouse chrome-launcher
```

### Issue: "Cannot find module 'chrome-launcher'"
**Solution:** The import has been fixed. If you still see this error:
```bash
npm install chrome-launcher
```

### Issue: Connection Refused
**Solution:** Ensure your application is running before executing the test:
```bash
# Terminal 1: Start your app
cd EuMatter-Thesis-Project/frontend
npm run dev

# Terminal 2: Run test
cd ../..
node Tests/Accessibility/run-accessibility-test.js
```

### Issue: Chrome Not Found / ChromeNotInstalledError
**Solution:** 
- The script automatically detects Brave browser. If you're using Brave, it should be detected automatically.
- If detection fails, specify the path manually:
  ```powershell
  # Find your Brave path
  Get-Command brave | Select-Object -ExpandProperty Source
  
  # Use it
  $env:BRAVE_PATH="C:\Users\YourName\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe"
  node Tests/Accessibility/run-accessibility-test.js
  ```
- Common Brave locations:
  - `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe`
  - `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`

### Issue: Port Already in Use
**Solution:** Chrome launcher automatically finds an available port. If issues persist, close other Chrome instances.

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Accessibility Test

on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd EuMatter-Thesis-Project/frontend
          npm install
          cd ../..
          npm install lighthouse chrome-launcher
      
      - name: Build application
        run: |
          cd EuMatter-Thesis-Project/frontend
          npm run build
          npm run preview &
      
      - name: Run accessibility test
        run: |
          sleep 10
          node Tests/Accessibility/run-accessibility-test.js
        continue-on-error: true
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: accessibility-report
          path: Tests/Accessibility/*.html
```

---

## Exit Codes

The script uses exit codes for CI/CD integration:
- **0**: Success (no errors found, or only warnings)
- **1**: Failure (errors found, or script execution failed)

This allows CI/CD pipelines to fail builds if critical accessibility issues are detected.

---

## Next Steps

After running the test:

1. **Review HTML Report** - Open `lighthouse-accessibility-report.html` in a browser
2. **Fix Critical Issues** - Address all errors (score: 0) first
3. **Address Warnings** - Fix important warnings to improve score
4. **Re-run Test** - Verify improvements
5. **Aim for 90+ Score** - Meet WCAG 2.1 Level AA compliance

---

## Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [a11y Project Checklist](https://www.a11yproject.com/checklist/)
- [chrome-launcher Documentation](https://github.com/GoogleChrome/chrome-launcher)

---

## Script Location

```
Tests/
└── Accessibility/
    ├── GUIDE.md (Testing guide)
    ├── run-accessibility-test.js (This script)
    ├── lighthouse-accessibility-report.html (Generated)
    └── accessibility-summary.json (Generated)
```

