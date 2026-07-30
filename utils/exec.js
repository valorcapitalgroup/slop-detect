const { spawn } = require('child_process');
const { info, error, success } = require('./logger');

async function exec(command, options = {}) {
  const { cwd, env, shell = true, captureOutput = true } = options;

  info(`Executing: ${command}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell,
      stdio: captureOutput ? 'pipe' : 'inherit',
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
        if (stderr) error(stderr);
        reject(new Error(`{stderr}`));
      }
    });

    child.on('error', (err) => {
      error(err.message);
      reject(err);
    });
  });
}

module.exports = { exec };
