const mongoose = require("mongoose");
const constants = require("../utils/constants");

const schema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    target_type: {
        type: String, // 'all_students', 'class_section', 'parents_of_student', 'teachers'
        required: true
    },
    target_class_id: {
        type: String // populated if target_type is 'class_section'
    },
    target_student_id: {
        type: String // student ID if targeting parents of a particular student
    },
    sender_id: {
        type: String
    },
    organization_id: {
        type: String,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const notificationModel = mongoose.model(constants.NOTIFICATION_COLLECTION_NAME, schema);
module.exports = notificationModel;
