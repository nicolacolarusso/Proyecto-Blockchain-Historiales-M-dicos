module.exports = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tiene permisos para realizar esta accion'
      });
    }
    next();
  };
};
