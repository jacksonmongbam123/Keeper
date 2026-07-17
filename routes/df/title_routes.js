const express = require("express");
const router = express.Router();
const databaseSchema = require("../../schemas/df/title_schema");

// GET all titles (for SQUAD and Keeper dropdowns)
router.get("/all", async (req, res) => {
    try {
        const titles = await databaseSchema.find();
        const titlesList = titles.map(t => ({ _id: t._id, title: t.title }));
        res.json(titlesList);
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

// DELETE by title name (for SQUAD)
router.post("/delete-by-name", (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
    }
    databaseSchema.findOneAndDelete({ title: title.trim() })
        .then((result) => {
            if (!result) {
                return res.status(404).json({ error: "Title not found" });
            }
            res.json({ message: "Deleted successfully", title: result.title });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message || err });
        });
});

module.exports = router;
