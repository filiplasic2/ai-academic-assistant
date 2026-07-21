const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  ime: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  lozinka: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);