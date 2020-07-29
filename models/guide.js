var mongoose = require("mongoose");

var passportLocalMongoose = require("passport-local-mongoose");



var guideSchema = new mongoose.Schema({
    username : String,
    password : String,
    guideNo  : String,
    students : [mongoose.Schema.Types.ObjectId]
})

guideSchema.plugin(passportLocalMongoose, {
    selectFields: "username password guideNo students"
});

module.exports = mongoose.model("Guide", guideSchema);
