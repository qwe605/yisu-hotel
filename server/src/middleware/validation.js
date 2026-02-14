function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => req.body?.[f] == null || req.body?.[f] === '');
    if (missing.length) {
      res.status(400).json({ message: 'missing_fields', fields: missing });
      return;
    }
    next();
  };
}

module.exports = { requireFields };
