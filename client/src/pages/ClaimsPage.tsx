import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ClipboardCheck,ShieldCheck} from 'lucide-react';
import {request,type Claim} from '../api';
import {Badge,Banner,PageHeading} from '../components/Layout';

export function ClaimsPage(){
 const [claims,setClaims]=useState<Claim[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  request<{claims:Claim[]}>('/claims/mine')
   .then(data=>setClaims(data.claims))
   .catch(reason=>setError((reason as Error).message))
   .finally(()=>setLoading(false));
 },[]);
 return <section className="shell content-page">
  <PageHeading eyebrow="CLAIM TRACKER" title="Your claims" subtitle="Follow the status of ownership claims you submitted for found items."/>
  {error&&<Banner tone="error">{error}</Banner>}
  {loading?<p role="status">Loading your claims...</p>:claims.length===0?<div className="empty-state"><ClipboardCheck size={42}/><h2>No claims submitted</h2><p>Browse approved found-item reports and submit private details to support an ownership claim.</p><Link to="/" className="button">Browse found items <ArrowRight size={18}/></Link></div>:<div className="report-grid">{claims.map(claim=><article className="report-card" key={claim.id}>
   <div className="report-top"><span className="type-pill type-found">CLAIM</span><Badge status={claim.status}/></div>
   <div className="report-mini-icon"><ShieldCheck size={24}/></div>
   <h3>{claim.report?.title||'Found item'}</h3>
   <p>{claim.identifyingDetails}</p>
   <div className="report-facts"><span>Submitted {new Date(claim.createdAt).toLocaleDateString()}</span></div>
   {claim.reviewReason&&<Banner tone={claim.status==='REJECTED'?'error':'success'}>{claim.reviewReason}</Banner>}
   {claim.report&&<div className="report-bottom"><Link to={`/reports/${claim.report.id}`}>View item <ArrowRight size={17}/></Link></div>}
  </article>)}</div>}
 </section>;
}
