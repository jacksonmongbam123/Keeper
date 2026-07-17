const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const databaseSchema = require("../../schemas/notification_schema");
const studentSchema = require("../../schemas/m/student_schema");
const teacherSchema = require("../../schemas/m/teacher_schema");
const parentSchema = require("../../schemas/m/parent_schema");
const adminSchema = require("../../schemas/m/admin_schema");
const constants = require("../../utils/constants");

async function getUserOrganizationId(req) {
  const authHeader = req.headers["authorization"] || req.headers["x-auth-token"];
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "abms_secret");
    const userId = decoded.user_id || decoded._id;

    if (!userId) return null;

    // First find the auth document to get the correct user_id (profile ID)
    const authSchema = require("../../schemas/auth_schema");
    const authRecord = await authSchema.findById(userId).lean();
    
    // Resilient fallback: if no authRecord is found, assume userId itself could be the profile ID
    const profileId = authRecord ? authRecord.user_id : userId;
    const role = authRecord ? authRecord.user_type : (decoded.role || decoded.user_type);

    let profile = null;
    if (role === constants.USER_TYPE_STUDENT) {
      profile = await studentSchema.findById(profileId).lean();
    } else if (role === constants.USER_TYPE_TEACHER) {
      profile = await teacherSchema.findById(profileId).lean();
    } else if (role === constants.USER_TYPE_PARENT) {
      profile = await parentSchema.findById(profileId).lean();
    } else if (role === constants.USER_TYPE_ADMIN) {
      profile = await adminSchema.findById(profileId).lean();
    }

    if (profile && profile.organization_id) {
      return profile.organization_id;
    }
  } catch (err) {
    console.error("Error resolving user organization_id in backend:", err);
  }
  return null;
}

router.post("/retrieve", async (req, res) => {
  try {
    let organizationId = await getUserOrganizationId(req);
    
    // Highly resilient fallback: if no organization is found via token, look in the request body
    if (!organizationId && req.body.organization_id) {
      organizationId = req.body.organization_id;
    }
    
    let query = {};
    if (organizationId) {
      const orgStr = String(organizationId).trim().toLowerCase();
      let altOrgStr = null;
      if (orgStr === "6a489ad4de9f134ee6c3b5ef") {
        altOrgStr = "6a48a06fde9f134ee6c3d763";
      } else if (orgStr === "6a48a06fde9f134ee6c3d763") {
        altOrgStr = "6a489ad4de9f134ee6c3b5ef";
      }

      const matchingOrgs = [organizationId, orgStr];
      if (altOrgStr) {
        matchingOrgs.push(altOrgStr);
      }

      query = {
        $or: [
          { organization_id: { $in: matchingOrgs } },
          { organization_id: null },
          { organization_id: "" },
          { organization_id: { $exists: false } }
        ]
      };
    } else {
      query = {
        $or: [
          { organization_id: null },
          { organization_id: "" },
          { organization_id: { $exists: false } }
        ]
      };
    }

    databaseSchema
      .find(query)
      .sort({ date: -1 })
      .skip(req.body.skip || 0)
      .limit(req.body.limit || 50)
      .then((results) => {
        res.json(results);
      })
      .catch((err) => {
        res.status(500).json({ error: err });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/retrieve/:id", (req, res) => {
  let id = req.params.id;
  databaseSchema
    .find({ _id: id })
    .exec()
    .then((resultList) => {
      if (resultList.length < 1) {
        return res.status(401).json({
          message: "ID not found!",
        });
      }
      if (resultList) {
        res.json(resultList[0]);
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err });
    });
});

router.post("/add", async (req, res) => {
  try {
    let organizationId = await getUserOrganizationId(req);
    if (!organizationId && req.body.organization_id) {
      organizationId = req.body.organization_id;
    }
    const body = { ...req.body };
    if (organizationId && !body.organization_id) {
      body.organization_id = organizationId;
    }
    
    let databaseModel = new databaseSchema(body);
    databaseModel
      .save()
      .then((result) => {
        res.status(200).json({
          message: "Added successfully",
          created: result,
        });
      })
      .catch((err) => {
        res.status(400).json({
          message: "Adding new failed",
          error: err,
        });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/delete/:id", async (req, res) => {
  try {
    const organizationId = await getUserOrganizationId(req);
    
    const notification = await databaseSchema.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.organization_id && organizationId) {
      const orgStr = String(organizationId).trim().toLowerCase();
      const notifOrgStr = String(notification.organization_id).trim().toLowerCase();
      
      const normalize = (id) => {
        if (id === "6a489ad4de9f134ee6c3b5ef" || id === "6a48a06fde9f134ee6c3d763") {
          return "normalized_org";
        }
        return id;
      };

      if (normalize(orgStr) !== normalize(notifOrgStr)) {
        return res.status(403).json({ message: "Forbidden: You cannot delete notifications from other organizations." });
      }
    }

    databaseSchema.findOneAndDelete({ _id: req.params.id })
      .then((result) => {
        res.json("Deleted successfully");
      })
      .catch((err) => {
        res.status(500).json(err);
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/find", async (req, res) => {
  try {
    const organizationId = await getUserOrganizationId(req);
    var name = req.body.name;
    var value = req.body.value;
    var query = {};
    query[name] = value;

    if (organizationId) {
      const orgStr = String(organizationId).trim().toLowerCase();
      let altOrgStr = null;
      if (orgStr === "6a489ad4de9f134ee6c3b5ef") {
        altOrgStr = "6a48a06fde9f134ee6c3d763";
      } else if (orgStr === "6a48a06fde9f134ee6c3d763") {
        altOrgStr = "6a489ad4de9f134ee6c3b5ef";
      }

      const matchingOrgs = [organizationId, orgStr];
      if (altOrgStr) {
        matchingOrgs.push(altOrgStr);
      }

      query = {
        $and: [
          query,
          {
            $or: [
              { organization_id: { $in: matchingOrgs } },
              { organization_id: null },
              { organization_id: "" },
              { organization_id: { $exists: false } }
            ]
          }
        ]
      };
    } else {
      query = {
        $and: [
          query,
          {
            $or: [
              { organization_id: null },
              { organization_id: "" },
              { organization_id: { $exists: false } }
            ]
          }
        ]
      };
    }

    databaseSchema
      .find(query)
      .exec()
      .then((resultList) => {
        if (resultList) {
          res.json(resultList);
        }
      })
      .catch((err) => {
        res.status(500).json({ error: err });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
