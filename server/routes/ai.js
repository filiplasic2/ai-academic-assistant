const express = require("express");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");
const auth = require("../middleware/auth");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Document = require("../models/Document");

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Dozvoljeni su samo PDF fajlovi"));
    }
    cb(null, true);
  },
});


async function pozoviAI(prompt) {
  for (let pokusaj = 1; pokusaj <= 3; pokusaj++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
      });
      return response.text;
    } catch (err) {
      if (err.status === 503 && pokusaj < 3) {
        await sleep(2000 * pokusaj);
        continue;
      }
      throw err;
    }
  }
}


async function nadjiIliNapravi(conversationId, userId, naslov) {
  let razgovor = null;
  if (conversationId) {
    razgovor = await Conversation.findOne({ _id: conversationId, userId });
  }
  if (!razgovor) {
    razgovor = await Conversation.create({ userId, naslov });
  }
  return razgovor;
}


router.post("/summarize", auth, async (req, res) => {
  try {
    const { text, conversationId } = req.body;
    if (!text) return res.status(400).json({ error: "Nema teksta za sažimanje" });

    const naslov = text.slice(0, 40) + (text.length > 40 ? "..." : "");
    const razgovor = await nadjiIliNapravi(conversationId, req.userId, naslov);

    await Message.create({ conversationId: razgovor._id, uloga: "user", sadrzaj: text });

    const odgovor = await pozoviAI(
      `Sažmi sledeći tekst na srpskom jeziku i izvuci ključne teze:\n\n${text}`
    );

    await Message.create({ conversationId: razgovor._id, uloga: "assistant", sadrzaj: odgovor });
    razgovor.updatedAt = new Date();
    await razgovor.save();

    res.json({ result: odgovor, conversationId: razgovor._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Greška pri sažimanju" });
  }
});


router.post("/pdf", auth, upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nije poslat PDF fajl" });

    const parser = new PDFParse({ data: req.file.buffer });
    let podaci;
    try {
      podaci = await parser.getText();
    } finally {
      await parser.destroy(); 
    }
    let tekst = (podaci.text || "").trim();
    const brojStrana = podaci.total ?? podaci.pages?.length ?? "?";

    if (tekst.length < 100) {
      return res.status(400).json({
        error: "Iz ovog PDF-a nije izvučen tekst. Verovatno je skeniran (slika), pa bi bio potreban OCR.",
      });
    }

    const MAX = 30000;
    const skracen = tekst.length > MAX;
    if (skracen) tekst = tekst.slice(0, MAX);

    const razgovor = await nadjiIliNapravi(
      req.body.conversationId,
      req.userId,
      req.file.originalname.slice(0, 40)
    );

    await Document.create({
      userId: req.userId,
      conversationId: razgovor._id,
      naziv: req.file.originalname,
      tekst: tekst,
      brojStrana: String(brojStrana),
    });

    await Message.create({
      conversationId: razgovor._id,
      uloga: "user",
      sadrzaj: `[PDF] ${req.file.originalname} — ${brojStrana} str.${skracen ? " (analiziran samo početni deo)" : ""}`,
    });

    const prompt = `Ti si asistent za akademsko istraživanje. Analiziraj sledeći naučni rad i odgovori na srpskom jeziku, po ovoj strukturi:

1. Osnovni podaci o radu (autor/i, naslov, godina, časopis — ako se mogu pronaći u tekstu; ako ne, napiši "nije pronađeno")
2. Kratak sažetak rada (5-6 rečenica)
3. Ključni nalazi (u tačkama)
4. Korišćena metodologija
5. Ograničenja rada
6. Zašto bi ovaj rad mogao biti koristan u istraživanju

TEKST RADA:
${tekst}`;

    const odgovor = await pozoviAI(prompt);

    await Message.create({ conversationId: razgovor._id, uloga: "assistant", sadrzaj: odgovor });
    razgovor.updatedAt = new Date();
    await razgovor.save();

    res.json({ result: odgovor, conversationId: razgovor._id, brojStrana });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Greška pri obradi PDF-a" });
  }
});


router.post("/cite", auth, async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ error: "Nije izabran razgovor" });

    const razgovor = await Conversation.findOne({ _id: conversationId, userId: req.userId });
    if (!razgovor) return res.status(404).json({ error: "Razgovor nije pronađen" });

    
    const dokument = await Document.findOne({ conversationId, userId: req.userId })
      .sort({ createdAt: -1 });
    if (!dokument) {
      return res.status(404).json({ error: "U ovom razgovoru nema otpremljenog PDF-a." });
    }

    
    const pocetak = dokument.tekst.slice(0, 5000);

    const prompt = `Ti si asistent za akademsko citiranje. Na osnovu početka naučnog rada ispod, pronađi bibliografske podatke i sastavi bibliografsku jedinicu.

Odgovori na srpskom, ovom strukturom:

**Pronađeni podaci**
- Autor(i):
- Naslov:
- Godina:
- Časopis / izdavač:
- Volumen, broj, strane:
- DOI:

**Bibliografska jedinica**
- APA (7. izdanje):
- MLA (9. izdanje):
- Harvard:
- IEEE:

VAŽNO: ne izmišljaj podatke. Za svaki podatak koji ne možeš pouzdano da pronađeš u tekstu napiši "NIJE PRONAĐENO", a u citatu ostavi oznaku [dopuniti]. Na kraju dodaj kratku napomenu da korisnik treba da proveri podatke pre upotrebe u radu.

TEKST (početak rada "${dokument.naziv}"):
${pocetak}`;

    const odgovor = await pozoviAI(prompt);

    await Message.create({
      conversationId: razgovor._id,
      uloga: "user",
      sadrzaj: `[Zahtev] Generiši literaturu za: ${dokument.naziv}`,
    });
    await Message.create({ conversationId: razgovor._id, uloga: "assistant", sadrzaj: odgovor });

    razgovor.updatedAt = new Date();
    await razgovor.save();

    res.json({ result: odgovor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Greška pri generisanju literature" });
  }
});

router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Greška pri otpremanju fajla" });
});

module.exports = router;