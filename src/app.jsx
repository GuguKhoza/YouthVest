import { useState, useEffect } from 'react';

// ============================================================
// CONFIGURATION — REPLACE WITH YOUR REAL KEYS
// ============================================================
const CONFIG = {
  supabase: {
    url: 'https://biheagvyxsvcszubwptz.supabase.co',
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpaGVhZ3Z5eHN2Y3N6dWJ3cHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTIxMzQsImV4cCI6MjA4OTkyODEzNH0._iK0eBtjTgcmAwSlRFr3oqf1J4A2RqpBed91DVrHGG4",
  },
  originstamp: {
    apiKey: 'YOUR_ORIGINSTAMP_API_KEY',
  },
  payfast: {
    merchantId: 'YOUR_PAYFAST_MERCHANT_ID',
    merchantKey: 'YOUR_PAYFAST_MERCHANT_KEY',
    returnUrl: 'https://youthvest.co.za/payment/success',
    cancelUrl: 'https://youthvest.co.za/payment/cancel',
    notifyUrl: 'https://youthvest.co.za/api/payfast/notify',
    sandbox: true,
  },
};

// ============================================================
// SUPABASE CLIENT
// ============================================================
const supabase = (() => {
  const headers = {
    'Content-Type': 'application/json',
    apikey: CONFIG.supabase.anonKey,
    Authorization: `Bearer ${CONFIG.supabase.anonKey}`,
  };
  const base = CONFIG.supabase.url;

  const query = async (table, method = 'GET', body = null, params = "") => {
    const res = await fetch(`${base}/rest/v1/${table}${params}`, {
      method,
      headers: { ...headers, "Prefer": method === "POST" ? "return=representation" : "" },
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.status === 204 ? null : res.json();
  };

  return {
    from: (table) => ({
      select: (cols = "*", params = "") => query(table, "GET", null, `?select=${cols}${params}`),
      insert: (data) => query(table, "POST", data),
      update: (data, match) => query(table, "PATCH", data, `?${match}`),
      eq: (col, val, extra = "") => query(table, "GET", null, `?${col}=eq.${val}${extra}`),
    }),
  };
})();

// ============================================================
// ORIGINSTAMP — Blockchain IP Timestamping
// ============================================================
const timestampIP = async (content) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content + Date.now());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  try {
    const res = await fetch("https://api.originstamp.com/v4/timestamp/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: CONFIG.originstamp.apiKey },
      body: JSON.stringify({ comment: "YouthVest IP Protection", hash }),
    });
    const result = await res.json();
    return { hash, success: result.error_code === 0, data: result.data };
  } catch {
    return { hash, success: false, data: null };
  }
};

// ============================================================
// PAYFAST — Payment Integration
// ============================================================
const initiatePayFast = ({ amount, investorName, investorEmail, projectTitle, projectId, investorId }) => {
  const pf = CONFIG.payfast;
  const paymentId = `YV-${Date.now()}`;

  const params = {
    merchant_id: pf.merchantId,
    merchant_key: pf.merchantKey,
    return_url: pf.returnUrl,
    cancel_url: pf.cancelUrl,
    notify_url: pf.notifyUrl,
    name_first: investorName.split(" ")[0],
    name_last: investorName.split(" ").slice(1).join(" ") || ".",
    email_address: investorEmail,
    m_payment_id: paymentId,
    amount: Number(amount).toFixed(2),
    item_name: `YouthVest: ${projectTitle}`,
    item_description: `Fractional equity investment in ${projectTitle}`,
    custom_str1: projectId,
    custom_str2: investorId,
  };

  const host = pf.sandbox ? "https://sandbox.payfast.co.za" : "https://www.payfast.co.za";
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${host}/eng/process`;
  Object.entries(params).forEach(([k, v]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
};

// ============================================================
// DESIGN TOKENS
// ============================================================
const C = {
  gold: "#F5A623",
  green: "#00C48C",
  dark: "#0A0A0F",
  mid: "#13131F",
  card: "#1A1A2E",
  border: "rgba(245,166,35,0.15)",
  muted: "rgba(255,255,255,0.45)",
};

const GS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap'); *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; } body { font-family:'DM Sans',sans-serif; background:#0A0A0F; color:#fff; } ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0A0A0F} ::-webkit-scrollbar-thumb{background:#F5A623;border-radius:2px} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} input,select,textarea{color-scheme:dark} input:focus,select:focus,textarea:focus{outline:none;border-color:rgba(245,166,35,0.5)!important}`;

const inp = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 16px", color:"#fff", fontSize:14, width:"100%", fontFamily:"DM Sans", transition:"border-color .2s" };
const lbl = { fontSize:12, color:C.muted, marginBottom:6, display:"block", letterSpacing:.5 };

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? "rgba(0,196,140,0.15)" : type === "error" ? "rgba(239,68,68,0.15)" : "rgba(245,166,35,0.15)";
  const border = type === "success" ? C.green : type === "error" ? "#ef4444" : C.gold;
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "i";
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:bg, border:`1px solid ${border}`, borderRadius:12, padding:"14px 20px", maxWidth:340, animation:"fadeUp .3s ease", display:"flex", gap:12, alignItems:"center" }}>
      <span>{icon}</span>
      <span style={{ fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.5 }}>{msg}</span>
      <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", marginLeft:"auto", fontSize:16 }}>x</button>
    </div>
  );
}

