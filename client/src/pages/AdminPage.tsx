import {useEffect,useState} from 'react';
import {CalendarDays,Check,ChevronRight,ClipboardCheck,MapPin,RefreshCcw,ShieldCheck,X} from 'lucide-react';
import {apiImage,messageRequest,request,type Claim,type Report} from '../api';
import {Badge,Banner,PageHeading} from '../components/Layout';

type ReviewTab='reports'|'claims';

export function AdminPage(){
 const [reports,setReports]=useState<Report[]>([]);
 const [claims,setClaims]=useState<Claim[]>([]);
 const [selectedReport,setSelectedReport]=useState<Report|null>(null);
 const [selectedClaim,setSelectedClaim]=useState<Claim|null>(null);
 const [tab,setTab]=useState<ReviewTab>('reports');
 const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [info,setInfo]=useState('');

 async function load(){
  setError('');
  try{
   const [reportData,claimData]=await Promise.all([
    request<{reports:Report[]}>('/admin/reports/pending'),
    request<{claims:Claim[]}>('/admin/claims')
   ]);
   setReports(reportData.reports);
   setClaims(claimData.claims);
   setSelectedReport(current=>current?reportData.reports.find(item=>item.id===current.id)||null:null);
   setSelectedClaim(current=>current?claimData.claims.find(item=>item.id===current.id)||null:null);
  }catch(e){setError((e as Error).message);}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);

 async function moderateReport(kind:'approve'|'reject'){
  if(!selectedReport)return;
  setBusy(true);setError('');setInfo('');
  try{
   const message=await messageRequest(`/admin/reports/${selectedReport.id}/${kind}`,{
    method:'POST',body:JSON.stringify(kind==='reject'?{reason}:{})
   });
   setInfo(message);setSelectedReport(null);setReason('');await load();
  }catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }

 async function decideClaim(status:'APPROVED'|'REJECTED'){
  if(!selectedClaim)return;
  setBusy(true);setError('');setInfo('');
  try{
   const message=await messageRequest(`/admin/claims/${selectedClaim.id}/decision`,{
    method:'POST',body:JSON.stringify({status,reason})
   });
   setInfo(message);setSelectedClaim(null);setReason('');await load();
  }catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }

 return <section className="shell content-page admin-page">
  <div className="heading-row"><PageHeading eyebrow="ADMINISTRATOR PORTAL" title="Review submissions" subtitle="Moderate item reports and verify ownership claims before closing a case."/><button className="button button-ghost" onClick={()=>void load()}><RefreshCcw size={17}/> Refresh</button></div>
  {error&&<Banner tone="error">{error}</Banner>}{info&&<Banner tone="success">{info}</Banner>}
  <div className="admin-overview"><div><span>AWAITING REVIEW</span><strong>{reports.length+claims.length}</strong><p>{reports.length} reports · {claims.length} claims</p></div><div className="admin-summary-icon"><ShieldCheck size={35}/></div></div>
  <div className="admin-layout">
   <div className="panel admin-list">
    <div className="uni-tabs"><button className={tab==='reports'?'active':''} onClick={()=>{setTab('reports');setSelectedClaim(null);}}>Reports ({reports.length})</button><button className={tab==='claims'?'active':''} onClick={()=>{setTab('claims');setSelectedReport(null);}}>Claims ({claims.length})</button></div>
    <div className="panel-heading"><h2>{tab==='reports'?'Pending submissions':'Pending claims'}</h2><Badge status="PENDING_REVIEW"/></div>
    {loading?<p role="status">Loading review queue...</p>:tab==='reports'?reports.length===0?<div className="small-empty"><ClipboardCheck size={34}/><h3>You're all caught up!</h3><p>No pending reports right now.</p></div>:reports.map(report=><button key={report.id} onClick={()=>{setSelectedReport(report);setSelectedClaim(null);setReason('');setError('');}} className={`admin-list-row ${selectedReport?.id===report.id?'admin-row-selected':''}`}><span className="admin-list-glyph">{report.reportType==='FOUND'?'✦':'✳'}</span><span className="admin-list-text"><strong>{report.title}</strong><small>{report.reportType} · {report.location.name} · {new Date(report.createdAt).toLocaleDateString()}</small></span><ChevronRight size={18}/></button>):claims.length===0?<div className="small-empty"><ShieldCheck size={34}/><h3>No pending claims</h3><p>Ownership claims submitted by users will appear here.</p></div>:claims.map(claim=><button key={claim.id} onClick={()=>{setSelectedClaim(claim);setSelectedReport(null);setReason('');setError('');}} className={`admin-list-row ${selectedClaim?.id===claim.id?'admin-row-selected':''}`}><span className="admin-list-glyph">✓</span><span className="admin-list-text"><strong>{claim.report?.title||'Found item claim'}</strong><small>{claim.claimant?.fullName||'Claimant'} · {new Date(claim.createdAt).toLocaleDateString()}</small></span><ChevronRight size={18}/></button>)}
   </div>
   <aside className="panel admin-detail">
    {tab==='reports'&&!selectedReport?<div className="admin-placeholder"><ClipboardCheck size={42}/><h3>Select a report</h3><p>Choose a pending submission to review its details and decide whether it should be published.</p></div>:tab==='reports'&&selectedReport?<><div className="detail-label">SUBMISSION DETAILS</div><div className="panel-heading"><h2>{selectedReport.title}</h2><span className="type-pill">{selectedReport.reportType}</span></div><div className="review-details"><p>{selectedReport.publicDescription}</p><div className="review-meta"><span><MapPin size={16}/> {selectedReport.location.name}</span><span><CalendarDays size={16}/> {new Date(selectedReport.eventDate).toLocaleDateString()}</span><span>Category: {selectedReport.category.name}</span><span>Submitted by: {selectedReport.reporter?.fullName||'User'}</span></div><div className="review-private"><strong>Private identifying details</strong><p>{selectedReport.privateDetails?.secretAttributes||'None provided'}</p><strong>Storage / contact</strong><p>{selectedReport.privateDetails?.storageLocation||'Not supplied'} / {selectedReport.privateDetails?.finderContact||'Not supplied'}</p></div>{selectedReport.images.length>0&&<div className="photo-grid">{selectedReport.images.map(image=><a key={image.id} href={apiImage(selectedReport.id,image.id)} target="_blank" rel="noreferrer"><img src={apiImage(selectedReport.id,image.id)} alt="Item submitted for review"/></a>)}</div>}</div><label>Reason for rejection<textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Please explain what needs to be corrected..." minLength={5} maxLength={500}/></label><div className="action-row"><button disabled={busy||reason.trim().length<5} onClick={()=>void moderateReport('reject')} className="button button-danger"><X size={17}/> Reject</button><button disabled={busy} onClick={()=>void moderateReport('approve')} className="button"><Check size={17}/> Approve</button></div></>:tab==='claims'&&!selectedClaim?<div className="admin-placeholder"><ShieldCheck size={42}/><h3>Select a claim</h3><p>Review the claimant's private details against the found-item report.</p></div>:selectedClaim?<><div className="detail-label">OWNERSHIP VERIFICATION</div><div className="panel-heading"><h2>{selectedClaim.report?.title||'Found item'}</h2><Badge status={selectedClaim.status}/></div><div className="review-details"><div className="review-meta"><span>Claimant: {selectedClaim.claimant?.fullName||'Unknown'}</span><span>Email: {selectedClaim.claimant?.email||'Unavailable'}</span><span>Submitted: {new Date(selectedClaim.createdAt).toLocaleString()}</span></div><div className="review-private"><strong>Claimant's identifying details</strong><p>{selectedClaim.identifyingDetails}</p><strong>Private report details</strong><p>{selectedClaim.report?.privateDetails?.secretAttributes||'No identifying detail supplied'}</p><p>{selectedClaim.report?.privateDetails?.storageLocation||'No storage location supplied'}</p></div>{selectedClaim.report?.images.map(image=><a key={image.id} href={apiImage(selectedClaim.report!.id,image.id)} target="_blank" rel="noreferrer"><img className="review-image" src={apiImage(selectedClaim.report!.id,image.id)} alt="Found item"/></a>)}</div><label>Reason for rejection<textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain what could not be verified..." minLength={5} maxLength={500}/></label><div className="action-row"><button disabled={busy||reason.trim().length<5} onClick={()=>void decideClaim('REJECTED')} className="button button-danger"><X size={17}/> Reject claim</button><button disabled={busy} onClick={()=>void decideClaim('APPROVED')} className="button"><Check size={17}/> Verify claim</button></div></>:null}
   </aside>
  </div>
 </section>;
}
