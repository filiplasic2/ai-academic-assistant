# AI asistent za akademsku podršku

Višekorisnička web aplikacija koja služi kao lični AI asistent za akademski rad. Studenti mogu da sažimaju i pojednostavljuju tekstove, analiziraju naučne radove u PDF formatu, generišu literaturu i čuvaju istoriju razgovora. Izrađena pomoću MERN stack tehnologija kao diplomski rad na Fakultetu organizacionih nauka (Univerzitet u Beogradu).

## Funkcionalnosti

- **Autentikacija** – registracija i prijava pomoću JWT tokena; sve rute osim registracije i prijave su zaštićene
- **Obrada teksta** – sažimanje i pojednostavljivanje teksta, izdvajanje najbitnijeg i predlog na šta da se fokusiraš
- **Analiza PDF dokumenata** – upload rada (PDF, do 10 MB); server izvlači tekst i vraća strukturiranu analizu
- **Generisanje literature** – navođenje rada u više formata citiranja
- **Istorija razgovora** – razgovori i poruke se čuvaju po korisniku i mogu da se otvore ili obrišu

## Tehnologije

| Sloj | Tehnologije |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, react-markdown |
| Backend | Node.js, Express 5, Mongoose, JWT, bcryptjs, Multer, pdf-parse |
| Baza podataka | MongoDB Atlas |
| AI | Google Gemini API (`@google/genai`) |

## Struktura projekta

```
client/   React + Vite frontend
server/   Express REST API
  routes/       auth, ai, conversations
  models/       User, Conversation, Message, Document
  middleware/   JWT autentikacija
```

## REST API

| Metod | Ruta | Opis |
| --- | --- | --- |
| POST | `/api/auth/register` | Registracija naloga |
| POST | `/api/auth/login` | Prijava, vraća JWT |
| GET | `/api/conversations` | Lista razgovora korisnika |
| GET | `/api/conversations/:id/messages` | Poruke jednog razgovora |
| DELETE | `/api/conversations/:id` | Brisanje razgovora |
| POST | `/api/ai/summarize` | Sažimanje / pojednostavljivanje teksta |
| POST | `/api/ai/pdf` | Analiza PDF dokumenta |
| POST | `/api/ai/cite` | Generisanje literature |
| POST | `/api/ai/chat` | Slobodan razgovor |

## Pokretanje lokalno

**Potrebno:** Node.js 20+, besplatan [MongoDB Atlas](https://www.mongodb.com/atlas) klaster i besplatan [Gemini API ključ](https://aistudio.google.com/apikey).

1. Kloniraj repozitorijum
   ```bash
   git clone https://github.com/filiplasic2/ai-academic-assistant.git
   cd ai-academic-assistant
   ```
2. Pokreni server
   ```bash
   cd server
   npm install
   cp .env.example .env     # na Windows-u: copy .env.example .env
   # u .env upiši MONGO_URI, GEMINI_API_KEY i JWT_SECRET
   npm run dev
   ```
   API radi na `http://localhost:5000`.
3. Pokreni klijent (u drugom terminalu)
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Otvori adresu koju Vite ispiše (obično `http://localhost:5173`).

## Promenljive okruženja (`server/.env`)

| Promenljiva | Opis |
| --- | --- |
| `MONGO_URI` | Konekcioni string za MongoDB |
| `GEMINI_API_KEY` | Google Gemini API ključ |
| `JWT_SECRET` | Duga nasumična niska za potpisivanje tokena |

## Autor

Filip Lašić – [GitHub](https://github.com/filiplasic2)
