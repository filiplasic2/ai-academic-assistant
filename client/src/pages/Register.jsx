import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const [ime, setIme] = useState("");
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [poruka, setPoruka] = useState("");
  const [greska, setGreska] = useState("");
  const navigate = useNavigate();

  const registracija = async () => {
    setGreska(""); setPoruka("");
    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        ime, email, lozinka,
      });
      setPoruka("Uspešna registracija! Preusmeravam na prijavu...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setGreska(err.response?.data?.error || "Greška pri registraciji.");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Registracija</h1>
      <input placeholder="Ime" value={ime} onChange={(e) => setIme(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10, fontSize: 16 }} />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10, fontSize: 16 }} />
      <input type="password" placeholder="Lozinka" value={lozinka} onChange={(e) => setLozinka(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10, fontSize: 16 }} />
      <button onClick={registracija}
        style={{ width: "100%", padding: 10, fontSize: 16, cursor: "pointer" }}>
        Registruj se
      </button>
      {poruka && <p style={{ color: "green" }}>{poruka}</p>}
      {greska && <p style={{ color: "red" }}>{greska}</p>}
      <p style={{ marginTop: 15 }}>Već imaš nalog? <Link to="/login">Prijavi se</Link></p>
    </div>
  );
}

export default Register;