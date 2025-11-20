# Security Testing Guide

## Overview
This guide provides step-by-step instructions for performing security scans and audits on the EuMatter project to identify vulnerabilities and security issues.

**Estimated Time:** 30 minutes  
**Tools:** npm audit, Snyk, OWASP ZAP (optional)

---

## Prerequisites

1. Node.js (v18 or higher)
2. npm or yarn package manager
3. Internet connection (for Snyk and npm audit)
4. Backend and frontend dependencies installed
5. (Optional) OWASP ZAP installed for advanced scanning

---

## Setup Instructions

### 1. Install Security Tools

#### Install Snyk CLI
```bash
npm install -g snyk
```

#### Install OWASP ZAP (Optional)
- Download from: https://www.zaproxy.org/download/
- Or use Docker: `docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:5173`

---

## Security Testing Methods

### Method 1: npm audit (Quick Scan)

#### Run npm audit

**Backend:**
```bash
cd EuMatter-Thesis-Project/backend
npm audit
```

**Frontend:**
```bash
cd EuMatter-Thesis-Project/frontend
npm audit
```

#### Fix Vulnerabilities Automatically

```bash
# Backend
cd EuMatter-Thesis-Project/backend
npm audit fix

# Frontend
cd EuMatter-Thesis-Project/frontend
npm audit fix
```

#### Generate Detailed Report

```bash
# Backend
npm audit --json > Tests/Security/npm-audit-backend.json

# Frontend
npm audit --json > Tests/Security/npm-audit-frontend.json
```

#### Audit with Production Dependencies Only

```bash
npm audit --production
```

#### Create Automated Script

Create `Tests/Security/run-npm-audit.js`:

```javascript
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve('EuMatter-Thesis-Project');
const backendPath = path.join(projectRoot, 'backend');
const frontendPath = path.join(projectRoot, 'frontend');

console.log('🔍 Running npm audit on backend...');
try {
  const backendAudit = execSync('npm audit --json', {
    cwd: backendPath,
    encoding: 'utf-8',
  });
  fs.writeFileSync('Tests/Security/npm-audit-backend.json', backendAudit);
  const backendData = JSON.parse(backendAudit);
  console.log(`Backend vulnerabilities: ${backendData.metadata?.vulnerabilities?.total || 0}`);
} catch (error) {
  console.error('Backend audit failed:', error.message);
}

console.log('🔍 Running npm audit on frontend...');
try {
  const frontendAudit = execSync('npm audit --json', {
    cwd: frontendPath,
    encoding: 'utf-8',
  });
  fs.writeFileSync('Tests/Security/npm-audit-frontend.json', frontendAudit);
  const frontendData = JSON.parse(frontendAudit);
  console.log(`Frontend vulnerabilities: ${frontendData.metadata?.vulnerabilities?.total || 0}`);
} catch (error) {
  console.error('Frontend audit failed:', error.message);
}

console.log('✅ Audit complete. Reports saved to Tests/Security/');
```

Run:
```bash
node Tests/Security/run-npm-audit.js
```

---

### Method 2: Snyk Scan (Comprehensive)

#### Step 1: Authenticate with Snyk

```bash
snyk auth
```

This will open a browser window for authentication. Sign up for a free account if needed.

#### Step 2: Test Backend Dependencies

```bash
cd EuMatter-Thesis-Project/backend
snyk test
```

#### Step 3: Test Frontend Dependencies

```bash
cd EuMatter-Thesis-Project/frontend
snyk test
```

#### Step 4: Generate Reports

```bash
# Backend
cd EuMatter-Thesis-Project/backend
snyk test --json > ../../Tests/Security/snyk-backend.json
snyk test --json-file-output=../../Tests/Security/snyk-backend.json

# Frontend
cd EuMatter-Thesis-Project/frontend
snyk test --json > ../../Tests/Security/snyk-frontend.json
snyk test --json-file-output=../../Tests/Security/snyk-frontend.json
```

#### Step 5: Monitor Project (Continuous Monitoring)

```bash
# Backend
cd EuMatter-Thesis-Project/backend
snyk monitor

# Frontend
cd EuMatter-Thesis-Project/frontend
snyk monitor
```

This adds your project to Snyk's monitoring dashboard for continuous vulnerability tracking.

#### Step 6: Fix Vulnerabilities

Snyk can suggest fixes:

```bash
snyk wizard
```

This interactive tool will:
- Show vulnerabilities
- Suggest fixes
- Update package.json automatically

#### Create Automated Snyk Script

Create `Tests/Security/run-snyk-scan.js`:

