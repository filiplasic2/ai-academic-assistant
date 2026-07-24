const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  uloga: { type: String, enum: ["user", "assistant"], required: true },
  sadrzaj: { type: String, required: true },
  operacija: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);