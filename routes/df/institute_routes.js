const express = require("express");
const router = express.Router();
const databaseSchema = require("../../schemas/df/institute_schema");
const studentSchema = require("../../schemas/m/student_schema");
const teacherSchema = require("../../schemas/m/teacher_schema");
const adminSchema = require("../../schemas/m/admin_schema");
const parentSchema = require("../../schemas/m/parent_schema");

// GET all institutes (used by SQUAD dropdown)
router.get("/all", async (req, res) => {
  try {
    const institutes = await databaseSchema.find();
    res.json(institutes);
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// GET all users mapped to a specific organization
router.get("/users/:org_id", async (req, res) => {
  try {
    const org_id = req.params.org_id;
    const [students, teachers, admins, parents] = await Promise.all([
      studentSchema.find({ organization_id: org_id }),
      teacherSchema.find({ organization_id: org_id }),
      adminSchema.find({ organization_id: org_id }),
      parentSchema.find({ organization_id: org_id }),
    ]);
    res.json({
      organization_id: org_id,
      students,
      teachers,
      administrators: admins,
      parents,
      total: students.length + teachers.length + admins.length + parents.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

router.post("/retrieve", (req, res) => {
    databaseSchema.find()
        .skip(req.body.skip)
        .limit(req.body.limit)
        .then(results => {
            res.json(results);
        })
});

router.post("/retrieve/:id", (req, res) => {
    let id = req.params.id;
    databaseSchema.find({_id: id})
        .exec()
        .then(resultList => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "ID not found!"
                });
            }
            if (resultList) {
                res.json(resultList[0]);
            }
        })
});

router.post("/add", (req, res) => {
    let databaseModel = new databaseSchema(req.body);
    databaseModel
        .save()
        .then(result => {
            res.status(200).json({
                message: "Added successfully",
                createdParent: result
            });
        })
        .catch(err => {
            res.status(400).json({
                message: "Adding new failed",
                error: err
            });
        });
});

router.post("/update/:id", (req, res) => {
    databaseSchema.updateOne({_id: req.params.id}, req.body)
        .then(result => {
            res.status(200).json({
                message: "Updated successfully",
                created: result
            });
        })
        .catch(err => {
            res.status(400).json({
                message: "Updating failed",
                error: err
            });
        });
});

router.post("/delete/:id", (req, res) => {
    databaseSchema.findOneAndDelete({_id: req.params.id})
        .then((result) => {
            res.json("Deleted successfully");
        })
        .catch((err) => {
            res.status(500).json(err);
        });
});

// DELETE by name (for SQUAD)
router.post("/delete-by-name", (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Institute name is required" });
    }
    databaseSchema.findOneAndDelete({ name: name.trim() })
        .then((result) => {
            if (!result) {
                return res.status(404).json({ error: "Institute not found" });
            }
            res.json({ message: "Deleted successfully", name: result.name });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message || err });
        });
});

module.exports = router;
