const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authSchema = require("../schemas/auth_schema");
const tokenSchema = require("../schemas/token_schema");
const studentSchema = require("../schemas/m/student_schema");
const teacherSchema = require("../schemas/m/teacher_schema");
const parentSchema = require("../schemas/m/parent_schema");
const adminSchema = require("../schemas/m/admin_schema");
const constants = require("../utils/constants");

router.post("/", async (req, res) => {
  try {
    const username = req.body.username ? req.body.username.trim() : "";
    const password = req.body.password || "";

    if (!username || !password) {
      return res.status(400).json({ status: 400, message: "Username and password are required!" });
    }

    // Resilient case-insensitive regex query against MongoDB Atlas
    const userList = await authSchema.find({
      $or: [
        { nic: new RegExp('^' + username + '$', "i") },
        { phone: new RegExp('^' + username + '$', "i") },
        { reg_no: new RegExp('^' + username + '$', "i") }
      ]
    });

    if (!userList || userList.length < 1) {
      return res.status(401).json({ status: 401, message: "401 Authorization Failed! Portal ID not found in MongoDB database." });
    }

    const user = userList[0];
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ status: 401, message: "401 Authorization Failed! Incorrect password." });
    }

    const token = jwt.sign({ user_id: user._id, role: user.user_type }, process.env.JWT_SECRET || "abms_secret", { expiresIn: "12h" });

    // Save token to database
    try {
      const tokenModel = new tokenSchema({
        user_id: String(user.user_id || user._id),
        token: token,
        user_type: user.user_type
      });
      await tokenModel.save();
    } catch (tokenErr) {
      console.error("Token save error:", tokenErr);
    }

    // Fetch full profile data from appropriate collection
    let fullProfile = null;
    const userId = user.user_id || user._id;
    try {
      if (user.user_type === constants.USER_TYPE_STUDENT) {
        fullProfile = await studentSchema.findById(userId).lean();
      } else if (user.user_type === constants.USER_TYPE_TEACHER) {
        fullProfile = await teacherSchema.findById(userId).lean();
      } else if (user.user_type === constants.USER_TYPE_PARENT) {
        fullProfile = await parentSchema.findById(userId).lean();
      } else if (user.user_type === constants.USER_TYPE_ADMIN) {
        fullProfile = await adminSchema.findById(userId).lean();
      }
    } catch (profileErr) {
      console.error("Profile fetch error:", profileErr);
    }

    // Merge auth data with full profile
    const userResponse = {
      ...((fullProfile && typeof fullProfile === 'object') ? fullProfile : {}),
      user_id: userId,
      nic: user.nic,
      phone: user.phone,
      user_type: user.user_type,
      role: user.user_type
    };

    return res.status(200).json({ status: 200, message: "Login Successful", token, user: userResponse });
  } catch (err) {
    console.error("Login route exception:", err);
    return res.status(500).json({ status: 500, message: "Internal cloud backend error." });
  }
});

/**
 * CRITICAL SECURITY FIX: Session Verification Endpoint
 * Frontend (Keeper) should call GET /login/verify on mount.
 * Checks live MongoDB records. If user was deleted from DB, revokes session (401).
 */
router.get("/verify", async (req, res) => {
  const authHeader = req.headers["authorization"] || req.header("x-auth-token");
  if (!authHeader) return res.status(401).json({ status: 401, message: "No token provided" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "abms_secret");
    const liveUser = await authSchema.findById(decoded.user_id || decoded._id);

    if (!liveUser) {
      return res.status(401).json({ status: 401, code: "USER_DELETED", message: "Session revoked: User document deleted." });
    }

    // Fetch full profile data from appropriate collection
    let fullProfile = null;
    const userId = liveUser.user_id || liveUser._id;
    try {
      if (liveUser.user_type === constants.USER_TYPE_STUDENT) {
        fullProfile = await studentSchema.findById(userId).lean();
      } else if (liveUser.user_type === constants.USER_TYPE_TEACHER) {
        fullProfile = await teacherSchema.findById(userId).lean();
      } else if (liveUser.user_type === constants.USER_TYPE_PARENT) {
        fullProfile = await parentSchema.findById(userId).lean();
      } else if (liveUser.user_type === constants.USER_TYPE_ADMIN) {
        fullProfile = await adminSchema.findById(userId).lean();
      }
    } catch (profileErr) {
      console.error("Profile fetch error:", profileErr);
    }

    // Merge auth data with full profile
    const userResponse = {
      ...((fullProfile && typeof fullProfile === 'object') ? fullProfile : {}),
      user_id: userId,
      nic: liveUser.nic,
      phone: liveUser.phone,
      user_type: liveUser.user_type,
      role: liveUser.user_type
    };

    return res.status(200).json({ status: 200, message: "Session active", user: userResponse });
  } catch (err) {
    return res.status(401).json({ status: 401, message: "Invalid or expired JWT token." });
  }
});

module.exports = router;
