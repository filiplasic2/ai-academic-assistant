const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const auth = require("../middleware/auth");

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

router.post("/summarize", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Nema teksta za sažimanje" });
    }

    const prompt = `Sažmi sledeći tekst na srpskom jeziku i izvuci ključne teze:\n\n${text}`;

    let response;
    for (let pokusaj = 1; pokusaj <= 3; pokusaj++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
        });
        break; 
      } catch (err) {
        if (err.status === 503 && pokusaj < 3) {
          await sleep(2000 * pokusaj); 
          continue; 
        }
        throw err; 
      }
    }

    res.json({ result: response.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Greška pri pozivu AI-ja" });
  }
});

module.exports = router;