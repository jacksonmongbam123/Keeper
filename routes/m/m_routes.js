const express = require("express");
const app = express();
const adminRoutes = require("./admin_routes.js");
const studentRoutes = require("./student_routes.js");
const parentRoutes = require("./parent_routes.js");
const teacherRoutes = require("./teacher_routes.js");
const classRoutes = require("./class_routes.js");
const classSectionRoutes = require("./class_section_routes.js");
const subjectRoutes = require("./subject_routes.js");
const extraActivityRoutes = require("./extra_activity_routes.js");
const marksRoutes = require("./marks_routes.js");
const organizationRoutes = require("./organization_routes.js");
const notificationRoutes = require("./notification_routes.js");

app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);
app.use("/parent", parentRoutes);
app.use("/teacher", teacherRoutes);
app.use("/class", classRoutes);
app.use("/classSection", classSectionRoutes);
app.use("/subject", subjectRoutes);
app.use("/extraActivity", extraActivityRoutes);
app.use("/marks", marksRoutes);
app.use("/organization", organizationRoutes);
app.use("/notification", notificationRoutes);

module.exports = app;
