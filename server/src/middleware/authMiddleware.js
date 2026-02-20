const { verify } = require('../utils/jwt');

function authOptional(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) {
    const token = h.slice(7);
    const payload = verify(token);
    if (payload) req.user = payload;
  }
  next();
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  res.status(401).json({ message: 'unauthorized' });
}

module.exports = { authOptional, requireAuth };
