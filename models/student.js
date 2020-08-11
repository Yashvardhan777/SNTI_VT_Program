var mongoose = require("mongoose");

var passportLocalMongoose = require("passport-local-mongoose");

var projectSchema = new mongoose.Schema({
    projectName: String,
    projectId  : mongoose.Schema.Types.ObjectId
})

var studentSchema = new mongoose.Schema({
    username    : String,
    email       : String,
    guideNo     : String,
    institute   : String,
    branch      : String,
    duration    : String,
    startDate   : Date,
    password    : String,
    projects    : [projectSchema],
    payment     : Boolean,
    approval    : Boolean 
});

studentSchema.plugin(passportLocalMongoose, {
    selectFields: "username email guideNo institute branch duration startDate password projects payment approval"
});

module.exports = mongoose.model("Student", studentSchema);