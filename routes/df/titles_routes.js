const express = require("express");
const router = express.Router();
const titlesSchema = require("../../schemas/df/titles_schema");

// GET all titles
router.get("/all", async (req, res) => {
  try {
    const titles = await titlesSchema.find().sort({ created_at: -1 });
    const titlesList = titles.map(t => t.title);
    res.json(titlesList);
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// POST add new title
router.post("/add", async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const cleanTitle = title.trim();

    // Check if title already exists
    const existing = await titlesSchema.findOne({ title: cleanTitle });
    if (existing) {
      return res.status(409).json({ error: "Title already exists" });
    }

    const newTitle = new titlesSchema({ title: cleanTitle });
    const saved = await newTitle.save();

    res.json({
      message: "Title added successfully",
      title: saved.title,
      _id: saved._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// DELETE title
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await titlesSchema.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ error: "Title not found" });
    }

    res.json({ message: "Title deleted successfully", title: result.title });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// DELETE by title name (alternative)
router.post("/delete-by-name", async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = await titlesSchema.findOneAndDelete({ title: title.trim() });

    if (!result) {
      return res.status(404).json({ error: "Title not found" });
    }

    res.json({ message: "Title deleted successfully", title: result.title });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

module.exports = router;
