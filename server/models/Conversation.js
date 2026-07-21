const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  naslov: { type: String, default: "Novi razgovor" },
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);