// ============================================================
// SPINNER
// ============================================================
const Spinner = ({ color = "#000", size = 16 }) => (
  <div style={{ width:size, height:size, border:`2px solid ${color}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
);

// ============================================================
// NAVIGATION
// ============================================================
function Nav({ page, setPage }) {
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(10,10,15,0.94)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(245,166,35,0.08)", padding:"0 40px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div onClick={()=>setPage("home")} style={{ fontFamily:"Syne", fontWeight:800, fontSize:22, color:C.gold, cursor:"pointer" }}>YouthVest</div>
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        {[["Projects","projects"],["Dashboard","dashboard"]].map(([l,p])=>(
          <button key={p} onClick={()=>setPage(p)} style={{ background:page===p?"rgba(245,166,35,0.1)":"transparent", color:page===p?C.gold:"rgba(255,255,255,0.55)", border:page===p?"1px solid rgba(245,166,35,0.3)":"1px solid transparent", padding:"7px 16px", borderRadius:100, fontSize:13, cursor:"pointer", transition:"all .2s" }}>{l}</button>
        ))}
        <button onClick={()=>setPage("invest")} style={{ background:C.gold, color:"#000", border:"none", padding:"8px 20px", borderRadius:100, fontFamily:"Syne", fontWeight:700, fontSize:13, cursor:"pointer" }}>Invest Now</button>
        <button onClick={()=>setPage("founder")} style={{ background:"transparent", color:C.green, border:`1px solid ${C.green}`, padding:"8px 20px", borderRadius:100, fontFamily:"Syne", fontWeight:700, fontSize:13, cursor:"pointer" }}>List Project</button>
      </div>
    </nav>
  );
}

// ============================================================
// HOME PAGE
// ============================================================
function Home({ setPage, projects }) {
  const totalRaised = projects.reduce((s,p)=>s+(p.amount_raised||0),0);
  const stats = [
    ["R"+totalRaised.toLocaleString("en-ZA"), "Total Raised"],
    [projects.length+"", "Live Projects"],
    ["R50", "Minimum Investment"],
    ["100%", "IP Protected"],
  ];
  return (
    <div style={{ paddingTop:64 }}>
      <div style={{ minHeight:"90vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"80px 24px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,166,35,0.07) 0%,transparent 70%)", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" }}/>
        <div style={{ animation:"fadeUp .5s ease" }}>
          <div style={{ display:"inline-block", background:"rgba(245,166,35,0.1)", border:"1px solid rgba(245,166,35,0.3)", color:C.gold, padding:"6px 18px", borderRadius:100, fontSize:11, letterSpacing:3, textTransform:"uppercase", fontFamily:"Syne", marginBottom:28 }}>By Youth - For Youth - South Africa</div>
          <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:"clamp(44px,7vw,84px)", lineHeight:1.02, marginBottom:24, maxWidth:800 }}>
            Fund the next<br/><span style={{ color:C.gold }}>generation</span> of<br/>African founders.
          </h1>
          <p style={{ fontSize:17, color:"rgba(255,255,255,0.6)", maxWidth:500, lineHeight:1.7, margin:"0 auto 40px" }}>
            Invest from <strong style={{ color:"#fff" }}>R50</strong> into youth-led SA businesses. Own fractional equity. Your IP protected by blockchain from day one.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={()=>setPage("projects")} style={{ background:C.gold, color:"#000", border:"none", padding:"15px 34px", borderRadius:100, fontFamily:"Syne", fontWeight:700, fontSize:15, cursor:"pointer" }}>Browse Projects</button>
            <button onClick={()=>setPage("founder")} style={{ background:"transparent", color:"#fff", border:"1px solid rgba(255,255,255,0.2)", padding:"15px 34px", borderRadius:100, fontFamily:"Syne", fontSize:15, cursor:"pointer" }}>List Your Project</button>
          </div>
          <div style={{ display:"flex", gap:48, marginTop:64, justifyContent:"center", flexWrap:"wrap" }}>
            {stats.map(([v,l])=>(
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:30, color:C.gold }}>{v}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4, letterSpacing:1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding:"72px 40px", background:C.mid, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <p style={{ fontFamily:"Syne", fontSize:11, letterSpacing:3, color:C.gold, textTransform:"uppercase", marginBottom:12 }}>How It Works</p>
            <h2 style={{ fontFamily:"Syne", fontWeight:800, fontSize:38 }}>Simple. Safe. <span style={{ color:C.gold }}>Powerful.</span></h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20 }}>
            {[
              ["01","Submit Project","Founders list their idea, funding goal, and equity offer. Takes 10 minutes."],
              ["02","IP Timestamped","Your idea is hashed on OriginStamp's blockchain — immutable proof of origin."],
              ["03","Investors Sign NDA","Every investor signs a legally binding NDA before seeing your full details."],
              ["04","Get Funded","Goal reached → PayFast releases funds. Equity certificates issued automatically."]
            ].map(([icon,title,desc],i)=>(
              <div key={i} style={{ background:C.card, border:"1px solid rgba(255,255,255,0.05)", borderRadius:16, padding:"28px 22px" }}>
                <div style={{ width:44,height:44,background:"rgba(245,166,35,0.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontFamily:"Syne",fontWeight:800,color:C.gold,marginBottom:16 }}>{icon}</div>
                <h3 style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, marginBottom:8 }}>{title}</h3>
                <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live projects preview */}
      {projects.length > 0 && (
        <div style={{ padding:"72px 40px" }}>
          <div style={{ maxWidth:960, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:36, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ fontFamily:"Syne", fontWeight:800, fontSize:34 }}>Live <span style={{ color:C.gold }}>Projects</span></h2>
              <button onClick={()=>setPage("projects")} style={{ background:"transparent", color:C.gold, border:`1px solid ${C.gold}`, padding:"10px 22px", borderRadius:100, fontFamily:"Syne", fontSize:13, cursor:"pointer" }}>View All</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:22 }}>
              {projects.slice(0,2).map(p=><ProjectCard key={p.id} p={p} setPage={setPage}/>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROJECT CARD
// ============================================================
function ProjectCard({ p, setPage }) {
  const pct = Math.min(Math.round(((p.amount_raised||0)/p.funding_goal)*100), 100);
  const catColors = { AgriTech:"#00C48C", EdTech:"#6366f1", FinTech:"#F5A623", HealthTech:"#ec4899", CleanEnergy:"#f59e0b", Retail:"#8b5cf6", "Social Impact":"#06b6d4", Other:"#6b7280" };
  const cc = catColors[p.category] || "#888";
  const daysLeft = p.campaign_end_date ? Math.max(0, Math.ceil((new Date(p.campaign_end_date)-new Date())/86400000)) : null;

  return (
    <div
      style={{ background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:26, display:"flex", flexDirection:"column", gap:14, cursor:"pointer", transition:"all .2s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(245,166,35,0.35)";e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.transform="translateY(0)"}}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ background:`${cc}18`, border:`1px solid ${cc}40`, color:cc, padding:"4px 12px", borderRadius:100, fontSize:11, fontFamily:"Syne" }}>{p.category}</div>
        {daysLeft !== null && daysLeft <= 7 && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", padding:"4px 10px", borderRadius:100, fontSize:10, fontFamily:"Syne", animation:"pulse 2s infinite" }}>
            {daysLeft}d left
          </div>
        )}
      </div>
      <div>
        <h3 style={{ fontFamily:"Syne", fontWeight:800, fontSize:19, marginBottom:2 }}>{p.project_title}</h3>
        <p style={{ fontSize:12, color:C.muted }}>by {p.full_name} · {p.business_name}</p>
      </div>
      <p style={{ fontSize:13, color:"rgba(255,255,255,0.62)", lineHeight:1.6 }}>{p.description.slice(0,140)}...</p>
      {p.ip_hash && (
        <div style={{ display:"flex", gap:6, alignItems:"center", fontSize:11, color:C.green }}>
          <span>✓</span><span>IP Blockchain Verified</span>
        </div>
      )}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
          <span style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:C.gold }}>R{(p.amount_raised||0).toLocaleString("en-ZA")}</span>
          <span style={{ fontSize:12, color:C.muted }}>{pct}% of R{Number(p.funding_goal).toLocaleString("en-ZA")}</span>
        </div>
        <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:100, height:5, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${C.gold},${C.green})`, borderRadius:100 }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
          <span style={{ fontSize:11, color:C.muted }}>{p.backer_count||0} backers</span>
          <span style={{ fontSize:11, color:C.muted }}>{p.equity_offered}% equity</span>
        </div>
      </div>
      <button onClick={()=>setPage("invest")} style={{ background:pct>=100?"rgba(0,196,140,0.1)":C.gold, color:pct>=100?C.green:"#000", border:pct>=100?`1px solid ${C.green}`:"none", padding:"11px", borderRadius:11, fontFamily:"Syne", fontWeight:700, fontSize:13, cursor:pct>=100?"default":"pointer", width:"100%" }}>
        {pct>=100?"Fully Funded":"Invest from R50"}
      </button>
    </div>
  );
}

