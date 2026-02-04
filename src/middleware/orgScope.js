export function applyOrgScope(req, res, next) {
  if (req.user?.role_slug !== "super_admin" && req.user?.company_id) {
    req.scopeWhere = { ...(req.scopeWhere || {}), company_id: req.user.company_id };
  }
  next();
}
