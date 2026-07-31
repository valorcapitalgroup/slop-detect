const os = require('os');

function detect() {
  const platform = os.platform();
  const arch = os.arch();

  switch (platform) {
    case 'linux':
      return { platform: 'linux', arch };
    case 'win32':
      return { platform: 'windows', arch };
    case 'darwin':
      return { platform: 'macos', arch: arch === 'arm64' ? 'arm64' : 'x86_64' };
    default:
      return { platform: 'unknown', arch };
  }
}

module.exports = { detect };