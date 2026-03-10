# 🤖 AI CRM — Powered by Groq

CRM intelligente con agenti AI per Customer Service, Sales e Marketing.

## Stack
- **React 18** + **Vite 5**
- **Recharts** per i grafici
- **Groq API** per gli agenti AI (llama3, mixtral)

## Avvio locale

```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia il server di sviluppo
npm run dev

# 3. Apri nel browser
# http://localhost:5173
```

## Deploy su Vercel

1. Carica questa cartella su GitHub
2. Vai su [vercel.com](https://vercel.com) → New Project
3. Importa il repository GitHub
4. Clicca **Deploy** (zero configurazione necessaria)

## Configurazione API Key Groq

1. Vai su [console.groq.com/keys](https://console.groq.com/keys)
2. Crea una API Key gratuita
3. Nell'app, clicca **"Imposta API Key Groq"** in basso a sinistra nella sidebar

## Agenti AI disponibili

| Agente | Modello Groq | Uso |
|--------|-------------|-----|
| 🎧 Customer Service | llama3-8b-8192 | Ticket, risposte clienti, escalation |
| 📈 Sales Agent | llama3-70b-8192 | Pipeline, follow-up, proposte |
| 🎯 Marketing Manager | mixtral-8x7b-32768 | Campagne, segmenti, funnel |

## Funzionalità

- **Dashboard** con KPI e grafici analytics
- **Contatti** con scheda dettaglio, storico interazioni e note
- **Pipeline** kanban per stadio di vendita
- **Ticket** customer service con priorità e categorie
- **Campagne** marketing con metriche CTR e ROI
- **Form** creazione/modifica contatti e ticket
- **Agenti AI contestuali** — vedono i dati del cliente selezionato
