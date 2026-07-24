import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const API = "http://localhost:5000";

function Home() {
  const [razgovori, setRazgovori] = useState([]);
  const [aktivniId, setAktivniId] = useState(null);
  const [poruke, setPoruke] = useState([]);
  const [text, setText] = useState("");
  const [ucitavanje, setUcitavanje] = useState(false);
  const [fajl, setFajl] = useState(null);
  const [greska, setGreska] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const ime = localStorage.getItem("ime");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    ucitajRazgovore();
  }, []);

  const ucitajRazgovore = async () => {
    try {
      const odg = await axios.get(`${API}/api/conversations`, authHeader);
      setRazgovori(odg.data);
    } catch (err) {
      if (err.response?.status === 401) odjava();
    }
  };

  const otvoriRazgovor = async (id) => {
    setAktivniId(id);
    setGreska("");
    try {
      const odg = await axios.get(`${API}/api/conversations/${id}/messages`, authHeader);
      setPoruke(odg.data);
    } catch (err) {
      setGreska("Greška pri učitavanju razgovora.");
    }
  };

  const noviRazgovor = () => {
    setAktivniId(null);
    setPoruke([]);
    setText("");
    setGreska("");
  };

  const obrisiRazgovor = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Obrisati ovaj razgovor?")) return;
    try {
      await axios.delete(`${API}/api/conversations/${id}`, authHeader);
      if (id === aktivniId) noviRazgovor();
      ucitajRazgovore();
    } catch (err) {
      setGreska("Greška pri brisanju.");
    }
  };

  const posalji = async () => {
    if (!text) return;
    setGreska(""); setUcitavanje(true);
    const mojTekst = text;
    setText("");
    setPoruke((p) => [...p, { uloga: "user", sadrzaj: mojTekst, _id: "temp" }]);
    try {
      const odg = await axios.post(
        `${API}/api/ai/chat`,
        { poruka: mojTekst, conversationId: aktivniId },
        authHeader
      );
      setPoruke((p) => [...p, {
        uloga: "assistant", sadrzaj: odg.data.result,
        operacija: odg.data.operacija, _id: "temp2",
      }]);
      if (!aktivniId) setAktivniId(odg.data.conversationId);
      ucitajRazgovore();
    } catch (err) {
      if (err.response?.status === 401) { odjava(); return; }
      setGreska("Greška pri obradi zahteva.");
    } finally {
      setUcitavanje(false);
    }
  };

  const posaljiPdf = async () => {
    if (!fajl) return;
    setGreska(""); setUcitavanje(true);
    const imeFajla = fajl.name;
    const fd = new FormData();
    fd.append("pdf", fajl);
    if (aktivniId) fd.append("conversationId", aktivniId);
    setFajl(null);
    setPoruke((p) => [...p, { uloga: "user", sadrzaj: `[PDF] ${imeFajla}`, _id: "temp" }]);
    try {
      const odg = await axios.post(`${API}/api/ai/pdf`, fd, authHeader);
      setPoruke((p) => [...p, { uloga: "assistant", sadrzaj: odg.data.result, _id: "temp2" }]);
      if (!aktivniId) setAktivniId(odg.data.conversationId);
      ucitajRazgovore();
    } catch (err) {
      if (err.response?.status === 401) { odjava(); return; }
      setGreska(err.response?.data?.error || "Greška pri obradi PDF-a.");
    } finally {
      setUcitavanje(false);
    }
  };

  const generisiLiteraturu = async () => {
    if (!aktivniId) return;
    setGreska(""); setUcitavanje(true);
    setPoruke((p) => [...p, { uloga: "user", sadrzaj: "[Zahtev] Generiši literaturu", _id: "temp" }]);
    try {
      const odg = await axios.post(`${API}/api/ai/cite`, { conversationId: aktivniId }, authHeader);
      setPoruke((p) => [...p, { uloga: "assistant", sadrzaj: odg.data.result, _id: "temp2" }]);
      ucitajRazgovore();
    } catch (err) {
      if (err.response?.status === 401) { odjava(); return; }
      setGreska(err.response?.data?.error || "Greška pri generisanju literature.");
    } finally {
      setUcitavanje(false);
    }
  };
  const odjava = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("ime");
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* BOČNA LISTA */}
      <div style={{
        width: 260, borderRight: "1px solid #ddd", padding: 15,
        overflowY: "auto", background: "#fafafa"
      }}>
        <button onClick={noviRazgovor}
          style={{
            width: "100%", padding: 10, marginBottom: 15, cursor: "pointer",
            fontSize: 15, fontWeight: "bold"
          }}>
          + Novi razgovor
        </button>
        {razgovori.map((r) => (
          <div key={r._id} onClick={() => otvoriRazgovor(r._id)}
            style={{
              padding: 10, marginBottom: 6, borderRadius: 6, cursor: "pointer",
              background: r._id === aktivniId ? "#e0e0ff" : "transparent",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
            <span style={{
              fontSize: 14, overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>{r.naslov}</span>
            <span onClick={(e) => obrisiRazgovor(r._id, e)}
              style={{ color: "#c00", marginLeft: 8, cursor: "pointer" }}>×</span>
          </div>
        ))}
      </div>

      {/* GLAVNI DEO */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: 15, borderBottom: "1px solid #ddd"
        }}>
          <h2 style={{ margin: 0 }}>Akademski asistent</h2>
          <div>
            <span style={{ marginRight: 10 }}>Zdravo, {ime}</span>
            <button onClick={odjava} style={{ padding: "6px 12px", cursor: "pointer" }}>Odjava</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {poruke.length === 0 && (
            <p style={{ color: "#888" }}>Nalepi tekst ispod da započneš novo sažimanje.</p>
          )}
          {poruke.map((p, i) => (
            <div key={p._id + i}
              style={{
                marginBottom: 15, padding: 12, borderRadius: 8,
                background: p.uloga === "user" ? "#f0f0f0" : "#eef6ff",
                whiteSpace: "pre-wrap"
              }}>
              <strong>{p.uloga === "user" ? "Ti" : "Asistent"}:</strong>
              {p.operacija && (
                <span style={{
                  marginLeft: 8, fontSize: 12, padding: "2px 8px",
                  background: "#dde6ff", borderRadius: 10, color: "#334"
                }}>
                  {p.operacija}
                </span>
              )}
              <div style={{ marginTop: 6 }}><ReactMarkdown>{p.sadrzaj}</ReactMarkdown></div>
            </div>
          ))}
          {ucitavanje && <p style={{ color: "#888" }}>Asistent razmišlja...</p>}
        </div>

        <div style={{ padding: 15, borderTop: "1px solid #ddd" }}>
          {greska && <p style={{ color: "red", marginTop: 0 }}>{greska}</p>}
          <div style={{ marginBottom: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <input type="file" accept="application/pdf"
              onChange={(e) => setFajl(e.target.files[0])} />
            <button onClick={posaljiPdf} disabled={ucitavanje || !fajl}
              style={{ padding: "8px 16px", cursor: "pointer" }}>
              Analiziraj PDF
            </button>
            <button onClick={generisiLiteraturu} disabled={ucitavanje || !aktivniId}
              style={{ padding: "8px 16px", cursor: "pointer" }}>
              Generiši literaturu
            </button>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Napiši šta ti treba — npr. 'skrati mi ovaj tekst', 'objasni jednostavnije', 'daj mi literaturu'..." rows={4}
            style={{ width: "100%", padding: 10, fontSize: 15, boxSizing: "border-box" }} />
          <button onClick={posalji} disabled={ucitavanje || !text}
            style={{ marginTop: 8, padding: "10px 24px", fontSize: 15, cursor: "pointer" }}>
            {ucitavanje ? "Obrađujem..." : "Pošalji"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;