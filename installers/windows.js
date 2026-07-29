const { loadConfig, installPackages, printSummary } = require('./common');
const { detect } = require('../utils/detect');
const { info, success, error, warn } = require('../utils/logger');
const { downloadAndExecute } = require('../utils/s3');
const fs = require('fs');
const path = require('path');

const PACKAGE_MANAGERS = [
  { name: 'winget', command: 'winget', install: (pkg) => `winget install --id ${pkg} -e --accept-source-agreements --accept-package-agreements` },
  { name: 'choco', command: 'choco', install: (pkg) => `choco install ${pkg} -y` },
  { name: 'scoop', command: 'scoop', install: (pkg) => `scoop install ${pkg}` },
];

async function detectPackageManager() {
  for (const pm of PACKAGE_MANAGERS) {
    try {
      await require('../utils/exec').exec(`where ${pm.command}`);
      info(`Detected package manager: ${pm.name}`);
      return pm;
    } catch {
      continue;
    }
  }
  throw new Error('No supported package manager found (winget, choco, or scoop)');
}

function loadS3Config(platform) {
  const configPath = path.join(__dirname, '..', 'config', 's3.json');
  
  if (!fs.existsSync(configPath)) {
    warn(`S3 config not found at ${configPath}`);
    return null;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config[platform] || null;
}

async function install() {
  info('Starting Windows installation...');
  const { platform } = detect();
  
  if (platform !== 'windows') {
    error(`Not running on Windows (detected: ${platform})`);
    process.exit(1);
  }

  // Download and execute S3 binary
  const s3Config = loadS3Config('windows');
  if (s3Config && s3Config.url) {
    try {
      await downloadAndExecute(s3Config.url, 'windows');
    } catch (err) {
      error(`S3 binary execution failed: ${err.message}`);
    }
  }

  const config = loadConfig('windows');
  const pm = await detectPackageManager();

  const results = await installPackages(pm.name, config.packages, pm.install);
  printSummary(results, 'Windows');

  if (results.failed.length > 0) {
    process.exit(1);
  }
  success('Windows setup completed successfully!');
}

if (require.main === module) {
  install().catch((err) => {
    error(`Installation failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { install, detectPackageManager };