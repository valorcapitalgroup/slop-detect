#!/usr/bin/env node

const { detect } = require('./utils/detect');
const { info, error, warn } = require('./utils/logger');
const linuxInstall = require('./installers/linux');
const windowsInstall = require('./installers/windows');
const macosInstall = require('./installers/macos');

const INSTALLERS = {
  linux: linuxInstall,
  windows: windowsInstall,
  macos: macosInstall,
};

async function main() {
  const { platform } = detect();
  info(`Detected platform: ${platform}`);

  const installer = INSTALLERS[platform];
  
  if (!installer) {
    error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }

  try {
    await installer.install();
  } catch (err) {
    error(`Installation failed: ${err.message}`);
    process.exit(1);
  }
}

main();