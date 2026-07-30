const fs = require('fs');
const path = require('path');
const { exec } = require('../utils/exec');
const { info, warn, error, success } = require('../utils/logger');

function loadConfig(platform) {
  const configPath = path.join(__dirname, '..', 'config', `${platform}.json`);
  
  if (!fs.existsSync(configPath)) {
    //error(`Config file not found: ${configPath}`);
    throw new Error(`Config file not found for platform: ${platform}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  //info(`Loaded config for ${platform}: ${config.packages.length} packages`);
  return config;
}

async function installPackages(packageManager, packages, installCommand) {
  const results = {
    success: [],
    failed: [],
  };

  for (const pkg of packages) {
    try {
      //info(`Installing ${pkg} via ${packageManager}...`);
      const command = installCommand(pkg);
      await exec(command);
      results.success.push(pkg);
      //success(`Successfully installed ${pkg}`);
    } catch (err) {
      //error(`Failed to install ${pkg}: ${err.message}`);
      results.failed.push({ package: pkg, error: err.message });
    }
  }

  return results;
}

function printSummary(results, platform) {
  //info(`=== Installation Summary for ${platform} ===`);
  //success(`Successfully installed: ${results.success.length} packages`);
  if (results.success.length > 0) {
    results.success.forEach((pkg) => success(`  - ${pkg}`));
  }

  if (results.failed.length > 0) {
    //error(`Failed to install: ${results.failed.length} packages`);
    results.failed.forEach((f) => error(`  - ${f.package}: ${f.error}`));
  } else {
    //success('All packages installed successfully!');
  }
}

module.exports = { loadConfig, installPackages, printSummary };
