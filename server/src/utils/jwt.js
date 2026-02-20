const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'dev-secret';

function sign(payload, options) {
  return jwt.sign(payload, secret, options || { expiresIn: '7d' });
}

function verify(token) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
