import { useState, useRef, useEffect, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

// ─── Groq API ──────────────────────────────────────────────────────────────────
const GROQ_MODELS = {
  customerService: "llama3-8b-8192",
  sales: "llama3-70b-8192",
  marketing: "mixtral-8x7b-32768",
};

const AGENT_PROMPTS = {
  customerService: `Sei un agente AI specializzato nel Customer Service B2C.
Aiuti gli operatori a gestire ticket clienti, suggerire risposte, classificare priorità e proporre escalation.
Hai accesso al contesto del cliente selezionato. Rispondi in italiano, professionale e conciso.`,
  sales: `Sei un agente AI per la Rete di Vendita B2C.
Supporti i commerciali nell'analisi lead, follow-up, proposte e pipeline di vendita.
Hai accesso al contesto del cliente e della pipeline. Rispondi in italiano, orientato ai risultati.`,
  marketing: `Sei un agente AI per il Marketing Manager B2C.
Pianifichi campagne, segmenti clientela, ottimizzi funnel e analizzi performance.
Hai accesso ai dati delle campagne e dei segmenti. Rispondi in italiano, approccio data-driven.`,
};

async function callGroq(agentType, messages, apiKey) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODELS[agentType],
      messages: [{ role: "system", content: AGENT_PROMPTS[agentType] }, ...messages],
      max_tokens: 1024, temperature: 0.7,
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Errore Groq"); }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const initialContacts = [
  { id: 1, name: "Luca Ferretti", company: "Privato", email: "luca.ferretti@gmail.com", phone: "+39 338 1234567", status: "lead", value: 1200, segment: "Premium", lastContact: "2026-03-08", notes: "Interessato al piano annuale. Ha già acquistato una volta nel 2025.", interactions: [{date:"2026-03-08",type:"Email",note:"Inviata offerta piano annuale"},{date:"2026-02-20",type:"Chiamata",note:"Interesse confermato per upgrade"},{date:"2026-01-15",type:"Acquisto",note:"Primo acquisto €890"}] },
  { id: 2, name: "Sara Conti", company: "Freelance", email: "sara.conti@outlook.it", phone: "+39 347 9876543", status: "client", value: 4500, segment: "VIP", lastContact: "2026-03-09", notes: "Cliente fedele da 2 anni. Rinnovo automatico attivo.", interactions: [{date:"2026-03-09",type:"Ticket",note:"Problema fattura risolta"},{date:"2026-02-01",type:"Rinnovo",note:"Rinnovo piano Pro €1200"},{date:"2025-12-10",type:"Upsell",note:"Upgrade da Basic a Pro"}] },
  { id: 3, name: "Marco Bianchi", company: "Artigiano", email: "m.bianchi@libero.it", phone: "+39 333 5554433", status: "prospect", value: 850, segment: "Standard", lastContact: "2026-03-05", notes: "Valuta ancora l'acquisto. Concorrente principale: CompetitorX.", interactions: [{date:"2026-03-05",type:"Email",note:"Follow-up dopo demo"},{date:"2026-02-28",type:"Demo",note:"Demo prodotto completata"}] },
  { id: 4, name: "Elena Russo", company: "Consulente", email: "elena.russo@gmail.com", phone: "+39 329 1122334", status: "lead", value: 2200, segment: "Premium", lastContact: "2026-03-07", notes: "Contatto tramite campagna LinkedIn. Molto attiva sui social.", interactions: [{date:"2026-03-07",type:"Form",note:"Compilato modulo contatto da LinkedIn Ad"},{date:"2026-03-07",type:"Email",note:"Email di benvenuto automatica inviata"}] },
  { id: 5, name: "Giorgio Marini", company: "Pensionato", email: "g.marini@virgilio.it", phone: "+39 335 6677889", status: "client", value: 6700, segment: "VIP", lastContact: "2026-03-10", notes: "Cliente storico. Ha segnalato 3 amici. NPS: 10/10.", interactions: [{date:"2026-03-10",type:"Chiamata",note:"Ringraziamento per referral"},{date:"2026-02-14",type:"Regalo",note:"Inviato kit fedeltà VIP"},{date:"2026-01-01",type:"Rinnovo",note:"Rinnovo per il 3° anno consecutivo"}] },
  { id: 6, name: "Chiara Lombardi", company: "Studentessa", email: "chiara.lombardi@hotmail.it", phone: "+39 344 3344556", status: "lead", value: 290, segment: "Basic", lastContact: "2026-03-01", notes: "Interessata al piano student. Budget limitato.", interactions: [{date:"2026-03-01",type:"Chat",note:"Richiesta info piano student"}] },
];

const initialTickets = [
  { id: 101, contactId: 2, client: "Sara Conti", subject: "Fattura non ricevuta", priority: "high", status: "open", date: "2026-03-09", description: "Il cliente non ha ricevuto la fattura di febbraio e richiede invio urgente per nota spese.", category: "Fatturazione" },
  { id: 102, contactId: 5, client: "Giorgio Marini", subject: "Problema accesso portale", priority: "medium", status: "in-progress", date: "2026-03-08", description: "Impossibile accedere al portale dopo l'aggiornamento. Richiede assistenza tecnica.", category: "Tecnico" },
  { id: 103, contactId: 1, client: "Luca Ferretti", subject: "Richiesta demo prodotto", priority: "low", status: "open", date: "2026-03-07", description: "Interessato a una demo completa del modulo avanzato prima dell'acquisto.", category: "Commerciale" },
  { id: 104, contactId: 4, client: "Elena Russo", subject: "Errore nel report", priority: "high", status: "resolved", date: "2026-03-06", description: "I report mensili mostravano dati errati. Risolto con patch 2.1.4.", category: "Tecnico" },
  { id: 105, contactId: 3, client: "Marco Bianchi", subject: "Richiesta rimborso", priority: "medium", status: "open", date: "2026-03-04", description: "Richiede rimborso parziale per funzionalità non utilizzate nel periodo di prova.", category: "Fatturazione" },
];

