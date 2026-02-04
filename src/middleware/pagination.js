export function parseListQuery(req, res, next) {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 200);
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "createdAt";
  const order = (req.query.order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";
  req.listQuery = { page, limit, offset, sortBy, order };
  next();
}