```javascript
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve('EuMatter-Thesis-Project');
const backendPath = path.join(projectRoot, 'backend');
const frontendPath = path.join(projectRoot, 'frontend');

console.log('🔍 Running Snyk scan on backend...');
try {
  const backendScan = execSync('snyk test --json', {
    cwd: backendPath,
    encoding: 'utf-8',
  });
  fs.writeFileSync('Tests/Security/snyk-backend.json', backendScan);
  const backendData = JSON.parse(backendScan);
  console.log(`Backend vulnerabilities: ${backendData.vulnerabilities?.length || 0}`);
} catch (error) {
  console.error('Backend Snyk scan failed:', error.message);
  // Snyk exits with non-zero if vulnerabilities found, so check stderr
  if (error.stderr) {
    console.log('Scan completed with vulnerabilities found');
  }
}

console.log('🔍 Running Snyk scan on frontend...');
try {
  const frontendScan = execSync('snyk test --json', {
    cwd: frontendPath,
    encoding: 'utf-8',
  });
  fs.writeSync('Tests/Security/snyk-frontend.json', frontendScan);
  const frontendData = JSON.parse(frontendScan);
  console.log(`Frontend vulnerabilities: ${frontendData.vulnerabilities?.length || 0}`);
} catch (error) {
  console.error('Frontend Snyk scan failed:', error.message);
}

console.log('✅ Snyk scan complete. Reports saved to Tests/Security/');
```

---

### Method 3: OWASP ZAP (Advanced Web Application Scanning)

#### Option A: Using OWASP ZAP Desktop

1. **Start ZAP Desktop Application**
   - Launch OWASP ZAP
   - Choose "Automated Scan"

2. **Configure Target**
   - Enter your app URL: `http://localhost:5173`
   - Click "Attack"

3. **Review Results**
   - Check "Alerts" tab for vulnerabilities
   - Review "Sites" tab for discovered endpoints

4. **Export Report**
   - File → Export Report
   - Choose format (HTML, JSON, XML)
   - Save to `Tests/Security/zap-report.html`

#### Option B: Using OWASP ZAP CLI (Docker)

```bash
# Start your application first
cd EuMatter-Thesis-Project/frontend
npm run dev

# In another terminal, run ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:5173 \
  -J zap-report.json \
  -r zap-report.html

# Copy reports
docker cp $(docker ps -lq):/zap/wrk/zap-report.html Tests/Security/
docker cp $(docker ps -lq):/zap/wrk/zap-report.json Tests/Security/
```

#### Option C: Using OWASP ZAP API

Create `Tests/Security/run-zap-scan.js`:

```javascript
import axios from 'axios';
import fs from 'fs';

const ZAP_API_URL = 'http://localhost:8080';
const TARGET_URL = 'http://localhost:5173';

async function runZAPScan() {
  try {
    // Start spider scan
    console.log('Starting ZAP spider scan...');
    const spiderResponse = await axios.get(`${ZAP_API_URL}/JSON/spider/action/scan/`, {
      params: {
        url: TARGET_URL,
        maxChildren: 10,
        recurse: true,
      },
    });
    const scanId = spiderResponse.data.scan;

    // Wait for scan to complete
    let status = '0';
    while (status !== '100') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResponse = await axios.get(`${ZAP_API_URL}/JSON/spider/view/status/`, {
        params: { scanId },
      });
      status = statusResponse.data.status;
      console.log(`Spider scan progress: ${status}%`);
    }

    // Start active scan
    console.log('Starting ZAP active scan...');
    const activeScanResponse = await axios.get(`${ZAP_API_URL}/JSON/ascan/action/scan/`, {
      params: { url: TARGET_URL },
    });
    const activeScanId = activeScanResponse.data.scan;

    // Wait for active scan to complete
    let activeStatus = '0';
    while (activeStatus !== '100') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const statusResponse = await axios.get(`${ZAP_API_URL}/JSON/ascan/view/status/`, {
        params: { scanId: activeScanId },
      });
      activeStatus = statusResponse.data.status;
      console.log(`Active scan progress: ${activeStatus}%`);
    }

    // Generate report
    console.log('Generating ZAP report...');
    const reportResponse = await axios.get(`${ZAP_API_URL}/OTHER/core/other/htmlreport/`);
    fs.writeFileSync('Tests/Security/zap-report.html', reportResponse.data);

    // Get alerts
    const alertsResponse = await axios.get(`${ZAP_API_URL}/JSON/core/view/alerts/`, {
      params: { baseurl: TARGET_URL },
    });
    fs.writeFileSync('Tests/Security/zap-alerts.json', JSON.stringify(alertsResponse.data, null, 2));

    console.log('✅ ZAP scan complete. Reports saved to Tests/Security/');
  } catch (error) {
    console.error('ZAP scan failed:', error.message);
    console.log('Make sure OWASP ZAP is running on http://localhost:8080');
  }
}

runZAPScan();
```

**Note:** Start OWASP ZAP in daemon mode first:
```bash
zap.sh -daemon -host 0.0.0.0 -port 8080
```

---

## Security Checklist

### Dependency Vulnerabilities
- [ ] Run `npm audit` on backend
- [ ] Run `npm audit` on frontend
- [ ] Fix all high and critical vulnerabilities
- [ ] Review and fix medium vulnerabilities
- [ ] Run Snyk scan for additional vulnerability detection

### Authentication & Authorization
- [ ] JWT tokens are properly secured (httpOnly cookies)
- [ ] Password hashing uses bcrypt with sufficient rounds
- [ ] Rate limiting is implemented for auth endpoints
- [ ] Session management is secure
- [ ] Role-based access control is properly enforced