const initialPipeline = [
  { id: 1, contactId: 1, name: "Luca Ferretti – Piano Annuale", stage: "Contatto", value: 1200, probability: 20, date: "2026-03-15", notes: "Inviata offerta. In attesa di risposta." },
  { id: 2, contactId: 4, name: "Elena Russo – Piano Pro", stage: "Proposta", value: 2200, probability: 60, date: "2026-03-20", notes: "Demo completata. Proposta inviata." },
  { id: 3, contactId: 3, name: "Marco Bianchi – Basic", stage: "Negoziazione", value: 850, probability: 75, date: "2026-03-18", notes: "Sta valutando con competitor. Sconto 10% proposto." },
  { id: 4, name: "Nuovo Lead – Campagna Spring", stage: "Qualifica", value: 500, probability: 30, date: "2026-03-25", notes: "Proveniente da campagna email. Da qualificare." },
  { id: 5, contactId: 6, name: "Chiara Lombardi – Student", stage: "Contatto", value: 290, probability: 40, date: "2026-03-22", notes: "Interessata a piano student." },
];

const initialCampaigns = [
  { id: 1, name: "Spring Promo 2026", type: "Email", status: "active", sent: 1240, opened: 342, clicks: 87, conversions: 23, budget: 500, date: "2026-03-01", segment: "Premium + VIP" },
  { id: 2, name: "LinkedIn B2B Q1", type: "Social", status: "active", sent: 0, opened: 890, clicks: 124, conversions: 18, budget: 800, date: "2026-02-15", segment: "Tutti" },
  { id: 3, name: "Newsletter Marzo", type: "Email", status: "draft", sent: 0, opened: 0, clicks: 0, conversions: 0, budget: 200, date: "2026-03-12", segment: "Standard + Basic" },
  { id: 4, name: "Retargeting Web", type: "Display", status: "paused", sent: 0, opened: 2300, clicks: 67, conversions: 9, budget: 1200, date: "2026-02-20", segment: "Lead" },
];

const salesData = [
  {month:"Ott",revenue:3200,leads:12},{month:"Nov",revenue:4100,leads:18},{month:"Dic",revenue:5800,leads:22},
  {month:"Gen",revenue:3900,leads:15},{month:"Feb",revenue:5200,leads:20},{month:"Mar",revenue:6100,leads:24},
];
const segmentData = [
  {name:"VIP",value:38,color:"#f59e0b"},{name:"Premium",value:31,color:"#8b5cf6"},
  {name:"Standard",value:21,color:"#3b82f6"},{name:"Basic",value:10,color:"#4a5568"},
];
const ticketData = [
  {day:"L",open:3,resolved:2},{day:"M",open:5,resolved:4},{day:"M",open:2,resolved:3},
  {day:"G",open:4,resolved:2},{day:"V",open:6,resolved:5},{day:"S",open:1,resolved:1},{day:"D",open:0,resolved:2},
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const statusColors = {
  lead:"#3b82f6",prospect:"#8b5cf6",client:"#10b981",
  open:"#ef4444","in-progress":"#f59e0b",resolved:"#10b981",
  active:"#10b981",draft:"#6b7280",paused:"#f59e0b",
  high:"#ef4444",medium:"#f59e0b",low:"#10b981",
  VIP:"#f59e0b",Premium:"#8b5cf6",Standard:"#3b82f6",Basic:"#4a5568",
};
const Badge = ({ label, small }) => (
  <span style={{
    background:(statusColors[label]||"#6b7280")+"22",color:statusColors[label]||"#6b7280",
    border:`1px solid ${(statusColors[label]||"#6b7280")}44`,
    padding:small?"1px 7px":"2px 10px",borderRadius:20,
    fontSize:small?10:11,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap"
  }}>{label}</span>
);

const Avatar = ({ name, size=36 }) => {
  const initials = name.split(" ").map(p=>p[0]).slice(0,2).join("");
  const hue = name.charCodeAt(0)*7%360;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:`hsl(${hue},50%,20%)`,border:`1.5px solid hsl(${hue},50%,35%)`,
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:700,color:`hsl(${hue},60%,70%)`,flexShrink:0}}>
      {initials}
    </div>
  );
};

// Icons
const Ic = ({ n, s=16 }) => {
  const d = {
    home:`<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>`,
    users:`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    ticket:`<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>`,
    pipe:`<path d="M3 3h18v4H3z"/><path d="M7 11h10v4H7z"/><path d="M10 19h4v2h-4z"/>`,
    mega:`<path d="m3 11 19-9-9 19-2-8-8-2z"/>`,
    bot:`<rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>`,
    send:`<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>`,
    key:`<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>`,
    x:`<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
    loader:`<path d="M21 12a9 9 0 1 1-6.219-8.56"/>`,
    plus:`<path d="M5 12h14"/><path d="M12 5v14"/>`,
    back:`<path d="m15 18-6-6 6-6"/>`,
    phone:`<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.1 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>`,
    mail:`<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>`,
    chart:`<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
    edit:`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
    check:`<path d="M20 6 9 17l-5-5"/>`,
    clock:`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
    star:`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
    note:`<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>`,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:d[n]||""}} />;
};

