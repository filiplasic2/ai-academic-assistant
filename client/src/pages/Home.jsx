import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Home() {
  const [text, setText] = useState("");
  const [rezultat, setRezultat] = useState("");
  const [ucitavanje, setUcitavanje] = useState(false);
  const [greska, setGreska] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const ime = localStorage.getItem("ime");

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const odjava = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("ime");
    navigate("/login");
  };

  const sazmi = async () => {
    setGreska(""); setRezultat(""); setUcitavanje(true);
    try {
      const odgovor = await axios.post(
        "http://localhost:5000/api/ai/summarize",
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRezultat(odgovor.data.result);
    } catch (err) {
      if (err.response?.status === 401) {
        setGreska("Sesija je istekla. Prijavi se ponovo.");
        odjava();
      } else {
        setGreska("Greška pri sažimanju.");
      }
    } finally {
      setUcitavanje(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Akademski asistent</h1>
        <div>
          <span style={{ marginRight: 10 }}>Zdravo, {ime}</span>
          <button onClick={odjava} style={{ padding: "6px 12px", cursor: "pointer" }}>Odjava</button>
        </div>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Nalepi tekst koji želiš da sažmeš..." rows={10}
        style={{ width: "100%", padding: 10, fontSize: 16 }} />
      <button onClick={sazmi} disabled={ucitavanje || !text}
        style={{ marginTop: 10, padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>
        {ucitavanje ? "Sažimam..." : "Sažmi tekst"}
      </button>
      {greska && <p style={{ color: "red" }}>{greska}</p>}
      {rezultat && (
        <div style={{ marginTop: 20, padding: 15, background: "#f4f4f4",
          borderRadius: 8, whiteSpace: "pre-wrap" }}>{rezultat}</div>
      )}
    </div>
  );
}

export default Home;