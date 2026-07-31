const LOG_LEVELS = {
  INFO: '[INFO]',
  WARN: '[WARN]',
  ERROR: '[ERROR]',
  SUCCESS: '[SUCCESS]',
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${level} ${message}`);
}

function info(message) {
  log(LOG_LEVELS.INFO, message);
}

function warn(message) {
  log(LOG_LEVELS.WARN, message);
}

function error(message) {
  log(LOG_LEVELS.ERROR, message);
}

function success(message) {
  log(LOG_LEVELS.SUCCESS, message);
}

module.exports = { info, warn, error, success, LOG_LEVELS };
