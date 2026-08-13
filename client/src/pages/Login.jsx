import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [greska, setGreska] = useState("");
  const navigate = useNavigate();

  const prijava = async () => {
    setGreska("");
    try {
      const odgovor = await axios.post("http://localhost:5000/api/auth/login", {
        email, lozinka,
      });
      localStorage.setItem("token", odgovor.data.token);
      localStorage.setItem("ime", odgovor.data.ime);
      navigate("/");
    } catch (err) {
      setGreska("Pogrešan email ili lozinka.");
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <p className="auth-eyebrow">Akademski asistent</p>
        <h1 className="auth-title">Prijavi se</h1>
        {greska && <div className="notice notice-error">{greska}</div>}
        <input className="input" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Lozinka" value={lozinka}
          onChange={(e) => setLozinka(e.target.value)} />
        <button className="btn btn-primary" onClick={prijava}>Prijavi se</button>
        <p className="auth-foot">Nemaš nalog? <Link to="/register">Registruj se</Link></p>
      </div>
    </div>
  );
}

export default Login;