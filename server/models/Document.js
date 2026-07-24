const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  naziv: { type: String, required: true },
  tekst: { type: String, required: true },
  brojStrana: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Document", documentSchema);