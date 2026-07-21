const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// REGISTRACIJA
router.post("/register", async (req, res) => {
  try {
    const { ime, email, lozinka } = req.body;

    const postoji = await User.findOne({ email });
    if (postoji) {
      return res.status(400).json({ error: "Email je već zauzet" });
    }

    const hesiranaLozinka = await bcrypt.hash(lozinka, 10);

    const noviKorisnik = await User.create({
      ime,
      email,
      lozinka: hesiranaLozinka,
    });

    res.status(201).json({ message: "Uspešna registracija", userId: noviKorisnik._id });
  } catch (err) {
    res.status(500).json({ error: "Greška na serveru" });
  }
});

// PRIJAVA
router.post("/login", async (req, res) => {
  try {
    const { email, lozinka } = req.body;

    const korisnik = await User.findOne({ email });
    if (!korisnik) {
      return res.status(400).json({ error: "Pogrešan email ili lozinka" });
    }

    const poklapa = await bcrypt.compare(lozinka, korisnik.lozinka);
    if (!poklapa) {
      return res.status(400).json({ error: "Pogrešan email ili lozinka" });
    }

    const token = jwt.sign({ id: korisnik._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, ime: korisnik.ime });
  } catch (err) {
    res.status(500).json({ error: "Greška na serveru" });
  }
});

module.exports = router;