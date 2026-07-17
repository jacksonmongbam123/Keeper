const mongoose = require("mongoose");
const constants = require("../../utils/constants");

const schema = new mongoose.Schema({
  section: {
    type: String,
  },
});

const compiledSchema = mongoose.model(
  "df_sections",
  schema
);
module.exports = compiledSchema;