// ============================================================
// PROJECTS PAGE
// ============================================================
function Projects({ setPage, projects, loading }) {
  const [filter, setFilter] = useState("All");
  const cats = ["All", ...new Set(projects.map(p=>p.category))];
  const filtered = filter==="All" ? projects : projects.filter(p=>p.category===filter);

  return (
    <div style={{ paddingTop:88, padding:"88px 40px 60px", maxWidth:1040, margin:"0 auto" }}>
      <div style={{ marginBottom:36 }}>
        <p style={{ fontFamily:"Syne", fontSize:11, letterSpacing:3, color:C.gold, textTransform:"uppercase", marginBottom:10 }}>Live Campaigns</p>
        <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:42, marginBottom:8 }}>Browse <span style={{ color:C.gold }}>Projects</span></h1>
        <p style={{ color:C.muted, fontSize:15 }}>Every project is IP-protected and founder-verified. Invest from R50.</p>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:32, flexWrap:"wrap" }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{ background:filter===c?"rgba(245,166,35,0.12)":"rgba(255,255,255,0.04)", color:filter===c?C.gold:"rgba(255,255,255,0.55)", border:filter===c?"1px solid rgba(245,166,35,0.4)":"1px solid rgba(255,255,255,0.07)", padding:"8px 18px", borderRadius:100, fontSize:13, cursor:"pointer", transition:"all .15s" }}>{c}</button>
        ))}
      </div>
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"80px 0" }}><Spinner color={C.gold} size={32}/></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 0", color:C.muted }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🚀</div>
          <p style={{ fontFamily:"Syne", fontSize:18 }}>No projects yet — be the first to list yours!</p>
          <button onClick={()=>setPage("founder")} style={{ background:C.gold, color:"#000", border:"none", padding:"12px 28px", borderRadius:100, fontFamily:"Syne", fontWeight:700, cursor:"pointer", marginTop:20 }}>List a Project</button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:22 }}>
          {filtered.map(p=><ProjectCard key={p.id} p={p} setPage={setPage}/>)}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FOUNDER FORM
