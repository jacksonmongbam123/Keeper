/**
 * Live MongoDB Authentication Guard Middleware
 * Resolves the issue where deleted users can still access protected routes.
 * Unlike standard stateless jwt.verify, this queries MongoDB to confirm the record still exists.
 */
const jwt = require("jsonwebtoken");
const authSchema = require("../schemas/auth_schema");

module.exports = async function (req, res, next) {
  const authHeader = req.headers["authorization"] || req.header("x-auth-token");
  if (!authHeader) {
    return res.status(401).json({ status: 401, message: "Access Denied: No authentication token provided." });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "abms_secret");

    // LIVE DB CHECK: Confirm user document still exists in MongoDB
    const existingUser = await authSchema.findById(decoded.user_id || decoded._id);
    if (!existingUser) {
      return res.status(401).json({
        status: 401,
        code: "USER_DELETED",
        message: "Session Terminated: User account has been removed from the database."
      });
    }

    req.user = existingUser;
    next();
  } catch (err) {
    return res.status(401).json({ status: 401, message: "Token expired or invalid." });
  }
};
