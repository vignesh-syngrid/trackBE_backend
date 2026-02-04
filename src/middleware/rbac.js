import { Screen, RoleScreenPermission, Role } from "../models/index.js";

export function rbac(screenName, action) {
  return async function (req, res, next) {
    try {
      // Super admin bypass
      if (req.user?.role_slug === "super_admin") return next();

      const roleId = req.user?.role_id;
      if (!roleId) return res.status(401).json({ message: "Unauthenticated" });

      // Find screen by name (exact match)
      const screen = await Screen.findOne({ where: { name: screenName } });
      if (!screen) {
        return res
          .status(403)
          .json({ message: `Permission denied: '${screenName}' is not available. Contact an administrator.` });
      }

      // Resolve PK of Screen safely
      const screenPkAttr = Screen.primaryKeyAttribute || "screen_id";
      const screenId = screen.get ? screen.get(screenPkAttr) : screen[screenPkAttr];

      // Optional: sanity check role exists (useful during debugging)
      // const role = await Role.findByPk(roleId);
      // if (!role) return res.status(403).json({ message: "Forbidden: role not found" });

      // Fetch permission
      const perm = await RoleScreenPermission.findOne({
        where: { role_id: roleId, screen_id: screenId },
      });
      if (!perm) {
        return res
          .status(403)
          .json({ message: `Permission denied: You do not have access to '${screenName}'. Contact an administrator.` });
      }

      const fieldMap = { view: "can_view", add: "can_add", edit: "can_edit", delete: "can_delete" };
      const actionVerbMap = { view: "view", add: "create", edit: "update", delete: "delete" };
      const field = fieldMap[action] || "can_view";

      if (!perm[field]) {
        const verb = actionVerbMap[action] || action || "perform this action on";
        return res
          .status(403)
          .json({ message: `Permission denied: You are not allowed to ${verb} '${screenName}'. Contact an administrator if you need this access.` });
      }

      return next();
    } catch (e) {
      return next(e);
    }
  };
}
