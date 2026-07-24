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

const OPERACIJE = {
  sazimanje: "Sažmi materijal na srpskom i izvuci ključne teze.",
  uproscavanje: "Objasni materijal jednostavnim jezikom, kao nekome ko se prvi put susreće sa temom. Izbegavaj nepotreban žargon.",
  struktura: "Izvuci strukturu materijala — predloži logične podnaslove i organizaciju sadržaja po celinama.",
  fokus: "Objasni na koje delove materijala korisnik treba da se fokusira i obrazloži zašto su ti delovi najvažniji.",
  prevod: "Prevedi materijal na jezik koji korisnik traži (podrazumevano srpski), uz očuvanje stručne terminologije.",
  pitanje: "Odgovori na korisnikovo pitanje isključivo na osnovu priloženog materijala. Ako odgovor nije u materijalu, jasno to napiši umesto da pretpostavljaš.",
  citiranje: "Pronađi bibliografske podatke i sastavi bibliografsku jedinicu u APA (7), MLA (9), Harvard i IEEE formatu. Ne izmišljaj podatke — za ono što ne možeš pronaći napiši [dopuniti].",
  opste: "Odgovori korisniku kao asistent za akademsko istraživanje.",
};

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

// RAZGOVORNI REŽIM — sistem sam prepoznaje nameru
router.post("/chat", auth, async (req, res) => {
  try {
    const { poruka, conversationId } = req.body;
    if (!poruka) return res.status(400).json({ error: "Nema poruke" });

    const naslov = poruka.slice(0, 40) + (poruka.length > 40 ? "..." : "");
    const razgovor = await nadjiIliNapravi(conversationId, req.userId, naslov);

    // KONTEKST: poslednjih 6 poruka razgovora
    const prethodne = await Message.find({ conversationId: razgovor._id })
      .sort({ createdAt: -1 }).limit(6);
    const kontekst = prethodne.reverse()
      .map((p) => `${p.uloga === "user" ? "Korisnik" : "Asistent"}: ${p.sadrzaj.slice(0, 1500)}`)
      .join("\n\n");

    // MATERIJAL: poslednji otpremljen PDF u ovom razgovoru
    const dokument = await Document.findOne({ conversationId: razgovor._id, userId: req.userId })
      .sort({ createdAt: -1 });
    const materijal = dokument
      ? `\n\nOTPREMLJEN DOKUMENT ("${dokument.naziv}"):\n${dokument.tekst.slice(0, 20000)}\n`
      : "";

    // KORAK 1 — prepoznavanje namere
    const promptNamera = `Analiziraj zahtev korisnika i odredi koju operaciju traži.

Moguće operacije:
- "sazimanje" — traži sažetak, skraćivanje, suštinu
- "uproscavanje" — traži jednostavnije objašnjenje
- "struktura" — traži podnaslove, strukturu, organizaciju sadržaja
- "fokus" — pita na šta da se fokusira, šta je najbitnije
- "prevod" — traži prevod
- "citiranje" — traži literaturu, referencu, bibliografsku jedinicu
- "pitanje" — postavlja konkretno pitanje o materijalu
- "opste" — sve ostalo

Odgovori ISKLJUČIVO JSON objektom, bez dodatnog teksta i bez markdown oznaka:
{"operacija": "...", "obrazlozenje": "kratko obrazloženje u 5-10 reči"}

ZAHTEV KORISNIKA:
${poruka.slice(0, 3000)}`;

    let operacija = "opste";
    let obrazlozenje = "";
    try {
      const sirovo = await pozoviAI(promptNamera);
      const cisto = sirovo.replace(/```json|```/g, "").trim();
      const parsirano = JSON.parse(cisto);
      if (OPERACIJE[parsirano.operacija]) {
        operacija = parsirano.operacija;
        obrazlozenje = parsirano.obrazlozenje || "";
      }
    } catch (e) {
      operacija = "opste"; // ako prepoznavanje ne uspe, nastavi kao opšti zahtev
    }

    // KORAK 2 — izvršavanje prepoznate operacije
    const promptIzvrsenje = `Ti si asistent za akademsko istraživanje. Odgovaraš na srpskom jeziku, jasno i strukturirano (koristi Markdown).

ZADATAK: ${OPERACIJE[operacija]}
${kontekst ? `\nPRETHODNI TOK RAZGOVORA:\n${kontekst}\n` : ""}${materijal}
AKTUELNI ZAHTEV KORISNIKA:
${poruka}

Ako korisnik traži operaciju nad materijalom, a materijal nije priložen ni u poruci ni ranije u razgovoru, ljubazno zatraži da ga priloži.`;

    const odgovor = await pozoviAI(promptIzvrsenje);

    await Message.create({ conversationId: razgovor._id, uloga: "user", sadrzaj: poruka });
    await Message.create({
      conversationId: razgovor._id, uloga: "assistant", sadrzaj: odgovor, operacija,
    });

    razgovor.updatedAt = new Date();
    await razgovor.save();

    res.json({ result: odgovor, conversationId: razgovor._id, operacija, obrazlozenje });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Greška pri obradi zahteva" });
  }
});

router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Greška pri otpremanju fajla" });
});

module.exports = router;