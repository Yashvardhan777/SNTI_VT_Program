var mongoose = require("mongoose");

var passportLocalMongoose = require("passport-local-mongoose");

var projectSchema = new mongoose.Schema({
    projectName : String,
    projectId   : mongoose.Schema.Types.ObjectId
})

var studentSchema = new mongoose.Schema({
    studentName : String,
    projects    : [projectSchema]
})

var guideSchema = new mongoose.Schema({
    username : String,
    password : String,
    guideNo  : String,
    students : [studentSchema]
})

guideSchema.plugin(passportLocalMongoose, {
    selectFields: "username password students"
});

module.exports = mongoose.model("Guide", guideSchema);
