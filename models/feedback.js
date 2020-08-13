var mongoose   = require("mongoose");
var timestamp  = require("mongoose-timestamp");

var feedbackSchema = new mongoose.Schema({
    text   : String,
    author : String,
    student : mongoose.Schema.Types.ObjectId,
    guide   : mongoose.Schema.Types.ObjectId
});

feedbackSchema.plugin(timestamp);

module.exports = mongoose.model("Feedback", feedbackSchema);