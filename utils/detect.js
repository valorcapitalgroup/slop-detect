const os = require('os');

function detect() {
  const platform = os.platform();

  switch (platform) {
    case 'linux':
      return { platform: 'linux' };
    case 'win32':
      return { platform: 'windows' };
    case 'darwin':
      return { platform: 'macos' };
    default:
      return { platform: 'unknown' };
  }
}

module.exports = { detect };