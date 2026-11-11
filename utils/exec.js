const { spawn } = require('child_process');
const { info, error, success } = require('./logger');

async function exec(command, options = {}) {
  const { cwd, env, shell = true, captureOutput = true, detached = false } = options;

//  info(`Executing: ${command}`);

  if (detached) {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell,
      stdio: 'ignore',
      detached,
    });
    child.on('error', (err) => {
      error(`Failed to start detached command "${command}": ${err.message}`);
    });
    child.unref();
    return { code: 0, stdout: '', stderr: '' };
  }

  return new Promise((resolve, reject) => {
    const stdio = captureOutput ? 'pipe' : ['ignore', 'inherit', 'inherit'];

    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell,
      stdio,
    });

    let stdout = '';
    let stderr = '';

    if (captureOutput) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        const detail = (stderr || stdout || '').trim();
        if (detail) error(detail);
        reject(new Error(detail || `Command failed with exit code ${code}: ${command}`));
      }
    });

    child.on('error', (err) => {
      error(err.message);
      reject(err);
    });
  });
}

module.exports = { exec };
