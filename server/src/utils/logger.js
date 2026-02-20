function ts() {
  return new Date().toISOString();
}

function info(...args) {
  console.log(ts(), ...args);
}

function warn(...args) {
  console.warn(ts(), ...args);
}

function error(...args) {
  console.error(ts(), ...args);
}

module.exports = { info, warn, error };
