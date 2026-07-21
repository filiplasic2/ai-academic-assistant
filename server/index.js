require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const aiRoutes = require("./routes/ai");

const app = express();
const cors = require("cors"); 
const PORT = 5000;
  
app.use(cors());
app.use(express.json());
app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes); 

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Povezan na MongoDB"))
  .catch((err) => console.error("Greška pri povezivanju:", err));

app.get("/", (req, res) => {
  res.send("Server radi!");
});

app.listen(PORT, () => {
  console.log(`Server sluša na portu ${PORT}`);
});