const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  author: String,
  when: Date,
  msgType: String,
  message: String,
  room: {
    type: mongoose.Schema.ObjectId,
    ref: "Room"
  }
});

module.exports = mongoose.model("Message", MessageSchema);
