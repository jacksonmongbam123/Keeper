const mongoose = require("mongoose");
const constants = require("../../utils/constants");

const schema = new mongoose.Schema({
    teacher_id: {
        type: String,
        required: true
    },
    teacher_name: {
        type: String
    },
    leave_date: {
        type: String,
        required: true
    },
    end_date: {
        type: String,
        required: true
    },
    leave_type: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const compiledSchema = mongoose.model(constants.REL_TEACHER_LEAVE_COLLECTION_NAME, schema);
module.exports = compiledSchema;
