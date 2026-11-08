import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ArrowLeft,CalendarDays,LockKeyhole,MapPin,Tag} from 'lucide-react';
import {apiImage,request,type Report} from '../api';
import {Badge,Banner,PageHeading} from '../components/Layout';
export function ReportDetailsPage(){const {id}=useParams();const [report,setReport]=useState<Report|null>(null);const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{if(!id)return;request<{report:Report}>(`/reports/${id}`).then(d=>setReport(d.report)).catch(e=>setError((e as Error).message)).finally(()=>setBusy(false));},[id]);
 return <section className="shell content-page"><Link className="back-link" to="/reports"><ArrowLeft size={16}/> My reports</Link>{error&&<Banner tone="error">{error}</Banner>}{busy?<p>Loading...</p>:!report?<p>Report unavailable.</p>:<>
 <div className="heading-row"><PageHeading eyebrow={report.reportType==='LOST'?'LOST ITEM REPORT':'FOUND ITEM REPORT'} title={report.title} subtitle="Details submitted to campus administrators."/><Badge status={report.status}/></div>
 {report.status==='REJECTED'&&<Banner tone="error"><strong>Action needed:</strong> {report.lastReviewReason||'Your report was rejected.'} <Link to={`/reports/${report.id}/edit`}>Edit & resubmit</Link></Banner>}
 {report.status==='PENDING_REVIEW'&&<Banner>Pending administrator review. Your report is not visible to other users yet.</Banner>}
 {report.status==='APPROVED'&&<Banner tone="success">Approved! The searchable repository is coming in Sprint 2.</Banner>}
 <div className="details-layout"><div className="panel"><div className="details-head"><h2>Report information</h2><Badge status={report.status}/></div><p className="details-description">{report.publicDescription}</p><div className="detail-info"><div><Tag size={18}/><span><small>Category</small>{report.category.name}</span></div><div><MapPin size={18}/><span><small>Campus location</small>{report.location.name}</span></div><div><CalendarDays size={18}/><span><small>Date</small>{new Date(report.eventDate).toLocaleDateString()}</span></div></div>
 {report.images.length>0&&<><h3>Attached photographs</h3><div className="photo-grid">{report.images.map(img=><a key={img.id} href={apiImage(report.id,img.id)} target="_blank" rel="noreferrer"><img alt={`Submitted item image ${img.id}`} src={apiImage(report.id,img.id)}/></a>)}</div></>}
 </div><aside className="panel private-panel"><div className="private-heading"><LockKeyhole size={21}/><h3>Private report details</h3></div><p>These fields are not published to the general university community.</p><dl><dt>Secret identifying features</dt><dd>{report.privateDetails?.secretAttributes||'Not supplied'}</dd><dt>Storage / collection</dt><dd>{report.privateDetails?.storageLocation||'Not supplied'}</dd><dt>Finder contact</dt><dd>{report.privateDetails?.finderContact||'Not supplied'}</dd></dl>{report.status==='REJECTED'&&<Link className="button button-block" to={`/reports/${report.id}/edit`}>Edit report</Link>}</aside></div>
 </>}</section>}
