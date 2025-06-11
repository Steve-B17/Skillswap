const roleAuth = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Admin has access to everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has required role
      if (Array.isArray(roles)) {
        if (!roles.includes(req.user.role)) {
          throw new Error(`Required roles: ${roles.join(', ')}`);
        }
      } else if (req.user.role !== roles) {
        throw new Error(`Required role: ${roles}`);
      }

      next();
    } catch (error) {
      res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        message: error.message,
        currentRole: req.user.role,
        requiredRole: roles
      });
    }
  };
};

module.exports = roleAuth; 