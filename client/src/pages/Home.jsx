import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { postaviTemu } from "../theme.js";


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
  const [tema, setTema] = useState(
    () => document.documentElement.getAttribute("data-theme") || "light"
  );
  const textRef = useRef(null);

  const token = localStorage.getItem("token");
  const ime = localStorage.getItem("ime");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    ucitajRazgovore();
  }, []);

  const promeniTemu = () => {
    const nova = tema === "dark" ? "light" : "dark";
    postaviTemu(nova);
    setTema(nova);
  };
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
    if (textRef.current) textRef.current.style.height = "auto";
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
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <button className="btn" onClick={noviRazgovor}>+ Novi razgovor</button>
        </div>
        <div className="conv-list">
          {razgovori.length === 0 && (
            <p className="conv-empty">Još nema razgovora.</p>
          )}
          {razgovori.map((r) => (
            <div key={r._id}
              className={`conv${r._id === aktivniId ? " active" : ""}`}
              onClick={() => otvoriRazgovor(r._id)}>
              <span className="conv-title">{r.naslov}</span>
              <button className="conv-del" title="Obriši razgovor"
                onClick={(e) => obrisiRazgovor(r._id, e)}>×</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="brand">Akademski asistent</span>
          <span className="user">
            {ime}
            <button className="btn-ghost" onClick={promeniTemu}
              title={tema === "dark" ? "Svetla tema" : "Tamna tema"}>
              {tema === "dark" ? "☀" : "☾"}
            </button>
            <button className="btn-ghost" onClick={odjava}>Odjavi se</button>
          </span>
        </header>

        <div className="thread">
          <div className="thread-inner">
            {poruke.length === 0 && (
              <div className="empty">
                <h2>Na čemu radiš danas?</h2>
                <p>Nalepi tekst ili priloži rad u PDF-u, pa napiši šta ti treba —
                  sažetak, jednostavnije objašnjenje, literaturu ili odgovor na pitanje.</p>
              </div>
            )}

            {poruke.map((p, i) => (
              <div key={p._id + i} className={`msg msg-${p.uloga}`}>
                <div className="msg-meta">
                  <span className="msg-role">{p.uloga === "user" ? "Ti" : "Asistent"}</span>
                  {p.operacija && <span className="msg-badge">{p.operacija}</span>}
                </div>
                <div className="msg-body">
                  {p.uloga === "assistant"
                    ? <ReactMarkdown>{p.sadrzaj}</ReactMarkdown>
                    : p.sadrzaj}
                </div>
              </div>
            ))}

            {ucitavanje && <p className="thinking">Obrađujem</p>}
          </div>
        </div>

        <div className="composer">
          <div className="composer-inner">
            {greska && <div className="notice notice-error">{greska}</div>}

            <div className="composer-box">
              <textarea className="textarea" ref={textRef} rows={1} value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                placeholder="Napiši šta ti treba — na primer: skrati mi ovo, objasni jednostavnije, na šta da se fokusiram" />

              <div className="composer-actions">
                <div className="tools">
                  <label className="file-label" title="Priloži PDF rad">
                    ＋ PDF
                    <input type="file" accept="application/pdf"
                      onChange={(e) => { setFajl(e.target.files[0]); e.target.value = ""; }} />
                  </label>
                  {fajl && <span className="file-name">{fajl.name}</span>}
                  <button className="btn btn-sm" onClick={posaljiPdf} disabled={ucitavanje || !fajl}>
                    Analiziraj rad
                  </button>
                  <button className="btn btn-sm" onClick={generisiLiteraturu}
                    disabled={ucitavanje || !aktivniId}>
                    Literatura
                  </button>
                </div>

                <button className="btn btn-primary btn-send" onClick={posalji}
                  disabled={ucitavanje || !text}
                  title="Pošalji" aria-label="Pošalji">
                  {ucitavanje ? <span className="spinner" /> : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;