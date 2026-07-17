const express = require("express");
const router = express.Router();
const utils = require("../utils/util_methods");
const tokenSchema = require("../schemas/token_schema");
const timetableSchema = require("../schemas/timetable_schema");

// Retrieve timetable (all or filtered by class_id)
router.post("/retrieve", (req, res) => {
    let query = {};
    if (req.body.class_id) {
        query.class_id = req.body.class_id;
    }
    timetableSchema
        .find(query)
        .exec()
        .then((results) => {
            res.json(results);
        })
        .catch((err) => {
            res.status(500).json({ error: err });
        });
});

// Add timetable entry
router.post("/add", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            
            const timetableModel = new timetableSchema({
                class_id: req.body.class_id,
                subject_id: req.body.subject_id,
                day: req.body.day,
                start_time: req.body.start_time,
                end_time: req.body.end_time,
                teacher_id: req.body.teacher_id,
                room: req.body.room
            });

            timetableModel
                .save()
                .then((result) => {
                    res.status(200).json({
                        message: "Timetable entry added successfully",
                        created: result,
                    });
                })
                .catch((err) => {
                    res.status(400).json({
                        message: "Adding new timetable entry failed",
                        error: err.message,
                    });
                });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

// Delete timetable entry
router.post("/delete/:id", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }

            timetableSchema.findOneAndDelete({ _id: req.params.id })
                .then((result) => {
                    res.json("Deleted successfully");
                })
                .catch((err) => {
                    res.status(500).json(err);
                });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

// Update timetable entry
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

            const updateData = {
                class_id: req.body.class_id,
                subject_id: req.body.subject_id,
                day: req.body.day,
                start_time: req.body.start_time,
                end_time: req.body.end_time,
                teacher_id: req.body.teacher_id,
                room: req.body.room
            };

            timetableSchema.findOneAndUpdate({ _id: req.params.id }, { $set: updateData }, { new: true })
                .then((result) => {
                    if (!result) {
                        return res.status(404).json({
                            message: "Timetable entry not found"
                        });
                    }
                    res.status(200).json({
                        message: "Timetable entry updated successfully",
                        updated: result,
                    });
                })
                .catch((err) => {
                    res.status(400).json({
                        message: "Updating timetable entry failed",
                        error: err.message,
                    });
                });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message });
        });
});

module.exports = router;
