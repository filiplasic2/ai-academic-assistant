const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const auth = require("../middleware/auth");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

router.post("/summarize", auth, async (req, res) => {
  try {
    const { text, conversationId } = req.body;
    if (!text) return res.status(400).json({ error: "Nema teksta za sažimanje" });

    
    let razgovor;
    if (conversationId) {
      razgovor = await Conversation.findOne({ _id: conversationId, userId: req.userId });
    }
    if (!razgovor) {
      razgovor = await Conversation.create({
        userId: req.userId,
        naslov: text.slice(0, 40) + (text.length > 40 ? "..." : ""),
      });
    }

    
    await Message.create({ conversationId: razgovor._id, uloga: "user", sadrzaj: text });

  
    const prompt = `Sažmi sledeći tekst na srpskom jeziku i izvuci ključne teze:\n\n${text}`;
    let response;
    for (let pokusaj = 1; pokusaj <= 3; pokusaj++) {
      try {
        response = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: prompt });
        break;
      } catch (err) {
        if (err.status === 503 && pokusaj < 3) { await sleep(2000 * pokusaj); continue; }
        throw err;
      }
    }

    
    const odgovor = response.text;
    await Message.create({ conversationId: razgovor._id, uloga: "assistant", sadrzaj: odgovor });

    
    razgovor.updatedAt = new Date();
    await razgovor.save();

    res.json({ result: odgovor, conversationId: razgovor._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Greška pri sažimanju" });
  }
});

module.exports = router;