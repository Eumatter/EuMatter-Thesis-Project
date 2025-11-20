import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to find Brave browser executable
function findBraveExecutable() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Common Brave installation paths on Windows
    const possiblePaths = [
      path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ];
    
    for (const bravePath of possiblePaths) {
      if (fs.existsSync(bravePath)) {
        return bravePath;
      }
    }
  } else if (platform === 'darwin') {
    // macOS
    const bravePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
    if (fs.existsSync(bravePath)) {
      return bravePath;
    }
  } else if (platform === 'linux') {
    // Linux
    const possiblePaths = [
      '/usr/bin/brave-browser',
      '/usr/bin/brave',
      '/snap/bin/brave',
    ];
    
    for (const bravePath of possiblePaths) {
      if (fs.existsSync(bravePath)) {
        return bravePath;
      }
    }
  }
  
  return null;
}

async function runAccessibilityTest() {
  console.log('🚀 Starting Accessibility Test...\n');

  // Try to find Brave browser or use custom path from environment
  const customPath = process.env.CHROME_PATH || process.env.BRAVE_PATH;
  const bravePath = customPath || findBraveExecutable();
  const chromeFlags = ['--headless', '--no-sandbox', '--disable-gpu'];
  
  let chrome;
  
  if (bravePath) {
    // Verify the path exists
    if (!fs.existsSync(bravePath)) {
      console.error(`\n❌ Error: Browser path not found: ${bravePath}`);
      console.error('   Please check the path and try again.\n');
      process.exit(1);
    }
    
    console.log('🌐 Using Brave browser...');
    console.log(`   Path: ${bravePath}\n`);
    chrome = await launchChrome({
      chromePath: bravePath,
      chromeFlags: chromeFlags
    });
  } else {
    console.log('🌐 Attempting to launch Chrome/Brave...');
    try {
      chrome = await launchChrome({
        chromeFlags: chromeFlags
      });
    } catch (error) {
      if (error.code === 'ERR_LAUNCHER_NOT_INSTALLED') {
        console.error('\n❌ Error: No Chrome or Brave browser found!');
        console.error('\n💡 Solutions:');
        console.error('   1. Install Google Chrome or Brave browser');
        console.error('   2. Or specify the browser path manually:');
        console.error('      $env:CHROME_PATH="C:\\path\\to\\brave.exe"; node Tests/Accessibility/run-accessibility-test.js');
        console.error('      $env:BRAVE_PATH="C:\\path\\to\\brave.exe"; node Tests/Accessibility/run-accessibility-test.js');
        console.error('\n   Common Brave locations on Windows:');
        console.error('   - %LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe');
        console.error('   - C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe');
        console.error('\n   To find your Brave path, run:');
        console.error('   Get-Command brave | Select-Object -ExpandProperty Source');
        process.exit(1);
      }
      throw error;
    }
  }
  
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['accessibility'],
    port: chrome.port,
  };

  const targetUrl = process.env.TEST_URL || 'http://localhost:5173';
  console.log(`🌐 Testing URL: ${targetUrl}\n`);

  // Run Lighthouse
  console.log('🔍 Running Lighthouse accessibility audit...');
  const runnerResult = await lighthouse(targetUrl, options);

  // Save HTML report
  const reportPath = path.join(__dirname, 'lighthouse-accessibility-report.html');
  fs.writeFileSync(reportPath, runnerResult.report);
  console.log(`✅ Report saved to: ${reportPath}`);

  // Extract and log score
  const accessibilityScore = runnerResult.lhr.categories.accessibility.score * 100;
  console.log(`\n📊 Accessibility Score: ${accessibilityScore.toFixed(0)}/100`);

  // Log issues
  const audits = runnerResult.lhr.audits;
  const failedAudits = Object.values(audits).filter(
    audit => audit.score !== null && audit.score < 1
  );
  
  if (failedAudits.length > 0) {
    console.log(`\n⚠️  Accessibility Issues Found: ${failedAudits.length}\n`);
    
    // Group by severity
    const errors = failedAudits.filter(a => a.score === 0);
    const warnings = failedAudits.filter(a => a.score > 0 && a.score < 1);
    
    if (errors.length > 0) {
      console.log('❌ Errors (Must Fix):');
      errors.forEach(audit => {
        console.log(`   - ${audit.title}`);
        if (audit.description) {
          console.log(`     ${audit.description.substring(0, 100)}...`);
        }
      });
      console.log('');
    }
    
    if (warnings.length > 0) {
      console.log('⚠️  Warnings (Should Fix):');
      warnings.slice(0, 10).forEach(audit => {
        console.log(`   - ${audit.title}`);
      });
      if (warnings.length > 10) {
        console.log(`   ... and ${warnings.length - 10} more warnings`);
      }
    }
  } else {
    console.log('\n✅ No accessibility issues found!');
  }

  // Save JSON summary
  const summary = {
    score: accessibilityScore,
    timestamp: new Date().toISOString(),
    url: targetUrl,
    issues: {
      errors: failedAudits.filter(a => a.score === 0).length,
      warnings: failedAudits.filter(a => a.score > 0 && a.score < 1).length,
      total: failedAudits.length,
    },
    failedAudits: failedAudits.map(audit => ({
      title: audit.title,
      description: audit.description,
      score: audit.score,
    })),
  };

  const summaryPath = path.join(__dirname, 'accessibility-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n📄 Summary saved to: ${summaryPath}`);

  // Close Chrome
  await chrome.kill();
  console.log('\n✅ Accessibility test complete!');
  
  return summary;
}

// Run the test
runAccessibilityTest()
  .then(summary => {
    process.exit(summary.issues.errors > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ Error running accessibility test:', error);
    process.exit(1);
  });

