const express = require("express");
const auth = require("../middleware/auth");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const router = express.Router();

// Svi razgovori
router.get("/", auth, async (req, res) => {
  try {
    const razgovori = await Conversation.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(razgovori);
  } catch (err) {
    res.status(500).json({ error: "Greška pri učitavanju razgovora" });
  }
});

// Sve poruke jednog razgovora
router.get("/:id/messages", auth, async (req, res) => {
  try {
    const razgovor = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
    if (!razgovor) return res.status(404).json({ error: "Razgovor nije pronađen" });

    const poruke = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
    res.json(poruke);
  } catch (err) {
    res.status(500).json({ error: "Greška pri učitavanju poruka" });
  }
});

// Obriši razgovor (i njegove poruke)
router.delete("/:id", auth, async (req, res) => {
  try {
    const razgovor = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!razgovor) return res.status(404).json({ error: "Razgovor nije pronađen" });

    await Message.deleteMany({ conversationId: req.params.id });
    res.json({ message: "Razgovor obrisan" });
  } catch (err) {
    res.status(500).json({ error: "Greška pri brisanju" });
  }
});

module.exports = router;