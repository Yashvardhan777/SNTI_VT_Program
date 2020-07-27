var mongoose = require("mongoose");

var passportLocalMongoose = require("passport-local-mongoose");

var projectSchema = new mongoose.Schema({
    projectName: String,
    projectId : mongoose.Schema.Types.ObjectId
})

var studentSchema = new mongoose.Schema({
    username    : String,
    email       : String,
    guideNo     : String,
    password    : String,
    projects    : [projectSchema] 
});

studentSchema.plugin(passportLocalMongoose, {
    selectFields: "username email guide password projects"
});

module.exports = mongoose.model("Student", studentSchema);