const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const constants = require("../../utils/constants");
const authSchema = require("../../schemas/auth_schema");
const studentSchema = require("../../schemas/m/student_schema");
const adminSchema = require("../../schemas/m/admin_schema");
const teacherSchema = require("../../schemas/m/teacher_schema");
const parentSchema = require("../../schemas/m/parent_schema");

router.post("/add", async (req, res) => {
  try {
    const {
      user_type_id,
      nic,
      password,
      email,
      passport,
      title_id,
      first_name,
      middle_name,
      last_name,
      sex,
      dob,
      phone,
      access_level_id,
      organization_id
    } = req.body;

    if (!nic || !password) {
      return res.status(400).json({ message: "NIC and Password are required parameters." });
    }

    // Check if user already exists in auth table
    const existingAuth = await authSchema.findOne({
      $or: [{ nic: nic }, { phone: phone }]
    });

    if (existingAuth) {
      return res.status(409).json({ message: "A user with this NIC or phone number already exists." });
    }

    const hash = bcrypt.hashSync(password, 8);
    const newObjectID = new mongoose.Types.ObjectId();

    // Map user_type_id to backend types and schemas
    let userType = constants.USER_TYPE_STUDENT;
    let targetSchema = studentSchema;
    let detailsField = "createdParent"; // SQUAD expects "createdParent" under results key in some parts

    const normalizedTypeId = (user_type_id || "").toLowerCase();

    if (normalizedTypeId === "administrator" || normalizedTypeId === "admin") {
      userType = constants.USER_TYPE_ADMIN;
      targetSchema = adminSchema;
    } else if (normalizedTypeId === "instructor" || normalizedTypeId === "teacher") {
      userType = constants.USER_TYPE_TEACHER;
      targetSchema = teacherSchema;
    } else if (normalizedTypeId === "parent") {
      userType = constants.USER_TYPE_PARENT;
      targetSchema = parentSchema;
    }

    const docData = {
      _id: newObjectID,
      user_type: userType,
      user_type_id: user_type_id,
      nic: nic,
      email: email,
      passport: passport,
      title_id: title_id,
      first_name: first_name,
      middle_name: middle_name,
      last_name: last_name,
      sex: sex,
      dob: dob ? new Date(dob) : undefined,
      phone: phone,
      access_level_id: access_level_id,
      is_active: true,
      organization_id: organization_id || null,
      // Full process data fields
      end_date: req.body.end_date,
      teacher_grade_id: req.body.teacher_grade_id,
      marital_status_id: req.body.marital_status_id,
      occupation_id: req.body.occupation_id
    };

    // If student or teacher, they can have reg_no
    if (userType === constants.USER_TYPE_STUDENT || userType === constants.USER_TYPE_TEACHER) {
      docData.reg_no = req.body.reg_no || `REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      docData.reg_date = req.body.reg_date || new Date();
    }

    const userModel = new targetSchema(docData);
    const savedUser = await userModel.save();

    const authModel = new authSchema({
      user_id: newObjectID,
      nic: nic,
      phone: phone,
      reg_no: docData.reg_no || nic,
      user_type: userType,
      password_hash: hash
    });

    await authModel.save();

    return res.status(201).json({
      message: "Added successfully",
      createdParent: savedUser
    });

  } catch (error) {
    console.error("Error in /df/register/add:", error);
    return res.status(500).json({
      message: "Adding new failed",
      error: error.message || error
    });
  }
});

module.exports = router;
