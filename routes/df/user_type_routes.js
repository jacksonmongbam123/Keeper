const express = require("express");
const router = express.Router();
const databaseSchema = require("../../schemas/df/user_type_schema");

// GET all user types (for SQUAD and Keeper dropdowns)
router.get("/all", async (req, res) => {
  try {
    const userTypes = await databaseSchema.find();
    const userTypesList = userTypes.map(u => ({ _id: u._id, type_name: u.type_name })).filter(u => u.type_name);
    res.json(userTypesList);
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
        return res.status(400).json({ error: "Name is required" });
    }

    databaseSchema.findOneAndDelete({ type_name: name.trim() })
        .then((result) => {
            if (!result) {
                return res.status(404).json({ error: "User type not found" });
            }
            res.json({ message: "Deleted successfully" });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message || err });
        });
});

module.exports = router;
