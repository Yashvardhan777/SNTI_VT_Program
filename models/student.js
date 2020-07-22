var mongoose = require("mongoose");

var passportLocalMongoose = require("passport-local-mongoose");

var studentSchema = new mongoose.Schema({
    username    : String,
    email       : String,
    guideNo     : String,
    password    : String
});

studentSchema.plugin(passportLocalMongoose, {
    selectFields: "username email guide password"
});

module.exports = mongoose.model("Student", studentSchema);