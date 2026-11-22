import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Search,ShieldCheck,PackageCheck,ClipboardList,Building2,Clock3,MapPin,RotateCcw,LockKeyhole,CheckCircle2} from 'lucide-react';
import {request,type Picklist,type Report} from '../api';
import {Banner} from '../components/Layout';
import {useAuth} from '../context/AuthContext';

const steps=[
 {n:'1',title:'Report or deposit',body:'Submit a lost or found report with public and private item details.'},
 {n:'2',title:'Officer moderation',body:'Authorized campus staff review reports before they are published.'},
 {n:'3',title:'Submit a claim',body:'Planned next: the owner provides identifying details to support a secure claim.'},
 {n:'4',title:'Claim verification',body:'Planned next: authorized staff review claims and record the verified handover.'}
];
const categoryArt=(category:string)=>category.toLowerCase().includes('electronic')?'laptop':category.toLowerCase().includes('wallet')?'wallet':category.toLowerCase().includes('key')?'calculator':'bottle';
const categoryEmoji=(category:string)=>category.toLowerCase().includes('electronic')?'💻':category.toLowerCase().includes('wallet')?'👛':category.toLowerCase().includes('key')?'🔑':category.toLowerCase().includes('book')?'📚':'🎒';

export function HomePage(){
 const {user}=useAuth();
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState('');
 const [kind,setKind]=useState('');
 const [location,setLocation]=useState('');
 const [categories,setCategories]=useState<Picklist[]>([]);
 const [locations,setLocations]=useState<Picklist[]>([]);
 const [reports,setReports]=useState<Report[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  request<{categories:Picklist[];locations:Picklist[]}>('/public/metadata')
   .then(data=>{if(active){setCategories(data.categories);setLocations(data.locations);}})
   .catch(reason=>{if(active)setError((reason as Error).message);});
  return()=>{active=false;};
 },[]);

 useEffect(()=>{
  let active=true;
  const timer=window.setTimeout(()=>{
   setLoading(true);
   setError('');
   const params=new URLSearchParams();
   if(query.trim())params.set('q',query.trim());
   if(kind)params.set('reportType',kind);
   if(category)params.set('categoryId',category);
   if(location)params.set('locationId',location);
   request<{reports:Report[]}>(`/public/reports?${params.toString()}`)
    .then(data=>{if(active)setReports(data.reports);})
    .catch(reason=>{if(active){setError((reason as Error).message);setReports([]);}})
    .finally(()=>{if(active)setLoading(false);});
  },200);
  return()=>{active=false;window.clearTimeout(timer);};
 },[query,kind,category,location]);

 const reset=()=>{setQuery('');setCategory('');setKind('');setLocation('');};
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
   <div className="uni-directory-tag"><MapPin size={15}/> Browse approved reports and filter by campus location</div>
  </section>
  <div className="uni-stats">
   <div className="uni-stat"><span className="uni-stat-icon"><PackageCheck/></span><div><strong>Report</strong><small>LOST OR FOUND ITEMS</small></div></div>
   <div className="uni-stat"><span className="uni-stat-icon"><ShieldCheck/></span><div><strong>Review</strong><small>OFFICER MODERATION</small></div></div>
   <div className="uni-stat"><span className="uni-stat-icon"><Building2/></span><div><strong>Verify</strong><small>PLANNED CLAIM WORKFLOW</small></div></div>
   <div className="uni-stat"><span className="uni-stat-icon"><Clock3/></span><div><strong>Track</strong><small>REPORT STATUS TRACKING</small></div></div>
  </div>
  <section className="uni-search-card" aria-label="Search approved item reports">
   <div className="uni-search-top"><div className="uni-search-input"><Search size={19}/><input aria-label="Search items" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by keyword (e.g. laptop, headphones, wallet...)"/></div><button className="uni-reset" onClick={reset}><RotateCcw size={15}/> Reset Filters</button></div>
   <div className="uni-filter-label">FILTER BY ITEM CATEGORY</div>
   <div className="uni-chips"><button className={`uni-chip ${category===''?'selected':''}`} onClick={()=>setCategory('')}>All Categories</button>{categories.map(item=><button key={item.id} className={`uni-chip ${category===String(item.id)?'selected':''}`} onClick={()=>setCategory(String(item.id))}>{item.name}</button>)}</div>
   <div className="uni-filter-bottom"><div className="uni-tabs">{[['','All Items'],['FOUND','Found Property'],['LOST','Lost Reports']].map(([value,label])=><button key={value} className={kind===value?'active':''} onClick={()=>setKind(value)}>{label}</button>)}</div><label className="uni-location">Campus Location: <select value={location} onChange={e=>setLocation(e.target.value)}><option value="">All Campus Locations</option>{locations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
  </section>
  <section className="uni-listings">
   <div className="uni-section-head"><div><h2>Approved Campus Reports <span className="uni-status-pill">LIVE</span></h2><p>Only approved reports are listed. Private identifying details remain protected.</p></div><span className="uni-note"><span className="tiny-dot"/> {reports.length} matching reports (up to 48)</span></div>
   {error&&<div className="shell"><Banner tone="error">{error}</Banner></div>}
   {loading?<div className="uni-no-results" role="status">Loading approved reports...</div>:reports.length===0?<div className="uni-no-results"><Search size={30}/><h3>No matching reports found</h3><p>Try changing a filter, or submit a report if you lost or found an item.</p><button onClick={reset} className="uni-btn uni-btn-primary">Reset filters</button></div>:<div className="uni-items-grid">{reports.map(report=><article className="uni-item" key={report.id}>
     <div className={`uni-item-image art-${categoryArt(report.category.name)}`}><span className="uni-item-type">{report.reportType==='FOUND'?'FOUND ITEM':'LOST REPORT'}</span><span className="uni-item-approved"><CheckCircle2 size={12}/> APPROVED</span>{report.images.length > 0 ? <img alt={`Photo of ${report.title}`} src={`/api/v1/public/reports/${report.id}/images/${report.images[0].id}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span className="uni-item-emoji" role="img" aria-label={report.category.name}>{categoryEmoji(report.category.name)}</span>}</div>
     <div className="uni-item-content"><div className="uni-item-ref">{report.category.name} <span>•</span> {new Date(report.eventDate).toLocaleDateString()}</div><h3>{report.title}</h3><p>{report.publicDescription}</p><span className="uni-item-place"><MapPin size={12}/>{report.location.name}</span><div className="uni-item-bottom"><span><LockKeyhole size={13}/> Private details protected</span><Link className="uni-preview-tag" to={`/items/${report.id}`}>View item</Link></div></div>
    </article>)}</div>}
  </section>
  <section className="uni-process"><span className="uni-process-label">Chain of Custody Protocol</span><h2>How Ownership Verification Works</h2><p className="uni-process-intro">A secure process designed to help protect university property and return it to the right people.</p><div className="uni-process-grid">{steps.map(s=><div className="uni-process-card" key={s.n}><span className="uni-step-number">{s.n}</span><h3>{s.title}</h3><p>{s.body}</p></div>)}</div></section>
 </div>
 </div>
}