// ============================================================
function FounderForm({ setPage, addToast }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name:"", email:"", phone:"", sa_id:"", business_name:"", cipc_number:"",
    project_title:"", category:"", description:"", funding_goal:"", equity_offered:"",
    use_of_funds:"", agreed:false
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const ipContent = `${form.project_title}|${form.description}|${form.email}`;
      const { hash, success } = await timestampIP(ipContent);

      const payload = {
        ...form,
        funding_goal: Number(form.funding_goal),
        equity_offered: Number(form.equity_offered),
        ip_hash: hash,
        ip_timestamp: new Date().toISOString(),
        status: "pending",
        campaign_end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
      };
      delete payload.agreed;

      await supabase.from("founders").insert(payload);
      setSubmitted({ hash, ipSuccess: success, project: form.project_title });
      addToast("Project submitted and IP protected!", "success");
    } catch (err) {
      addToast("Submission failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div style={{ paddingTop:64, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 24px" }}>
      <div style={{ background:C.card, border:"1px solid rgba(0,196,140,0.3)", borderRadius:24, padding:"48px 40px", maxWidth:520, textAlign:"center", animation:"fadeUp .4s ease" }}>
        <div style={{ width:72, height:72, background:"rgba(0,196,140,0.1)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 20px" }}>✓</div>
        <h2 style={{ fontFamily:"Syne", fontWeight:800, fontSize:26, marginBottom:10 }}>Project Submitted!</h2>
        <p style={{ color:C.muted, lineHeight:1.7, marginBottom:20, fontSize:14 }}>
          Your project <strong style={{ color:"#fff" }}>"{submitted.project}"</strong> has been received and your IP is {submitted.ipSuccess ? "blockchain-timestamped on OriginStamp" : "locally hashed"}. We will review and go live within 48 hours.
        </p>
        <div style={{ background:"rgba(245,166,35,0.06)", border:"1px solid rgba(245,166,35,0.2)", borderRadius:12, padding:16, marginBottom:24, textAlign:"left" }}>
          <p style={{ fontSize:11, letterSpacing:2, color:C.gold, fontFamily:"Syne", marginBottom:8 }}>YOUR IP CERTIFICATE HASH</p>
          <p style={{ fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,0.45)", wordBreak:"break-all" }}>{submitted.hash}</p>
          <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>{new Date().toLocaleString("en-ZA")}</p>
        </div>
        <button onClick={()=>setPage("projects")} style={{ background:C.gold, color:"#000", border:"none", padding:"12px 30px", borderRadius:100, fontFamily:"Syne", fontWeight:700, cursor:"pointer" }}>View Live Projects</button>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop:88, padding:"88px 24px 60px", maxWidth:660, margin:"0 auto" }}>
      <div style={{ marginBottom:36 }}>
        <p style={{ fontFamily:"Syne", fontSize:11, letterSpacing:3, color:C.gold, textTransform:"uppercase", marginBottom:10 }}>For Founders</p>
        <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:38, marginBottom:6 }}>List Your <span style={{ color:C.gold }}>Project</span></h1>
        <p style={{ color:C.muted, fontSize:14 }}>IP timestamped on blockchain the moment you submit.</p>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:32 }}>
        {["Personal Info","Project Details","Funding & Submit"].map((s,i)=>(
          <div key={i} style={{ flex:1 }}>
            <div style={{ height:3, borderRadius:100, background:step>i+1?"rgba(0,196,140,0.6)":step===i+1?C.gold:"rgba(255,255,255,0.1)", marginBottom:5, transition:"background .3s" }}/>
            <span style={{ fontSize:10, color:step===i+1?C.gold:C.muted }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={{ background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:"32px 28px" }}>
        {step===1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:18, animation:"fadeUp .3s ease" }}>
            <h3 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17, marginBottom:4 }}>Personal Information</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={lbl}>Full Name *</label><input style={inp} value={form.full_name} onChange={e=>set("full_name",e.target.value)} placeholder="Thabo Nkosi"/></div>
              <div><label style={lbl}>Email *</label><input style={inp} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="you@email.com"/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={lbl}>Phone Number</label><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="071 234 5678"/></div>
              <div><label style={lbl}>SA ID Number *</label><input style={inp} value={form.sa_id} onChange={e=>set("sa_id",e.target.value)} placeholder="9001015800082"/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={lbl}>Business Name *</label><input style={inp} value={form.business_name} onChange={e=>set("business_name",e.target.value)} placeholder="AgroLink SA (Pty) Ltd"/></div>
              <div><label style={lbl}>CIPC Reg. Number</label><input style={inp} value={form.cipc_number} onChange={e=>set("cipc_number",e.target.value)} placeholder="2024/123456/07"/></div>
            </div>
            <div style={{ background:"rgba(245,166,35,0.05)", border:"1px solid rgba(245,166,35,0.15)", borderRadius:10, padding:13, fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.6 }}>
              Protected under POPIA. Your data is encrypted and never shared without your consent.
            </div>
          </div>
        )}

        {step===2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:18, animation:"fadeUp .3s ease" }}>
            <h3 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17, marginBottom:4 }}>Project Details</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={lbl}>Project Title *</label><input style={inp} value={form.project_title} onChange={e=>set("project_title",e.target.value)} placeholder="AgroLink SA"/></div>
              <div>
                <label style={lbl}>Category *</label>
                <select style={{ ...inp, cursor:"pointer" }} value={form.category} onChange={e=>set("category",e.target.value)}>
                  <option value="">Select category</option>
                  {["AgriTech","EdTech","FinTech","HealthTech","CleanEnergy","Retail","Social Impact","Other"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>Project Description * <span style={{ color:C.muted }}>(min 100 words)</span></label>
              <textarea style={{ ...inp, height:130, resize:"vertical" }} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Describe the problem you're solving, your solution, traction so far, and why you're the right team to build this..."/>
              <span style={{ fontSize:11, color:form.description.split(" ").length>=20?C.green:C.muted, marginTop:4, display:"block" }}>{form.description.split(" ").filter(Boolean).length} words</span>
            </div>
          </div>
        )}

        {step===3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:18, animation:"fadeUp .3s ease" }}>
            <h3 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17, marginBottom:4 }}>Funding Details</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={lbl}>Funding Goal (R) *</label><input style={inp} type="number" value={form.funding_goal} onChange={e=>set("funding_goal",e.target.value)} placeholder="100000"/></div>
              <div><label style={lbl}>Equity Offered (%) *</label><input style={inp} type="number" min="1" max="49" value={form.equity_offered} onChange={e=>set("equity_offered",e.target.value)} placeholder="20"/></div>
            </div>
            {form.funding_goal && form.equity_offered && (
              <div style={{ background:"rgba(0,196,140,0.07)", border:"1px solid rgba(0,196,140,0.2)", borderRadius:10, padding:14 }}>
                <p style={{ fontFamily:"Syne", fontSize:11, color:C.green, marginBottom:6 }}>Implied Valuation</p>
                <p style={{ fontSize:14, color:"rgba(255,255,255,0.8)" }}>R{Math.round(Number(form.funding_goal)/(Number(form.equity_offered)/100)).toLocaleString("en-ZA")}</p>
                <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>Investors buy {form.equity_offered}% for R{Number(form.funding_goal).toLocaleString("en-ZA")}</p>
              </div>
            )}
            <div>
              <label style={lbl}>Use of Funds *</label>
              <textarea style={{ ...inp, height:90, resize:"vertical" }} value={form.use_of_funds} onChange={e=>set("use_of_funds",e.target.value)} placeholder="e.g. 40% product dev, 30% marketing, 20% ops, 10% legal..."/>
            </div>
            <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
              <input type="checkbox" checked={form.agreed} onChange={e=>set("agreed",e.target.checked)} style={{ marginTop:3, accentColor:C.gold }}/>
              <span style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>I agree to YouthVest's <span style={{ color:C.gold }}>Founder Terms</span> and <span style={{ color:C.gold }}>NDA Policy</span>. I confirm this project is lawful and my CIPC registration is in progress or complete.</span>
            </label>
          </div>
        )}

        <div style={{ display:"flex", justifyContent:"space-between", marginTop:24, gap:12 }}>
          {step>1
            ? <button onClick={()=>setStep(s=>s-1)} style={{ background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.65)", border:"1px solid rgba(255,255,255,0.1)", padding:"11px 24px", borderRadius:100, fontFamily:"Syne", cursor:"pointer" }}>Back</button>
            : <div/>
          }
          {step<3
            ? <button
                onClick={()=>setStep(s=>s+1)}
                disabled={(step===1&&(!form.full_name||!form.email||!form.sa_id))||(step===2&&(!form.project_title||!form.category||!form.description))}
                style={{ background:C.gold, color:"#000", border:"none", padding:"11px 28px", borderRadius:100, fontFamily:"Syne", fontWeight:700, cursor:"pointer" }}>
                Continue
              </button>
            : <button
                onClick={handleSubmit}
                disabled={!form.agreed||!form.funding_goal||!form.equity_offered||loading}
                style={{ background:form.agreed?C.gold:"rgba(255,255,255,0.08)", color:form.agreed?"#000":"rgba(255,255,255,0.3)", border:"none", padding:"11px 28px", borderRadius:100, fontFamily:"Syne", fontWeight:700, cursor:form.agreed?"pointer":"not-allowed", display:"flex", alignItems:"center", gap:10 }}>
                {loading ? <><Spinner/> Timestamping IP...</> : "Submit & Protect IP"}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INVESTOR FORM
// ============================================================
function InvestForm({ setPage, projects, addToast }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name:"", email:"", phone:"", sa_id:"", investment_range:"",
    risk_acknowledged:false, nda_agreed:false, selectedProject:"", amount:""
  });
  const [loading, setLoading] = useState(false);
  const [investorId, setInvestorId] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await supabase.from("investors").insert({
        full_name: form.full_name, email: form.email, phone: form.phone,
        sa_id: form.sa_id, investment_range: form.investment_range,
        risk_acknowledged: form.risk_acknowledged, status:"registered",
      });
      if (result && result[0]) setInvestorId(result[0].id);
      setStep(2);
      addToast("Account created! Please sign the NDA.", "success");
    } catch (err) {
      addToast("Registration failed: " + err.message, "error");
    } finally { setLoading(false); }
  };

  const handleNDA = async () => {
    setLoading(true);
    try {
      const d = new TextEncoder().encode((investorId || "") + Date.now());
      const h = await crypto.subtle.digest("SHA-256", d);
      const sigHash = Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");

      await supabase.from("ndas").insert({
        investor_id: investorId,
        signature_hash: sigHash,
      });
      if (investorId) {
        await supabase.from("investors").update(
          { nda_signed:true, nda_signed_at:new Date().toISOString() },
          `id=eq.${investorId}`
        );
      }
      setStep(3);
      addToast("NDA signed and recorded!", "success");
    } catch (err) {
      addToast("NDA signing failed: " + err.message, "error");
    } finally { setLoading(false); }
  };

  const handleInvest = () => {
    if (!form.selectedProject || !form.amount || Number(form.amount) < 50) {
      addToast("Please select a project and enter at least R50", "error");
      return;
    }
    const project = projects.find(p=>p.id===form.selectedProject);
    if (!project) return;
    initiatePayFast({
      amount: form.amount,
      investorName: form.full_name,
      investorEmail: form.email,
      projectTitle: project.project_title,
      projectId: project.id,
      investorId: investorId || "guest",
    });
  };

  return (
    <div style={{ paddingTop:88, padding:"88px 24px 60px", maxWidth:620, margin:"0 auto" }}>
      <div style={{ marginBottom:36 }}>
        <p style={{ fontFamily:"Syne", fontSize:11, letterSpacing:3, color:C.gold, textTransform:"uppercase", marginBottom:10 }}>For Investors</p>
        <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:38, marginBottom:6 }}>Start <span style={{ color:C.gold }}>Investing</span></h1>
        <p style={{ color:C.muted, fontSize:14 }}>Back SA youth from R50. Sign NDA. Own real equity.</p>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:32 }}>
        {["Your Details","Sign NDA","Invest"].map((s,i)=>(
          <div key={i} style={{ flex:1 }}>
            <div style={{ height:3, borderRadius:100, background:step>i+1?"rgba(0,196,140,0.6)":step===i+1?C.gold:"rgba(255,255,255,0.1)", marginBottom:5, transition:"background .3s" }}/>
            <span style={{ fontSize:10, color:step===i+1?C.gold:C.muted }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={{ background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:"32px 28px" }}>
        {step===1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:18, animation:"fadeUp .3s ease" }}>
            <h3 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17 }}>Create Investor Account</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={lbl}>Full Name *</label><input style={inp} value={form.full_name} onChange={e=>set("full_name",e.target.value)} placeholder="Your full name"/></div>
              <div><label style={lbl}>Email *</label><input style={inp} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="you@email.com"/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="071 234 5678"/></div>
              <div><label style={lbl}>SA ID Number * (FICA)</label><input style={inp} value={form.sa_id} onChange={e=>set("sa_id",e.target.value)} placeholder="9001015800082"/></div>
            </div>
            <div>
              <label style={lbl}>Investment Range</label>
              <select style={{ ...inp, cursor:"pointer" }} value={form.investment_range} onChange={e=>set("investment_range",e.target.value)}>
                <option value="">Select range</option>
                {["R50 – R500","R500 – R2,000","R2,000 – R10,000","R10,000+"].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <label style={{ display:"flex", gap:12, cursor:"pointer" }}>
              <input type="checkbox" checked={form.risk_acknowledged} onChange={e=>set("risk_acknowledged",e.target.checked)} style={{ marginTop:3, accentColor:C.gold }}/>
              <span style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>I understand startup investing carries significant risk including total loss of capital. YouthVest is in pre-launch — full FSCA licensing is in progress.</span>
            </label>
          </div>
        )}

        {step===2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:18, animation:"fadeUp .3s ease" }}>
            <h3 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17 }}>Non-Disclosure Agreement</h3>
            <p style={{ fontSize:13, color:C.muted, lineHeight:1.7 }}>Before accessing project details, you must sign this NDA. This legally protects every founder on YouthVest.</p>
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:18, fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.9, maxHeight:180, overflowY:"auto" }}>
              <strong style={{ color:"#fff", display:"block", marginBottom:8 }}>YOUTHVEST NON-DISCLOSURE AGREEMENT</strong>
              By signing, you agree all project details, business plans, financials, and intellectual property shared through YouthVest are strictly confidential. You agree not to disclose, reproduce, or use this information for any purpose other than evaluating an investment. Breach may result in legal action under South African law and permanent platform removal. Governed by the laws of the Republic of South Africa.
            </div>
            <label style={{ display:"flex", gap:12, cursor:"pointer" }}>
              <input type="checkbox" checked={form.nda_agreed} onChange={e=>set("nda_agreed",e.target.checked)} style={{ marginTop:3, accentColor:C.gold }}/>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.7)", lineHeight:1.6 }}>I have read and agree to the NDA. I understand violations have legal consequences.</span>
            </label>
          </div>
        )}

        {step===3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:18, animation:"fadeUp .3s ease" }}>
            <h3 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17 }}>Choose Project & Amount</h3>
            <div>
              <label style={lbl}>Select Project *</label>
              <select style={{ ...inp, cursor:"pointer" }} value={form.selectedProject} onChange={e=>set("selectedProject",e.target.value)}>
                <option value="">Choose a project to back</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.project_title} — {p.equity_offered}% equity · Goal: R{Number(p.funding_goal).toLocaleString("en-ZA")}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Investment Amount (R) * <span style={{ color:C.muted }}>— minimum R50</span></label>
              <input style={inp} type="number" min="50" value={form.amount} onChange={e=>set("amount",e.target.value)} placeholder="e.g. 500"/>
            </div>
            {form.selectedProject && form.amount && Number(form.amount)>=50 && (() => {
              const p = projects.find(pr=>pr.id===form.selectedProject);
              if (!p) return null;
              const frac = (Number(form.amount)/Number(p.funding_goal))*Number(p.equity_offered);
              return (
                <div style={{ background:"rgba(0,196,140,0.07)", border:"1px solid rgba(0,196,140,0.2)", borderRadius:10, padding:14 }}>
                  <p style={{ fontFamily:"Syne", fontSize:11, color:C.green, marginBottom:6 }}>Your Equity Preview</p>
                  <p style={{ fontSize:14, color:"rgba(255,255,255,0.85)" }}>You will own <strong style={{ color:"#fff" }}>{frac.toFixed(4)}%</strong> of {p.project_title}</p>
                  <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>Payment processed securely via PayFast</p>
                </div>
              );
            })()}
            <div style={{ background:"rgba(245,166,35,0.05)", border:"1px solid rgba(245,166,35,0.15)", borderRadius:10, padding:13, fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
              You will be redirected to PayFast's secure payment page. After payment, your equity certificate will be issued within 24 hours.
            </div>
          </div>
        )}

        <div style={{ display:"flex", justifyContent:"space-between", marginTop:24, gap:12 }}>
          {step>1
            ? <button onClick={()=>setStep(s=>s-1)} style={{ background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.65)", border:"1px solid rgba(255,255,255,0.1)", padding:"11px 24px", borderRadius:100, fontFamily:"Syne", cursor:"pointer" }}>Back</button>
            : <div/>
          }
          {step===1 && (
            <button
              onClick={handleRegister}
              disabled={!form.full_name||!form.email||!form.sa_id||!form.risk_acknowledged||loading}
              style={{ background:form.full_name&&form.email&&form.sa_id&&form.risk_acknowledged?C.gold:"rgba(255,255,255,0.08)", color:form.full_name&&form.email?"#000":"rgba(255,255,255,0.3)", border:"none", padding:"11px 28px", borderRadius:100, fontFamily:"Syne", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              {loading ? <><Spinner/> Saving...</> : "Continue"}
            </button>
          )}
          {step===2 && (
            <button
              onClick={handleNDA}
              disabled={!form.nda_agreed||loading}
              style={{ background:form.nda_agreed?C.gold:"rgba(255,255,255,0.08)", color:form.nda_agreed?"#000":"rgba(255,255,255,0.3)", border:"none", padding:"11px 28px", borderRadius:100, fontFamily:"Syne", fontWeight:700, cursor:form.nda_agreed?"pointer":"not-allowed", display:"flex", alignItems:"center", gap:10 }}>
              {loading ? <><Spinner/> Signing...</> : "Sign NDA & Continue"}
            </button>
          )}
          {step===3 && (
            <button
              onClick={handleInvest}
              disabled={!form.selectedProject||!form.amount||Number(form.amount)<50}
              style={{ background:form.selectedProject&&form.amount?C.gold:"rgba(255,255,255,0.08)", color:form.selectedProject&&form.amount?"#000":"rgba(255,255,255,0.3)", border:"none", padding:"11px 28px", borderRadius:100, fontFamily:"Syne", fontWeight:700, cursor:"pointer" }}>
              Pay via PayFast
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ projects, investments }) {
  const [tab, setTab] = useState("overview");
  const totalRaised = projects.reduce((s,p)=>s+(p.amount_raised||0),0);
  const liveProjects = projects.filter(p=>p.status==="live").length;

  return (
    <div style={{ paddingTop:88, padding:"88px 40px 60px", maxWidth:1000, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32, flexWrap:"wrap", gap:16 }}>
        <div>
          <p style={{ fontSize:12, color:C.muted, marginBottom:4 }}>Admin Dashboard</p>
          <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:30 }}>YouthVest <span style={{ color:C.gold }}>Overview</span></h1>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {["overview","projects","investments"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ background:tab===t?"rgba(245,166,35,0.1)":"rgba(255,255,255,0.04)", color:tab===t?C.gold:"rgba(255,255,255,0.55)", border:tab===t?"1px solid rgba(245,166,35,0.3)":"1px solid transparent", padding:"7px 16px", borderRadius:100, fontSize:13, cursor:"pointer", textTransform:"capitalize", transition:"all .15s" }}>{t}</button>
          ))}
        </div>
      </div>

      {tab==="overview" && (
        <div style={{ animation:"fadeUp .3s ease" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:28 }}>
            {[
              ["Total Raised","R"+totalRaised.toLocaleString("en-ZA"),C.gold],
              ["Live Projects",liveProjects,C.green],
              ["Total Investors",investments.length,"#6366f1"],
              ["Pending Review",projects.filter(p=>p.status==="pending").length,C.gold]
            ].map(([l,v,color])=>(
              <div key={l} style={{ background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"22px 20px" }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>{l}</div>
                <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:28, color }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:24 }}>
            <h3 style={{ fontFamily:"Syne", fontWeight:700, marginBottom:18, fontSize:16 }}>Recent Projects</h3>
            {projects.length===0
              ? <p style={{ color:C.muted, fontSize:13 }}>No projects yet. Share your listing link!</p>
              : projects.slice(0,5).map(p=>(
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>{p.project_title}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{p.full_name} · {p.business_name}</div>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:13, color:C.gold, fontFamily:"Syne", fontWeight:700 }}>R{(p.amount_raised||0).toLocaleString()}</span>
                    <span style={{ background:p.status==="live"?"rgba(0,196,140,0.1)":"rgba(245,166,35,0.1)", color:p.status==="live"?C.green:C.gold, border:`1px solid ${p.status==="live"?"rgba(0,196,140,0.3)":"rgba(245,166,35,0.3)"}`, padding:"3px 10px", borderRadius:100, fontSize:11, fontFamily:"Syne" }}>{p.status}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {tab==="projects" && (
        <div style={{ animation:"fadeUp .3s ease", display:"flex", flexDirection:"column", gap:14 }}>
          {projects.length===0
            ? <p style={{ color:C.muted }}>No projects submitted yet.</p>
            : projects.map(p=>(
              <div key={p.id} style={{ background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"22px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <h3 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17 }}>{p.project_title}</h3>
                    <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>{p.full_name} · {p.email} · {p.category}</p>
                    {p.ip_hash && <p style={{ fontSize:11, color:C.green, marginTop:5 }}>IP Hash: {p.ip_hash.slice(0,24)}...</p>}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:20, color:C.gold }}>R{Number(p.funding_goal).toLocaleString()}</div>
                    <div style={{ fontSize:12, color:C.muted }}>{p.equity_offered}% equity · {p.status}</div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab==="investments" && (
        <div style={{ animation:"fadeUp .3s ease" }}>
          {investments.length===0
            ? <p style={{ color:C.muted }}>No investments yet.</p>
            : <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {investments.map(inv=>(
                <div key={inv.id} style={{ background:C.card, border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>Investment #{inv.id?.slice(0,8)}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Status: {inv.payment_status}</div>
                  </div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:18, color:C.gold }}>R{Number(inv.amount).toLocaleString()}</div>
                </div>
              ))}
            </div>
          }
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [page, setPage] = useState("home");
  const [projects, setProjects] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const addToast = (msg, type="info") => setToast({ msg, type });

  useEffect(() => {
    const load = async () => {
      try {
        const [proj, inv] = await Promise.all([
          supabase.from("founders").select("*", "&order=created_at.desc"),
          supabase.from("investments").select("*", "&order=created_at.desc&limit=50"),
        ]);
        setProjects(Array.isArray(proj) ? proj : []);
        setInvestments(Array.isArray(inv) ? inv : []);
      } catch (err) {
        console.warn("Supabase not connected yet:", err.message);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const pages = {
    home: <Home setPage={setPage} projects={projects}/>,
    projects: <Projects setPage={setPage} projects={projects} loading={loading}/>,
    founder: <FounderForm setPage={setPage} addToast={addToast}/>,
    invest: <InvestForm setPage={setPage} projects={projects} addToast={addToast}/>,
    dashboard: <Dashboard projects={projects} investments={investments} addToast={addToast}/>,
  };

  return (
    <>
      <style>{GS}</style>
      <Nav page={page} setPage={setPage}/>
      <div style={{ minHeight:"100vh", background:C.dark }}>
        {pages[page] || <Home setPage={setPage} projects={projects}/>}
      </div>
      <footer style={{ background:C.mid, borderTop:"1px solid rgba(255,255,255,0.04)", padding:"28px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div style={{ fontFamily:"Syne", fontWeight:800, color:C.gold, fontSize:16 }}>YouthVest</div>
        <div style={{ fontSize:12, color:C.muted }}>Registered in South Africa · CIPC Verified · POPIA Compliant · 2026</div>
        <div style={{ display:"flex", gap:20 }}>
          {["Privacy","Terms","POPIA","Contact"].map(l=><span key={l} style={{ fontSize:12, color:C.muted, cursor:"pointer" }}>{l}</span>)}
        </div>
      </footer>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}