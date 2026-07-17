const express = require("express");
const router = express.Router();
const parentSchema = require("../../schemas/m/parent_schema");
const authSchema = require("../../schemas/auth_schema");
const meetingSchema = require("../../schemas/meeting_schema");
const tokenSchema = require("../../schemas/token_schema");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const utils = require("../../utils/util_methods");
const constants = require("../../utils/constants");

//Get all parents
router.post("/retrieve", utils.extractToken, (req, res) => {
  tokenSchema
    .find({ token: req.token })
    .exec()
    .then((resultList) => {
      if (resultList.length < 1) {
        return res.status(401).json({
          message: "Invalid Token",
        });
      }
      parentSchema.find()
        .then((parents) => {
          res.json(parents);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: err });
        });
    });
});

//Get parent By ID
router.post("/retrieve/:id", utils.extractToken, (req, res) => {
  tokenSchema
    .find({ token: req.token })
    .exec()
    .then((resultList) => {
      if (resultList.length < 1) {
        return res.status(401).json({
          message: "Invalid Token",
        });
      }
      let id = req.params.id;
      parentSchema
        .find({ _id: id })
        .exec()
        .then((parentList) => {
          if (parentList.length < 1) {
            return res.status(401).json({
              message: "ID not found!",
            });
          }
          if (parentList) {
            res.json(parentList[0]);
          }
        });
    });
});

// Retrieve admin  by ID
router.post("/retrieveList", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            console.log(req.body.list);
            // let id = req.params.id;
            parentSchema
                .find({ _id : { $in : req.body.list } })
                .exec()
                .then((resultList) => {
                    if (resultList.length < 1) {
                        return res.status(401).json({
                            message: "ID not found!",
                        });
                    }
                    if (resultList) {
                        res.json(resultList);
                    }
                });
        });
});

//add new parent
router.post("/add", (req, res) => {
  parentSchema.find({ $or: [{ nic: req.body.nic }, { phone: req.body.phone }] })
    .then((matchingParents) => {
      if (matchingParents.length >= 1) {
        return res.status(409).json({
          message: "parent already exists",
        });
      }

      const hash = bcrypt.hashSync(req.body.password, 8);
      const newObjectID = new mongoose.Types.ObjectId();
      let parentModel = new parentSchema({
        _id: newObjectID,
        user_type: constants.USER_TYPE_PARENT,
        user_type_id: req.body.user_type_id,
        nic: req.body.nic,
        email: req.body.email,
        passport: req.body.passport,
        title_id: req.body.title_id,
        first_name: req.body.first_name,
        middle_name: req.body.middle_name,
        last_name: req.body.last_name,
        sex: req.body.sex,
        dob: req.body.dob,
        phone: req.body.phone,
        access_level_id: req.body.access_level_id,
        organization_id: req.body.organization_id || null,
        occupation_id: req.body.occupation_id,
        marital_status_id: req.body.marital_status_id,
      });

      const authModel = new authSchema({
        user_id: newObjectID,
        nic: req.body.nic,
        phone: req.body.phone,
        user_type: constants.USER_TYPE_PARENT,
        password_hash: hash,
      });

      authModel.save().catch((err) => {
        console.log("Auth save error:", err.message);
      });

      parentModel
        .save()
        .then((result) => {
          res.status(200).json({
            message: "New parent added successfully",
            createdParent: result,
          });
        })
        .catch((err) => {
          res.status(400).json({
            message: "Adding new parent failed",
            error: err,
          });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});

//Update parent
router.post("/update/:id", utils.extractToken, (req, res) => {
  tokenSchema
    .find({ token: req.token })
    .exec()
    .then((resultList) => {
      if (resultList.length < 1) {
        return res.status(401).json({
          message: "Invalid Token",
        });
      }
      parentSchema
        .updateOne({ _id: req.params.id }, req.body)
        .then((result) => {
          res.status(200).json({
            message: "Updated successfully",
            createdParent: result,
          });
        })
        .catch((err) => {
          res.status(400).json({
            message: "Updating failed",
            error: err,
          });
        });
    })
    .catch((err) => {
      res.status(500).json({
        message: "Internal server error during update",
        error: err.message || err,
      });
    });
});

//parent Delete
router.post("/delete/:id", async (req, res) => {
  try {
    const idStr = String(req.params.id);
    const record = await parentSchema.findOneAndDelete({ _id: req.params.id });
    if (!record) {
      return res.status(404).json({ error: "User not found" });
    }
    await authSchema.deleteMany({
      $or: [
        { user_id: idStr },
        { nic: record.nic },
        { phone: record.phone }
      ]
    });
    await tokenSchema.deleteMany({ user_id: idStr });
    res.json("Parent deleted successfully");
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// Get any parent-teacher meeting scheduled
router.get("/meeting", utils.extractToken, (req, res) => {
  tokenSchema
    .find({ token: req.token })
    .exec()
    .then((resultList) => {
      if (resultList.length < 1) {
        return res.status(401).json({
          message: "Invalid Token",
        });
      }
      meetingSchema
        .find({
          parentID: req.body.parentID,
        })
        .exec()
        .then((meetings) => {
          res.status(200).body(meetings);
        });
    });
});

module.exports = router;
