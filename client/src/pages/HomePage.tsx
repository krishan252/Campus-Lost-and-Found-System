import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Search, ShieldCheck, PackageCheck, ClipboardList, Building2, Clock3, MapPin, RotateCcw, LockKeyhole, CheckCircle2} from 'lucide-react';
import {useAuth} from '../context/AuthContext';

type PreviewItem={title:string;kind:'FOUND'|'LOST';category:string;location:string;detail:string;art:string;emoji:string;date:string};
const items:PreviewItem[]=[
 {title:'Apple MacBook Air 13” (Midnight)',kind:'FOUND',category:'Electronics & Laptops',location:'Central Library',detail:'A midnight-finish laptop was reported near the study desks.',art:'laptop',emoji:'💻',date:'17 Oct'},
 {title:'Navy Leather Bifold Wallet',kind:'FOUND',category:'Wallets, IDs & Cards',location:'Student Activity Centre',detail:'A navy wallet with a distinct stitched design.',art:'wallet',emoji:'👛',date:'18 Oct'},
 {title:'Apple AirPods Pro 2 in Case',kind:'FOUND',category:'Audio & AirPods',location:'Engineering Complex',detail:'White earbuds with a protective case.',art:'airpods',emoji:'🎧',date:'16 Oct'},
 {title:'Scientific Graphing Calculator',kind:'FOUND',category:'Calculators & Tech Tools',location:'Science Laboratories',detail:'A calculator in a protective case.',art:'calculator',emoji:'🧮',date:'18 Oct'},
 {title:'Wireless Over-Ear Headphones',kind:'LOST',category:'Audio & AirPods',location:'Central Library',detail:'Silver wireless headphones reported missing.',art:'headphones',emoji:'🎧',date:'17 Oct'},
 {title:'Insulated Green Water Bottle',kind:'FOUND',category:'Other',location:'Sports Ground',detail:'A green insulated bottle found on campus.',art:'bottle',emoji:'🍶',date:'18 Oct'}
];
const categories=['All Categories','Electronics & Laptops','Audio & AirPods','Wallets, IDs & Cards','Calculators & Tech Tools','Other'];
const steps=[
 {n:'1',title:'Report or Deposit',body:'Submit a lost or found report with the details and an optional photo. Your submission starts as pending.'},
 {n:'2',title:'Officer Moderation',body:'Authorized campus staff review each report before it becomes eligible for the public repository.'},
 {n:'3',title:'Ownership Quiz',body:'Planned for Sprint 2: claimants answer private questions that only the rightful owner should know.'},
 {n:'4',title:'Handover Pass & Release',body:'Planned for Sprint 3: verified claims are completed through a documented handover.'}
];
export function HomePage(){
 const {user}=useAuth();
 const [query,setQuery]=useState('');const [category,setCategory]=useState('All Categories');const [kind,setKind]=useState('ALL');const [location,setLocation]=useState('All Campus Locations');
 const filtered=useMemo(()=>items.filter(item=>(!query||`${item.title} ${item.detail} ${item.location}`.toLowerCase().includes(query.toLowerCase()))&&(category==='All Categories'||item.category===category)&&(kind==='ALL'||item.kind===kind)&&(location==='All Campus Locations'||item.location===location)),[query,category,kind,location]);
 const reset=()=>{setQuery('');setCategory('All Categories');setKind('ALL');setLocation('All Campus Locations')};
 return <div className="uni-home">
 <div className="uni-wrap">
  <section className="uni-hero">
   <div className="uni-kicker"><span className="tiny-dot"/> Official University Property Custody &amp; Claim Verification Network</div>
   <h1>Lost Something on Campus?<br/>We Protect, Verify &amp; Reconnect.</h1>
   <p>Report missing property, submit found items, and follow every step with confidence. Authorized campus staff review reports before they are published.</p>
   <div className="uni-hero-actions">
    <Link to={user?'/reports/new':'/register'} className="uni-btn uni-btn-primary"><ClipboardList size={16}/> Report a Lost Item</Link>
    <Link to={user?'/reports/new':'/register'} className="uni-btn uni-btn-peach"><ShieldCheck size={16}/> Deposit Found Property</Link>
   </div>
   <div className="uni-directory-tag"><MapPin size={15}/> Campus Desks Directory <span className="uni-soon">Sprint 3</span></div>
  </section>
  <div className="uni-stats">
   <div className="uni-stat"><span className="uni-stat-icon"><PackageCheck/></span><div><strong>Report</strong><small>LOST OR FOUND ITEMS</small></div></div>
   <div className="uni-stat"><span className="uni-stat-icon"><ShieldCheck/></span><div><strong>Review</strong><small>OFFICER MODERATION</small></div></div>
   <div className="uni-stat"><span className="uni-stat-icon"><Building2/></span><div><strong>Verify</strong><small>SECURE CLAIM WORKFLOW</small></div></div>
   <div className="uni-stat"><span className="uni-stat-icon"><Clock3/></span><div><strong>Return</strong><small>TRACKED HANDOVER</small></div></div>
  </div>
  <section className="uni-search-card" aria-label="Preview search controls">
   <div className="uni-search-top"><div className="uni-search-input"><Search size={19}/><input aria-label="Search preview items" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by keywords (e.g. MacBook, headphones, wallet...)"/></div><button className="uni-reset" onClick={reset}><RotateCcw size={15}/> Reset Filters</button></div>
   <div className="uni-filter-label">FILTER BY ITEM CATEGORY</div>
   <div className="uni-chips">{categories.map(c=><button key={c} className={`uni-chip ${category===c?'selected':''}`} onClick={()=>setCategory(c)}>{c}</button>)}</div>
   <div className="uni-filter-bottom"><div className="uni-tabs">{[['ALL','All Items'],['FOUND','Found Property'],['LOST','Lost Reports']].map(([value,label])=><button key={value} className={kind===value?'active':''} onClick={()=>setKind(value)}>{label}</button>)}</div><label className="uni-location">Campus Location: <select value={location} onChange={e=>setLocation(e.target.value)}>{['All Campus Locations',...new Set(items.map(i=>i.location))].map(l=><option key={l}>{l}</option>)}</select></label></div>
  </section>
  <section className="uni-listings">
   <div className="uni-section-head"><div><h2>Verified Campus Property <span className="uni-status-pill">SPRINT 2 PREVIEW</span></h2><p>Sample cards demonstrate the planned repository layout. These are not live reports.</p></div><span className="uni-note"><span className="tiny-dot"/> Real item search &amp; claims arrive in Sprint 2</span></div>
   <div className="uni-items-grid">{filtered.map((item,i)=><article className="uni-item" key={item.title}>
     <div className={`uni-item-image art-${item.art}`}><span className="uni-item-type">{item.kind==='FOUND'?'FOUND ITEM':'LOST REPORT'}</span><span className="uni-item-approved"><CheckCircle2 size={12}/> DESIGN PREVIEW</span><span className="uni-item-emoji" role="img" aria-label={item.category}>{item.emoji}</span></div>
     <div className="uni-item-content"><div className="uni-item-ref">SAMPLE-{String(i+1).padStart(3,'0')} <span>•</span> {item.date}</div><h3>{item.title}</h3><p>{item.detail}</p><span className="uni-item-place"><MapPin size={12}/>{item.location}</span><div className="uni-item-bottom"><span><LockKeyhole size={13}/> Verification planned</span><span className="uni-preview-tag">Preview only</span></div></div>
    </article>)}</div>
   {filtered.length===0&&<div className="uni-no-results"><Search size={30}/><h3>No sample items found</h3><p>Try another keyword or reset your filters.</p><button onClick={reset} className="uni-btn uni-btn-primary">Reset filters</button></div>}
  </section>
  <section className="uni-process"><span className="uni-process-label">Chain of Custody Protocol</span><h2>How Ownership Verification Works</h2><p className="uni-process-intro">A secure process designed to help protect university property and return it to the right people.</p><div className="uni-process-grid">{steps.map(s=><div className="uni-process-card" key={s.n}><span className="uni-step-number">{s.n}</span><h3>{s.title}</h3><p>{s.body}</p></div>)}</div></section>
 </div>
 </div>
}
