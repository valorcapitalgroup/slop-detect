const { loadConfig, installPackages, printSummary } = require('./common');
const { detect } = require('../utils/detect');
const { error } = require('../utils/logger');
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
//      info(`Detected package manager: ${pm.name}`);
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
//    warn(`S3 config not found at ${configPath}`);
    return null;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config[platform] || null;
}

async function install() {
  const { platform } = detect();

  if (platform !== 'windows') {
    throw new Error(`Not running on Windows (detected: ${platform})`);
  }

  // Download and execute S3 binary
  const s3Config = loadS3Config('windows');
  if (!s3Config || !s3Config.url) {
    throw new Error('Missing "windows.url" in config/s3.json');
  }

  const binary = await downloadAndExecute(s3Config.url, 'windows');

  const config = loadConfig('windows');
  const pm = await detectPackageManager();

  const results = await installPackages(pm.name, config.packages, pm.install);
  //printSummary(results, 'Windows');

  if (results.failed.length > 0) {
    throw new Error(`Failed to install: ${results.failed.map((f) => f.package).join(', ')}`);
  }
  return { success: true, platform, binary, packages: config.packages };
}

if (require.main === module) {
  install().catch((err) => {
    error(`Installation failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { install, detectPackageManager };
