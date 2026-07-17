const express = require("express");
const router = express.Router();
const databaseSchema = require("../../schemas/df/section_schema");

// GET all sections (for SQUAD and Keeper dropdowns)
router.get("/all", async (req, res) => {
  try {
    const sections = await databaseSchema.find();
    const sectionsList = sections.map(s => s.section).filter(Boolean);
    res.json(sectionsList);
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

router.post("/retrieve", (req, res) => {
  const databaseModel = databaseSchema.find();
  databaseModel
    .exec()
    .then((resultList) => {
      if (resultList) {
        res.json(resultList);
      }
    });
});

router.post("/add", (req, res) => {
  const databaseModel = new databaseSchema(req.body);
  databaseModel
    .save()
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.status(400).json({
        message: "Adding new section failed",
        error: err
      });
    });
});

router.post("/update/:id", (req, res) => {
  databaseSchema
    .findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
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

// DELETE by section name (for SQUAD)
router.post("/delete-by-name", (req, res) => {
  const { section } = req.body;
  if (!section || !section.trim()) {
    return res.status(400).json({ error: "Section name is required" });
  }
  databaseSchema.findOneAndDelete({ section: section.trim() })
    .then((result) => {
      if (!result) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.json({ message: "Deleted successfully", section: result.section });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message || err });
    });
});

module.exports = router;
