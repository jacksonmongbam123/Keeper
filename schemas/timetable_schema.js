const mongoose = require("mongoose");
const constants = require("../utils/constants");

const schema = new mongoose.Schema({
    class_id: {
        type: String,
        required: true
    },
    subject_id: {
        type: String,
        required: true
    },
    day: {
        type: String, // 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
        required: true
    },
    start_time: {
        type: String, // e.g. '09:00'
        required: true
    },
    end_time: {
        type: String, // e.g. '10:00'
        required: true
    },
    teacher_id: {
        type: String
    },
    room: {
        type: String
    }
});

const timetableModel = mongoose.model(constants.TIMETABLE_COLLECTION_NAME, schema);
module.exports = timetableModel;