// ─── Agent Chat ────────────────────────────────────────────────────────────────
function AgentChat({ agent, agentCfg, apiKey, context, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const contextStr = context ? `\n\n[CONTESTO CLIENTE]\n${JSON.stringify(context, null, 2)}` : "";

  const send = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey) { setError("Inserisci la API Key Groq."); return; }
    const userMsg = { role:"user", content: input + (messages.length===0 ? contextStr : "") };
    setMessages(m => [...m, { role:"user", content:input }]);
    setInput(""); setLoading(true); setError("");
    try {
      const reply = await callGroq(agent, [...messages.map((m,i)=>i===0?{...m,content:m.content+contextStr}:m), userMsg], apiKey);
      setMessages(m => [...m, { role:"assistant", content:reply }]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const suggestions = {
    customerService:["Analizza questo ticket e suggerisci una risposta","Come gestisco questa escalation?","Qual è la priorità corretta?"],
    sales:["Suggerisci una strategia di follow-up","Prepara uno script per la chiamata","Come posso aumentare il valore del deal?"],
    marketing:["Che segmento dovrei targetizzare?","Suggerisci oggetto email per questa campagna","Analizza le performance attuali"],
  };

  return (
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:430,background:"#090c13",borderLeft:"1px solid #1a1f2e",display:"flex",flexDirection:"column",zIndex:100,boxShadow:"-12px 0 60px rgba(0,0,0,0.7)"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #1a1f2e",display:"flex",alignItems:"center",gap:12,background:"#070a10"}}>
        <div style={{width:42,height:42,borderRadius:13,background:agentCfg.gradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{agentCfg.emoji}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,color:"#e8eaf0",fontSize:14}}>{agentCfg.name}</div>
          <div style={{fontSize:10,color:"#3a4456",fontFamily:"monospace"}}>{GROQ_MODELS[agent]} · Groq</div>
        </div>
        {context && <div style={{fontSize:10,background:"#1a1f2e",border:"1px solid #252b3b",borderRadius:6,padding:"3px 8px",color:"#4a5568",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📎 {context.name||context.client||"Contesto"}</div>}
        <button onClick={onClose} style={{background:"none",border:"none",color:"#4a5568",cursor:"pointer",padding:4}}><Ic n="x" s={16}/></button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
        {messages.length===0 && (
          <div style={{marginTop:20}}>
            <div style={{textAlign:"center",color:"#2d3748",marginBottom:20}}>
              <div style={{fontSize:30,marginBottom:8}}>{agentCfg.emoji}</div>
              <div style={{fontSize:13,color:"#4a5568",lineHeight:1.7}}>Sono {agentCfg.name}.<br/>Come posso aiutarti?</div>
            </div>
            <div style={{fontSize:11,color:"#2d3748",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Suggerimenti</div>
            {suggestions[agent].map((s,i)=>(
              <button key={i} onClick={()=>setInput(s)} style={{display:"block",width:"100%",textAlign:"left",background:"#111520",border:"1px solid #1a1f2e",borderRadius:8,padding:"9px 12px",color:"#6b7280",fontSize:12,cursor:"pointer",marginBottom:6,transition:"all 0.15s"}}
                onMouseEnter={e=>e.target.style.borderColor="#252b3b"} onMouseLeave={e=>e.target.style.borderColor="#1a1f2e"}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            {m.role==="assistant"&&<div style={{width:26,height:26,borderRadius:8,background:agentCfg.gradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,marginRight:8,alignSelf:"flex-end"}}>{agentCfg.emoji}</div>}
            <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?agentCfg.accent:"#111520",color:m.role==="user"?"#fff":"#c8ccd8",fontSize:13,lineHeight:1.7,border:m.role==="assistant"?"1px solid #1a1f2e":"none",whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:8,alignItems:"center",color:"#4a5568",fontSize:12}}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={agentCfg.color} strokeWidth="2" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Elaborazione...</div>}
        {error&&<div style={{background:"#2d1515",border:"1px solid #7f1d1d",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#f87171"}}>{error}</div>}
        <div ref={bottomRef}/>
      </div>

      <div style={{padding:"14px 16px",borderTop:"1px solid #1a1f2e"}}>
        <div style={{display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
            placeholder="Scrivi un messaggio..." style={{flex:1,background:"#111520",border:"1px solid #1a1f2e",borderRadius:10,padding:"10px 14px",color:"#e8eaf0",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{background:agentCfg.accent,border:"none",borderRadius:10,padding:"10px 14px",color:"#fff",cursor:"pointer",opacity:loading||!input.trim()?0.4:1,transition:"opacity 0.2s"}}><Ic n="send" s={15}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Forms ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0e1219",border:"1px solid #1a1f2e",borderRadius:18,width:"100%",maxWidth:500,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 80px rgba(0,0,0,0.8)"}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid #1a1f2e",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:16}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#4a5568",cursor:"pointer"}}><Ic n="x" s={18}/></button>
        </div>
        <div style={{padding:"20px 24px"}}>{children}</div>
      </div>
    </div>
  );
}

const inputStyle = {width:"100%",background:"#111520",border:"1px solid #1a1f2e",borderRadius:10,padding:"10px 14px",color:"#e8eaf0",fontSize:13,outline:"none",fontFamily:"inherit",marginBottom:14};
const labelStyle = {fontSize:11,color:"#4a5568",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5,display:"block"};
const btnPrimary = (color="#2563eb")=>({background:color,border:"none",borderRadius:10,padding:"11px 20px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"});

function ContactForm({ contact, onSave, onClose }) {
  const [form, setForm] = useState(contact||{name:"",company:"",email:"",phone:"",status:"lead",segment:"Standard",notes:""});
  const set = (k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <div><label style={labelStyle}>Nome *</label><input style={inputStyle} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Nome Cognome"/></div>
        <div><label style={labelStyle}>Azienda</label><input style={inputStyle} value={form.company} onChange={e=>set("company",e.target.value)} placeholder="Privato"/></div>
        <div><label style={labelStyle}>Email *</label><input style={inputStyle} value={form.email} onChange={e=>set("email",e.target.value)} placeholder="email@esempio.it"/></div>
        <div><label style={labelStyle}>Telefono</label><input style={inputStyle} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+39 ..."/></div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={{...inputStyle,marginBottom:14}} value={form.status} onChange={e=>set("status",e.target.value)}>
            {["lead","prospect","client"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Segmento</label>
          <select style={{...inputStyle,marginBottom:14}} value={form.segment} onChange={e=>set("segment",e.target.value)}>
            {["Basic","Standard","Premium","VIP"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <label style={labelStyle}>Note</label>
      <textarea style={{...inputStyle,height:80,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Note sul cliente..."/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{...btnPrimary("#1a1f2e"),color:"#6b7280"}}>Annulla</button>
        <button onClick={()=>onSave(form)} style={btnPrimary()}>{contact?"Aggiorna":"Crea Contatto"}</button>
      </div>
    </div>
  );
}

function TicketForm({ contacts, onSave, onClose }) {
  const [form, setForm] = useState({contactId:"",subject:"",priority:"medium",category:"Commerciale",description:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const selectedContact = contacts.find(c=>c.id===Number(form.contactId));
  return (
    <div>
      <label style={labelStyle}>Cliente</label>
      <select style={{...inputStyle}} value={form.contactId} onChange={e=>set("contactId",e.target.value)}>
        <option value="">Seleziona cliente...</option>
        {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <label style={labelStyle}>Oggetto *</label>
      <input style={inputStyle} value={form.subject} onChange={e=>set("subject",e.target.value)} placeholder="Descrizione breve del problema"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <div>
          <label style={labelStyle}>Priorità</label>
          <select style={inputStyle} value={form.priority} onChange={e=>set("priority",e.target.value)}>
            {["low","medium","high"].map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Categoria</label>
          <select style={inputStyle} value={form.category} onChange={e=>set("category",e.target.value)}>
            {["Tecnico","Fatturazione","Commerciale","Altro"].map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <label style={labelStyle}>Descrizione</label>
      <textarea style={{...inputStyle,height:90,resize:"vertical"}} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Descrivi il problema in dettaglio..."/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{...btnPrimary("#1a1f2e"),color:"#6b7280"}}>Annulla</button>
        <button onClick={()=>onSave({...form,client:selectedContact?.name||"Sconosciuto",status:"open",date:new Date().toISOString().slice(0,10)})} style={btnPrimary("#ef4444")}>Apri Ticket</button>
      </div>
    </div>
  );
}

// ─── Contact Detail ────────────────────────────────────────────────────────────
function ContactDetail({ contact, tickets, pipeline, onBack, onAgentOpen }) {
  const cTickets = tickets.filter(t=>t.contactId===contact.id);
  const cPipeline = pipeline.filter(p=>p.contactId===contact.id);
  const totalSpent = contact.value;
  const typeIcon = {Email:"✉️",Chiamata:"📞",Acquisto:"💳",Rinnovo:"🔄",Upsell:"⬆️",Demo:"🖥️",Form:"📝",Ticket:"🎫",Chat:"💬",Regalo:"🎁"};

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
        <button onClick={onBack} style={{background:"#111520",border:"1px solid #1a1f2e",borderRadius:10,padding:"8px 14px",color:"#6b7280",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><Ic n="back" s={14}/>Indietro</button>
        <div style={{display:"flex",alignItems:"center",gap:14,flex:1}}>
          <Avatar name={contact.name} size={52}/>
          <div>
            <div style={{fontWeight:800,fontSize:20,letterSpacing:"-0.02em"}}>{contact.name}</div>
            <div style={{fontSize:13,color:"#4a5568"}}>{contact.company}</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <Badge label={contact.status}/><Badge label={contact.segment}/>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:20}}>
        {/* Left column */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Info */}
          <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
            <div style={{fontSize:11,color:"#2d3748",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Informazioni</div>
            {[{icon:"mail",label:contact.email},{icon:"phone",label:contact.phone},{icon:"star",label:`Valore: €${contact.value.toLocaleString()}`},{icon:"clock",label:`Ultimo contatto: ${contact.lastContact}`}].map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,fontSize:13,color:"#8892a4"}}>
                <span style={{color:"#2d3748"}}><Ic n={r.icon} s={14}/></span>{r.label}
              </div>
            ))}
            {contact.notes && (
              <div style={{marginTop:8,padding:"10px 12px",background:"#111520",borderRadius:8,fontSize:12,color:"#6b7280",lineHeight:1.7,border:"1px solid #1a1f2e"}}>
                📝 {contact.notes}
              </div>
            )}
          </div>

          {/* KPI */}
          <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
            <div style={{fontSize:11,color:"#2d3748",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>KPI Cliente</div>
            {[{label:"Ticket totali",val:cTickets.length,color:"#ef4444"},{label:"Opportunità pipeline",val:cPipeline.length,color:"#8b5cf6"},{label:"Interazioni",val:contact.interactions.length,color:"#3b82f6"},{label:"Valore totale",val:`€${totalSpent.toLocaleString()}`,color:"#10b981"}].map((k,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,fontSize:13}}>
                <span style={{color:"#4a5568"}}>{k.label}</span>
                <span style={{fontWeight:700,color:k.color}}>{k.val}</span>
              </div>
            ))}
          </div>

          {/* AI Agents */}
          <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
            <div style={{fontSize:11,color:"#2d3748",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Agenti AI</div>
            {[{k:"customerService",emoji:"🎧",label:"Customer Service",color:"#2563eb"},{k:"sales",emoji:"📈",label:"Sales",color:"#7c3aed"},{k:"marketing",emoji:"🎯",label:"Marketing",color:"#059669"}].map(a=>(
              <button key={a.k} onClick={()=>onAgentOpen(a.k,contact)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"#111520",border:`1px solid ${a.color}22`,borderRadius:8,padding:"8px 12px",cursor:"pointer",marginBottom:8,color:a.color,fontSize:12,fontWeight:600}}>
                <span>{a.emoji}</span> Chiedi a {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Storico */}
          <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:16}}>Storico Interazioni</div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {contact.interactions.map((intr,i)=>(
                <div key={i} style={{display:"flex",gap:14,paddingBottom:16,position:"relative"}}>
                  {i<contact.interactions.length-1&&<div style={{position:"absolute",left:18,top:30,bottom:0,width:1,background:"#1a1f2e"}}/>}
                  <div style={{width:36,height:36,borderRadius:10,background:"#131825",border:"1px solid #1a1f2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,zIndex:1}}>{typeIcon[intr.type]||"📌"}</div>
                  <div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <span style={{fontWeight:600,fontSize:13}}>{intr.type}</span>
                      <span style={{fontSize:11,color:"#2d3748",fontFamily:"monospace"}}>{intr.date}</span>
                    </div>
                    <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6}}>{intr.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tickets */}
          {cTickets.length>0&&(
            <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Ticket Correlati</div>
              {cTickets.map(t=>(
                <div key={t.id} style={{background:"#111520",border:"1px solid #1a1f2e",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontWeight:600,fontSize:13}}>{t.subject}</span>
                    <div style={{display:"flex",gap:6}}><Badge label={t.priority} small/><Badge label={t.status} small/></div>
                  </div>
                  <div style={{fontSize:12,color:"#4a5568"}}>{t.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Pipeline */}
          {cPipeline.length>0&&(
            <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Opportunità Pipeline</div>
              {cPipeline.map(p=>(
                <div key={p.id} style={{background:"#111520",border:"1px solid #1a1f2e",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontWeight:600,fontSize:13}}>{p.name}</span>
                    <span style={{fontWeight:700,color:"#8b5cf6"}}>€{p.value.toLocaleString()}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#4a5568",marginBottom:8}}>
                    <Badge label={p.stage} small/><span>{p.probability}% probabilità</span>
                  </div>
                  <div style={{height:3,background:"#1a1f2e",borderRadius:2}}><div style={{height:"100%",width:`${p.probability}%`,background:"#8b5cf6",borderRadius:2}}/></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Analytics ───────────────────────────────────────────────────────
function Dashboard({ contacts, tickets, pipeline, campaigns, onAgentOpen }) {
  const totalValue = contacts.reduce((s,c)=>s+c.value,0);
  const openTickets = tickets.filter(t=>t.status==="open").length;
  const pipelineValue = pipeline.reduce((s,p)=>s+p.value,0);
  const activeCampaigns = campaigns.filter(c=>c.status==="active").length;
  const clients = contacts.filter(c=>c.status==="client").length;
  const agents = [
    {k:"customerService",emoji:"🎧",name:"Customer Service",desc:"Gestisci ticket, escalation e risposte clienti",gradient:"linear-gradient(135deg,#1d4ed8,#3b82f6)",accent:"#2563eb",color:"#3b82f6"},
    {k:"sales",emoji:"📈",name:"Sales Agent",desc:"Pipeline, follow-up e proposte commerciali",gradient:"linear-gradient(135deg,#6d28d9,#8b5cf6)",accent:"#7c3aed",color:"#8b5cf6"},
    {k:"marketing",emoji:"🎯",name:"Marketing Manager",desc:"Campagne, segmenti e ottimizzazione funnel",gradient:"linear-gradient(135deg,#065f46,#10b981)",accent:"#059669",color:"#10b981"},
  ];

  const customTooltip = ({active,payload,label})=>{
    if(!active||!payload?.length) return null;
    return <div style={{background:"#111520",border:"1px solid #1a1f2e",borderRadius:8,padding:"8px 12px",fontSize:12}}><div style={{color:"#4a5568",marginBottom:4}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.color,fontWeight:600}}>{p.name}: {p.name==="revenue"?`€${p.value.toLocaleString()}`:p.value}</div>)}</div>;
  };

  return (
    <div>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:24}}>
        {[
          {label:"Portfolio Totale",val:`€${(totalValue/1000).toFixed(1)}K`,sub:`${clients} clienti attivi`,color:"#10b981"},
          {label:"Pipeline Attiva",val:`€${(pipelineValue/1000).toFixed(1)}K`,sub:`${pipeline.length} opportunità`,color:"#8b5cf6"},
          {label:"Ticket Aperti",val:openTickets,sub:`${tickets.length} totali`,color:"#ef4444"},
          {label:"Campagne Live",val:activeCampaigns,sub:`${campaigns.length} totali`,color:"#3b82f6"},
          {label:"Lead Attivi",val:contacts.filter(c=>c.status==="lead").length,sub:`${contacts.filter(c=>c.status==="prospect").length} prospect`,color:"#f59e0b"},
        ].map((k,i)=>(
          <div key={i} style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:"18px 20px"}}>
            <div style={{fontSize:10,color:"#3a4456",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{k.label}</div>
            <div style={{fontSize:26,fontWeight:800,color:k.color,letterSpacing:"-0.03em",marginBottom:4}}>{k.val}</div>
            <div style={{fontSize:11,color:"#2d3748"}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:16}}>Revenue & Lead (ultimi 6 mesi)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{fill:"#2d3748",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#2d3748",fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={customTooltip}/>
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)"/>
              <Line type="monotone" dataKey="leads" name="leads" stroke="#3b82f6" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:16}}>Segmenti Clientela</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={segmentData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {segmentData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip formatter={(v)=>`${v}%`} contentStyle={{background:"#111520",border:"1px solid #1a1f2e",borderRadius:8,fontSize:12}}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px 12px",marginTop:8}}>
            {segmentData.map(s=><div key={s.name} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#4a5568"}}><div style={{width:8,height:8,borderRadius:2,background:s.color}}/>{s.name} {s.value}%</div>)}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
        <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:16}}>Ticket Settimana</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={ticketData} barSize={16} barGap={4}>
              <XAxis dataKey="day" tick={{fill:"#2d3748",fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={customTooltip}/>
              <Bar dataKey="open" name="aperti" fill="#ef444422" stroke="#ef4444" strokeWidth={1} radius={[4,4,0,0]}/>
              <Bar dataKey="resolved" name="risolti" fill="#10b98122" stroke="#10b981" strokeWidth={1} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:16}}>Performance Campagne</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={campaigns.filter(c=>c.opened>0)} layout="vertical" barSize={14}>
              <XAxis type="number" tick={{fill:"#2d3748",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:"#4a5568",fontSize:10}} axisLine={false} tickLine={false} width={100}/>
              <Tooltip content={customTooltip}/>
              <Bar dataKey="opened" name="aperture" fill="#3b82f622" stroke="#3b82f6" strokeWidth={1} radius={[0,4,4,0]}/>
              <Bar dataKey="clicks" name="clicks" fill="#8b5cf622" stroke="#8b5cf6" strokeWidth={1} radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agents */}
      <div style={{fontSize:12,color:"#2d3748",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Agenti AI Disponibili</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {agents.map(ag=>(
          <div key={ag.k} style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:20,display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:13,background:ag.gradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{ag.emoji}</div>
              <div><div style={{fontWeight:700,fontSize:14}}>{ag.name}</div><div style={{fontSize:10,color:"#3a4456",fontFamily:"monospace"}}>{GROQ_MODELS[ag.k]}</div></div>
            </div>
            <div style={{fontSize:12,color:"#4a5568",lineHeight:1.7,flex:1,marginBottom:14}}>{ag.desc}</div>
            <button onClick={()=>onAgentOpen(ag.k,null)} style={{...btnPrimary(ag.accent),width:"100%",textAlign:"center"}}>Avvia Agente →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function CRM() {
  const [section, setSection] = useState("dashboard");
  const [contacts, setContacts] = useState(initialContacts);
  const [tickets, setTickets] = useState(initialTickets);
  const [pipeline] = useState(initialPipeline);
  const [campaigns] = useState(initialCampaigns);
  const [selectedContact, setSelectedContact] = useState(null);
  const [activeAgent, setActiveAgent] = useState(null);
  const [agentContext, setAgentContext] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const agentCfgs = {
    customerService:{name:"Customer Service",emoji:"🎧",gradient:"linear-gradient(135deg,#1d4ed8,#3b82f6)",accent:"#2563eb",color:"#3b82f6"},
    sales:{name:"Sales Agent",emoji:"📈",gradient:"linear-gradient(135deg,#6d28d9,#8b5cf6)",accent:"#7c3aed",color:"#8b5cf6"},
    marketing:{name:"Marketing",emoji:"🎯",gradient:"linear-gradient(135deg,#065f46,#10b981)",accent:"#059669",color:"#10b981"},
  };

  const openAgent = (agentKey, ctx=null) => { setActiveAgent(agentKey); setAgentContext(ctx); };

  const nav = [
    {id:"dashboard",label:"Dashboard",icon:"home"},
    {id:"contacts",label:"Contatti",icon:"users"},
    {id:"pipeline",label:"Pipeline",icon:"pipe"},
    {id:"tickets",label:"Ticket",icon:"ticket"},
    {id:"campaigns",label:"Campagne",icon:"mega"},
  ];

  const sectionAgent = {tickets:"customerService",pipeline:"sales",campaigns:"marketing"};

  const saveContact = (form) => {
    if (editingContact) {
      setContacts(cs=>cs.map(c=>c.id===editingContact.id?{...c,...form}:c));
    } else {
      setContacts(cs=>[...cs,{...form,id:Date.now(),value:0,lastContact:new Date().toISOString().slice(0,10),interactions:[]}]);
    }
    setShowContactForm(false); setEditingContact(null);
  };

  const saveTicket = (form) => {
    setTickets(ts=>[...ts,{...form,id:Date.now()}]);
    setShowTicketForm(false);
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#070a10",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#e8eaf0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:#1a1f2e;border-radius:4px;}
        .nav-btn:hover{background:#0e1219!important;color:#c8ccd8!important;}
        .row:hover{background:#0d1018!important;}
        .card-hover:hover{border-color:#1e2334!important;transform:translateY(-1px);transition:all 0.2s;}
        .agent-btn-side:hover{filter:brightness(1.15);transform:translateX(2px);}
        input,select,textarea{transition:border 0.15s;}
        input:focus,select:focus,textarea:focus{border-color:#252b3b!important;}
        input::placeholder,textarea::placeholder{color:#2d3748;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.2s ease}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .pulse{animation:pulse 2s infinite}
      `}</style>

      {/* Sidebar */}
      <div style={{width:218,background:"#070a10",borderRight:"1px solid #0f1219",display:"flex",flexDirection:"column",padding:"0",flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
        <div style={{padding:"22px 20px 18px",borderBottom:"1px solid #0f1219"}}>
          <div style={{fontWeight:800,fontSize:20,letterSpacing:"-0.03em"}}>
            <span style={{background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>AI</span>
            <span style={{color:"#e8eaf0"}}>CRM</span>
          </div>
          <div style={{fontSize:10,color:"#2d3748",marginTop:3,fontFamily:"monospace",letterSpacing:"0.04em"}}>powered by GROQ</div>
        </div>

        <nav style={{padding:"12px 10px",flex:1,overflowY:"auto"}}>
          <div style={{fontSize:9,color:"#1e2334",textTransform:"uppercase",letterSpacing:"0.1em",padding:"0 8px",marginBottom:8}}>Navigazione</div>
          {nav.map(item=>(
            <button key={item.id} className="nav-btn" onClick={()=>{setSection(item.id);setSelectedContact(null);}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",borderRadius:9,border:"none",cursor:"pointer",textAlign:"left",fontSize:13,fontWeight:section===item.id?600:400,background:section===item.id?"#0e1219":"transparent",color:section===item.id?"#e8eaf0":"#3a4456",borderLeft:`2px solid ${section===item.id?"#3b82f6":"transparent"}`,marginBottom:1,transition:"all 0.15s"}}>
              <Ic n={item.icon} s={14}/>{item.label}
            </button>
          ))}

          <div style={{fontSize:9,color:"#1e2334",textTransform:"uppercase",letterSpacing:"0.1em",padding:"16px 8px 8px"}}>Agenti AI</div>
          {Object.entries(agentCfgs).map(([k,ag])=>(
            <button key={k} className="agent-btn-side" onClick={()=>openAgent(k,null)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:9,border:`1px solid ${activeAgent===k?ag.color+"44":"#0f1219"}`,background:activeAgent===k?ag.color+"11":"transparent",cursor:"pointer",textAlign:"left",fontSize:12,fontWeight:500,color:activeAgent===k?ag.color:"#3a4456",marginBottom:4,transition:"all 0.15s"}}>
              <span style={{fontSize:15}}>{ag.emoji}</span>
              <span>{ag.name}</span>
              {activeAgent===k&&<span className="pulse" style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:ag.color}}/>}
            </button>
          ))}
        </nav>

        <div style={{padding:"14px 10px",borderTop:"1px solid #0f1219"}}>
          <button onClick={()=>setShowKeyInput(!showKeyInput)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${apiKey?"#10b98133":"#0f1219"}`,background:"transparent",cursor:"pointer",fontSize:11,color:apiKey?"#10b981":"#3a4456",fontWeight:500,transition:"all 0.15s"}}>
            <Ic n="key" s={12}/>{apiKey?"✓ API Key attiva":"Imposta API Key Groq"}
          </button>
          {showKeyInput&&(
            <div style={{marginTop:8,animation:"fadeIn 0.15s ease"}}>
              <input value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="gsk_..." style={{...inputStyle,marginBottom:6,fontSize:11}}/>
              <button onClick={()=>{setApiKey(keyInput);setShowKeyInput(false);}} style={{...btnPrimary(),width:"100%",fontSize:11}}>Salva</button>
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,overflow:"auto",paddingRight:activeAgent?430:0,transition:"padding 0.3s",minWidth:0}}>
        {/* Topbar */}
        <div style={{padding:"16px 24px",borderBottom:"1px solid #0a0d14",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#070a10",position:"sticky",top:0,zIndex:10,gap:12}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:700,letterSpacing:"-0.02em"}}>
              {selectedContact ? selectedContact.name : nav.find(n=>n.id===section)?.label}
            </h1>
            <div style={{fontSize:11,color:"#2d3748",marginTop:1}}>Martedì 10 Marzo 2026</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {section==="contacts"&&!selectedContact&&(
              <button onClick={()=>{setEditingContact(null);setShowContactForm(true);}} style={{...btnPrimary(),display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                <Ic n="plus" s={13}/>Nuovo Contatto
              </button>
            )}
            {section==="tickets"&&(
              <button onClick={()=>setShowTicketForm(true)} style={{...btnPrimary("#ef4444"),display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                <Ic n="plus" s={13}/>Nuovo Ticket
              </button>
            )}
            {sectionAgent[section]&&!selectedContact&&(
              <button onClick={()=>openAgent(sectionAgent[section],null)} style={{...btnPrimary(agentCfgs[sectionAgent[section]].accent),display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                <Ic n="bot" s={13}/>Agente AI
              </button>
            )}
          </div>
        </div>

        <div style={{padding:"22px 24px"}} className="fade-in">
          {/* DASHBOARD */}
          {section==="dashboard"&&<Dashboard contacts={contacts} tickets={tickets} pipeline={pipeline} campaigns={campaigns} onAgentOpen={openAgent}/>}

          {/* CONTACTS */}
          {section==="contacts"&&!selectedContact&&(
            <div style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"14px 20px",borderBottom:"1px solid #0f1219",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:600,fontSize:14}}>Tutti i Contatti</span>
                <span style={{fontSize:11,color:"#2d3748"}}>{contacts.length} records</span>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#090c13"}}>
                  {["","Nome","Azienda","Email","Status","Segmento","Valore","Ultimo Contatto",""].map((h,i)=>(
                    <th key={i} style={{padding:"11px 16px",textAlign:"left",fontSize:10,color:"#2d3748",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {contacts.map(c=>(
                    <tr key={c.id} className="row" onClick={()=>setSelectedContact(c)} style={{borderTop:"1px solid #0a0d14",cursor:"pointer"}}>
                      <td style={{padding:"12px 16px"}}><Avatar name={c.name} size={32}/></td>
                      <td style={{padding:"12px 16px",fontWeight:600,fontSize:13}}>{c.name}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#6b7280"}}>{c.company}</td>
                      <td style={{padding:"12px 16px",fontSize:11,color:"#3a4456",fontFamily:"monospace"}}>{c.email}</td>
                      <td style={{padding:"12px 16px"}}><Badge label={c.status} small/></td>
                      <td style={{padding:"12px 16px"}}><Badge label={c.segment} small/></td>
                      <td style={{padding:"12px 16px",fontSize:13,fontWeight:700,color:"#10b981"}}>€{c.value.toLocaleString()}</td>
                      <td style={{padding:"12px 16px",fontSize:11,color:"#2d3748"}}>{c.lastContact}</td>
                      <td style={{padding:"12px 16px"}} onClick={e=>{e.stopPropagation();setEditingContact(c);setShowContactForm(true);}}>
                        <span style={{color:"#3a4456",cursor:"pointer"}}><Ic n="edit" s={13}/></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CONTACT DETAIL */}
          {section==="contacts"&&selectedContact&&(
            <ContactDetail contact={selectedContact} tickets={tickets} pipeline={pipeline}
              onBack={()=>setSelectedContact(null)} onAgentOpen={openAgent}/>
          )}

          {/* PIPELINE */}
          {section==="pipeline"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
              {["Contatto","Qualifica","Proposta","Negoziazione"].map(stage=>{
                const items=pipeline.filter(p=>p.stage===stage);
                const total=items.reduce((s,p)=>s+p.value,0);
                return (
                  <div key={stage} style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,overflow:"hidden"}}>
                    <div style={{padding:"13px 16px",borderBottom:"1px solid #0f1219"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontWeight:600,fontSize:13}}>{stage}</span>
                        <span style={{fontSize:10,background:"#131825",border:"1px solid #1a1f2e",borderRadius:6,padding:"2px 7px",color:"#4a5568"}}>{items.length}</span>
                      </div>
                      <div style={{fontSize:12,color:"#8b5cf6",fontWeight:700,marginTop:3}}>€{total.toLocaleString()}</div>
                    </div>
                    <div style={{padding:10,display:"flex",flexDirection:"column",gap:8,minHeight:250}}>
                      {items.map(p=>(
                        <div key={p.id} style={{background:"#131825",border:"1px solid #1a1f2e",borderRadius:10,padding:"12px 13px"}}>
                          {p.contactId&&<div style={{fontSize:10,color:"#3a4456",marginBottom:5}}>👤 {contacts.find(c=>c.id===p.contactId)?.name||""}</div>}
                          <div style={{fontWeight:600,fontSize:12,marginBottom:6,lineHeight:1.4}}>{p.name}</div>
                          <div style={{fontSize:15,fontWeight:800,color:"#8b5cf6",marginBottom:8}}>€{p.value.toLocaleString()}</div>
                          <div style={{fontSize:11,color:"#2d3748",marginBottom:6,lineHeight:1.5}}>{p.notes}</div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#3a4456",marginBottom:6}}>
                            <span>{p.probability}% prob.</span><span>{p.date}</span>
                          </div>
                          <div style={{height:3,background:"#1a1f2e",borderRadius:2}}>
                            <div style={{height:"100%",width:`${p.probability}%`,background:`hsl(${p.probability*1.2},60%,50%)`,borderRadius:2,transition:"width 0.5s"}}/>
                          </div>
                        </div>
                      ))}
                      {items.length===0&&<div style={{fontSize:12,color:"#1e2334",textAlign:"center",padding:"30px 0"}}>Nessuna opportunità</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TICKETS */}
          {section==="tickets"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {tickets.map(t=>{
                const contact=contacts.find(c=>c.id===t.contactId);
                return (
                  <div key={t.id} className="card-hover" style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:"16px 20px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8,gap:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        {contact&&<Avatar name={contact.name} size={32}/>}
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                            <span style={{fontFamily:"monospace",fontSize:10,color:"#2d3748"}}>#{t.id}</span>
                            <span style={{fontWeight:700,fontSize:14}}>{t.subject}</span>
                          </div>
                          <span style={{fontSize:11,color:"#3a4456"}}>{t.client} · {t.category}</span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <Badge label={t.priority} small/><Badge label={t.status} small/>
                      </div>
                    </div>
                    <div style={{fontSize:13,color:"#4a5568",lineHeight:1.6,marginBottom:10}}>{t.description}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#2d3748"}}>
                      <span>{t.date}</span>
                      <button onClick={()=>openAgent("customerService",{...t,contactInfo:contact})} style={{background:"#1d4ed811",border:"1px solid #1d4ed833",borderRadius:7,padding:"5px 10px",color:"#3b82f6",cursor:"pointer",fontSize:11,fontWeight:600}}>
                        🎧 Chiedi all'agente
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CAMPAIGNS */}
          {section==="campaigns"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {campaigns.map(c=>{
                const ctr=c.opened>0?(c.clicks/c.opened*100).toFixed(1):0;
                const conv=c.opened>0?(c.conversions/c.opened*100).toFixed(1):0;
                return (
                  <div key={c.id} className="card-hover" style={{background:"#0e1219",border:"1px solid #131825",borderRadius:14,padding:"18px 22px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:40,height:40,borderRadius:11,background:c.type==="Email"?"#1d4ed822":c.type==="Social"?"#6d28d922":"#06504622",border:`1px solid ${c.type==="Email"?"#1d4ed844":c.type==="Social"?"#6d28d944":"#06504644"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                          {c.type==="Email"?"✉️":c.type==="Social"?"📱":c.type==="Display"?"🖥️":"📢"}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:15}}>{c.name}</div>
                          <div style={{fontSize:11,color:"#3a4456"}}>{c.type} · {c.segment} · {c.date}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Badge label={c.status}/>
                        <button onClick={()=>openAgent("marketing",c)} style={{background:"#06504622",border:"1px solid #06504644",borderRadius:7,padding:"5px 10px",color:"#10b981",cursor:"pointer",fontSize:11,fontWeight:600}}>
                          🎯 Analizza con AI
                        </button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
                      {[{l:"Budget",v:`€${c.budget.toLocaleString()}`,c:"#f59e0b"},{l:"Inviati",v:c.sent.toLocaleString(),c:"#3b82f6"},{l:"Aperture",v:c.opened.toLocaleString(),c:"#8b5cf6"},{l:"Click",v:c.clicks,c:"#10b981"},{l:"Conversioni",v:c.conversions,c:"#ef4444"}].map((m,i)=>(
                        <div key={i} style={{textAlign:"center",background:"#111520",borderRadius:8,padding:"10px 8px",border:"1px solid #1a1f2e"}}>
                          <div style={{fontSize:17,fontWeight:800,color:m.c}}>{m.v}</div>
                          <div style={{fontSize:10,color:"#2d3748",marginTop:2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{m.l}</div>
                        </div>
                      ))}
                    </div>
                    {c.opened>0&&(
                      <div style={{display:"flex",gap:16,marginTop:10,fontSize:11,color:"#4a5568"}}>
                        <span>CTR: <strong style={{color:"#10b981"}}>{ctr}%</strong></span>
                        <span>Conv. Rate: <strong style={{color:"#8b5cf6"}}>{conv}%</strong></span>
                        <span>ROI: <strong style={{color:"#f59e0b"}}>€{(c.conversions*45-c.budget).toLocaleString()}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Agent Panel */}
      {activeAgent&&(
        <AgentChat agent={activeAgent} agentCfg={agentCfgs[activeAgent]} apiKey={apiKey}
          context={agentContext} onClose={()=>{setActiveAgent(null);setAgentContext(null);}}/>
      )}

      {/* Modals */}
      {showContactForm&&(
        <Modal title={editingContact?"Modifica Contatto":"Nuovo Contatto"} onClose={()=>{setShowContactForm(false);setEditingContact(null);}}>
          <ContactForm contact={editingContact} onSave={saveContact} onClose={()=>{setShowContactForm(false);setEditingContact(null);}}/>
        </Modal>
      )}
      {showTicketForm&&(
        <Modal title="Apri Nuovo Ticket" onClose={()=>setShowTicketForm(false)}>
          <TicketForm contacts={contacts} onSave={saveTicket} onClose={()=>setShowTicketForm(false)}/>
        </Modal>
      )}
    </div>
  );
}