### Input Validation
- [ ] All user inputs are validated
- [ ] SQL/NoSQL injection prevention
- [ ] XSS (Cross-Site Scripting) prevention
- [ ] CSRF protection implemented
- [ ] File upload validation and sanitization

### API Security
- [ ] API endpoints require authentication where needed
- [ ] CORS is properly configured
- [ ] API rate limiting is implemented
- [ ] Sensitive data is not exposed in API responses
- [ ] API versioning considered

### Data Protection
- [ ] Sensitive data is encrypted at rest
- [ ] Sensitive data is encrypted in transit (HTTPS)
- [ ] Environment variables are used for secrets
- [ ] No hardcoded credentials
- [ ] Database connections are secure

### Error Handling
- [ ] Error messages don't expose sensitive information
- [ ] Stack traces are not shown in production
- [ ] Proper error logging without exposing secrets

---

## Automated Security Testing Script

Create `Tests/Security/run-all-security-tests.sh` (Linux/Mac):

```bash
#!/bin/bash

echo "🔒 Running Security Tests..."
echo ""

echo "1. Running npm audit on backend..."
cd EuMatter-Thesis-Project/backend
npm audit --json > ../../Tests/Security/npm-audit-backend.json
echo "✅ Backend npm audit complete"

echo ""
echo "2. Running npm audit on frontend..."
cd ../frontend
npm audit --json > ../../Tests/Security/npm-audit-frontend.json
echo "✅ Frontend npm audit complete"

echo ""
echo "3. Running Snyk scan on backend..."
cd ../backend
snyk test --json > ../../Tests/Security/snyk-backend.json 2>&1 || true
echo "✅ Backend Snyk scan complete"

echo ""
echo "4. Running Snyk scan on frontend..."
cd ../frontend
snyk test --json > ../../Tests/Security/snyk-frontend.json 2>&1 || true
echo "✅ Frontend Snyk scan complete"

echo ""
echo "✅ All security tests complete!"
echo "Reports saved to Tests/Security/"
```

Create `Tests/Security/run-all-security-tests.ps1` (Windows):

```powershell
# run-all-security-tests.ps1

Write-Host "🔒 Running Security Tests..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Running npm audit on backend..." -ForegroundColor Yellow
cd EuMatter-Thesis-Project/backend
npm audit --json | Out-File -FilePath "../../Tests/Security/npm-audit-backend.json" -Encoding utf8
Write-Host "✅ Backend npm audit complete" -ForegroundColor Green

Write-Host ""
Write-Host "2. Running npm audit on frontend..." -ForegroundColor Yellow
cd ../frontend
npm audit --json | Out-File -FilePath "../../Tests/Security/npm-audit-frontend.json" -Encoding utf8
Write-Host "✅ Frontend npm audit complete" -ForegroundColor Green

Write-Host ""
Write-Host "3. Running Snyk scan on backend..." -ForegroundColor Yellow
cd ../backend
snyk test --json 2>&1 | Out-File -FilePath "../../Tests/Security/snyk-backend.json" -Encoding utf8
Write-Host "✅ Backend Snyk scan complete" -ForegroundColor Green

Write-Host ""
Write-Host "4. Running Snyk scan on frontend..." -ForegroundColor Yellow
cd ../frontend
snyk test --json 2>&1 | Out-File -FilePath "../../Tests/Security/snyk-frontend.json" -Encoding utf8
Write-Host "✅ Frontend Snyk scan complete" -ForegroundColor Green

Write-Host ""
Write-Host "✅ All security tests complete!" -ForegroundColor Green
Write-Host "Reports saved to Tests/Security/" -ForegroundColor Cyan
```

---

## Interpreting Results

### npm audit Results

- **Critical**: Fix immediately
- **High**: Fix as soon as possible
- **Moderate**: Fix when convenient
- **Low**: Fix if time permits
- **Info**: Informational only

### Snyk Results

- Review vulnerability details
- Check if vulnerabilities are exploitable in your context
- Prioritize based on:
  - Severity
  - Whether vulnerable code is actually used
  - Ease of exploitation

### OWASP ZAP Results

- **High**: Critical security issues
- **Medium**: Important security issues
- **Low**: Minor security issues
- **Informational**: Best practices

---

## Remediation Steps

### For npm Vulnerabilities

1. **Automatic Fix:**
   ```bash
   npm audit fix
   ```

2. **Manual Fix:**
   - Review vulnerability details
   - Update affected packages manually
   - Test after updates

3. **Override (Not Recommended):**
   ```bash
   npm audit fix --force
   ```

### For Snyk Vulnerabilities

1. **Review Recommendations:**
   ```bash
   snyk wizard
   ```

2. **Apply Fixes:**
   - Update packages as suggested
   - Apply patches if available
   - Review and test changes

### General Security Improvements

1. Keep dependencies updated
2. Remove unused dependencies
3. Use security-focused packages
4. Implement security headers
5. Regular security audits

---

## Next Steps

After completing security testing:
1. Fix all critical and high vulnerabilities
2. Review and address medium vulnerabilities
3. Set up continuous monitoring (Snyk monitor)
4. Move to Accessibility Testing (see `../Accessibility/GUIDE.md`)

