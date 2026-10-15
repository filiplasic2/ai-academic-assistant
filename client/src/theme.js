// učitava sačuvanu temu, ako je nema, prati sistemsko podešavanje
export function ucitajTemu() {
  const sacuvana = localStorage.getItem("tema");
  const sistemska = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const tema = sacuvana || sistemska;
  document.documentElement.setAttribute("data-theme", tema);
  return tema;
}

export function postaviTemu(tema) {
  localStorage.setItem("tema", tema);
  document.documentElement.setAttribute("data-theme", tema);
}