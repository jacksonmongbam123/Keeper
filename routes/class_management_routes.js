const express = require("express");
const attendanceSchema = require("../schemas/attendance_schema");
const feeSchema = require("../schemas/fee_schema");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const configs = require("../config/config.json");
const utils = require("../utils/util_methods");
const tokenSchema = require("../schemas/token_schema");
const router = express.Router();

//Add attendance for a student for a day
router.post("/attendance/add", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            const attendanceModel = new attendanceSchema({
                _id: new mongoose.Types.ObjectId(),
                studentID: req.body.studentID,
                date: req.body.date,
                attended: req.body.attended,
            });
            attendanceModel
                .save()
                .then(result => {
                    console.log(result);
                    res.status(201).json({
                        message: "attendance added",
                        createdAttendance: result
                    });
                })
                .catch(err => {
                    console.log(err.message);
                    res.status(500).json({
                        error: err
                    });
                });
        });
});

//Find attendance of a student for a day
router.post("/attendance/lookup", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            attendanceSchema.find({studentID: req.body.studentID, date: req.body.date})
                .then((result) => {
                    res.json(result);
                })
                .catch((err) => {
                    res.status(500).json({ error: err });
                });
        });
});

//Find absences of a student
router.get("/attendance/absence", utils.extractToken, (req, res) => { // todo
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            attendanceSchema.find({attended: false})
                .then((result) => {
                    res.json(result);
                })
                .catch((err) => {
                    res.status(500).json({ error: err });
                });
        });
});

//Add fee for a student for a term
router.post("/fee/add", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            const student_id = req.body.student_id || req.body.studentID;
            const fee_status = req.body.fee_status || req.body.feeStatus;
            const feeModel = new feeSchema({
                _id: new mongoose.Types.ObjectId(),
                student_id: student_id,
                term: req.body.term,
                year: req.body.year,
                fee_status: fee_status,
            });
            feeModel
                .save()
                .then(result => {
                    console.log(result);
                    res.status(201).json({
                        message: "fee added",
                        createdAttendance: result
                    });
                })
                .catch(err => {
                    console.log(err.message);
                    res.status(500).json({
                        error: err
                    });
                });
        });
});

//update fee status
router.post("/fee/updateStatus", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            const student_id = req.body.student_id || req.body.studentID;
            const fee_status = req.body.fee_status || req.body.feeStatus;
            feeSchema.find({
                $or: [
                    { student_id: student_id, term: req.body.term, year: req.body.year },
                    { studentID: student_id, term: req.body.term, year: req.body.year }
                ]
            })
                .then((result) => {
                    if (!result || result.length === 0) {
                        return res.status(404).send("data is not found");
                    } else {
                        if (result[0].fee_status !== undefined) {
                            result[0].fee_status = fee_status;
                        } else {
                            result[0].feeStatus = fee_status;
                        }
                        return result[0].save()
                            .then(() => {
                                return res.json("Fee status updated");
                            })
                            .catch(err => {
                                return res.status(400).send("Update not successful");
                            });
                    }
                })
                .catch((err) => {
                    return res.status(500).json({ error: err.message || err });
                });
        });
});

//retrieve all fee records
router.post("/fee/all", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            feeSchema.find({})
                .then((result) => {
                    res.json(result);
                })
                .catch((err) => {
                    res.status(500).json({ error: err.message || err });
                });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message || err });
        });
});

router.get("/fee/all", utils.extractToken, (req, res) => {
    tokenSchema
        .find({ token: req.token })
        .exec()
        .then((resultList) => {
            if (resultList.length < 1) {
                return res.status(401).json({
                    message: "Invalid Token",
                });
            }
            feeSchema.find({})
                .then((result) => {
                    res.json(result);
                })
                .catch((err) => {
                    res.status(500).json({ error: err.message || err });
                });
        })
        .catch((err) => {
            res.status(500).json({ error: err.message || err });
        });
});

//todo fee not paid reminder after 10 days of each term. have a term start end date table
module.exports = router;
