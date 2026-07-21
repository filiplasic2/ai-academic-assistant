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
    <div style={{ maxWidth: 400, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Prijava</h1>
      <input type="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10, fontSize: 16 }} />
      <input type="password" placeholder="Lozinka" value={lozinka}
        onChange={(e) => setLozinka(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10, fontSize: 16 }} />
      <button onClick={prijava}
        style={{ width: "100%", padding: 10, fontSize: 16, cursor: "pointer" }}>
        Prijavi se
      </button>
      {greska && <p style={{ color: "red" }}>{greska}</p>}
      <p style={{ marginTop: 15 }}>Nemaš nalog? <Link to="/register">Registruj se</Link></p>
    </div>
  );
}

export default Login;