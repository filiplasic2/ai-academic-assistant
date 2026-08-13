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
    <div className="auth">
      <div className="auth-card">
        <p className="auth-eyebrow">Akademski asistent</p>
        <h1 className="auth-title">Napravi nalog</h1>
        {greska && <div className="notice notice-error">{greska}</div>}
        {poruka && <div className="notice notice-ok">{poruka}</div>}
        <input className="input" placeholder="Ime" value={ime}
          onChange={(e) => setIme(e.target.value)} />
        <input className="input" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Lozinka" value={lozinka}
          onChange={(e) => setLozinka(e.target.value)} />
        <button className="btn btn-primary" onClick={registracija}>Registruj se</button>
        <p className="auth-foot">Već imaš nalog? <Link to="/login">Prijavi se</Link></p>
      </div>
    </div>
  );
}

export default Register;