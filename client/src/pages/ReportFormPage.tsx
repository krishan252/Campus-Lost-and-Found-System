import {useEffect,useState,type ChangeEvent,type FormEvent} from 'react';
import {useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Camera,Info,LockKeyhole,MapPin} from 'lucide-react';
import {request,type Picklist,type Report,type ReportInput} from '../api';
import {Banner,PageHeading} from '../components/Layout';
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60_000).toISOString().slice(0,10);};
const blank:ReportInput={reportType:'LOST',title:'',publicDescription:'',categoryId:0,locationId:0,eventDate:today(),secretAttributes:'',storageLocation:'',finderContact:''};
export function ReportFormPage(){const navigate=useNavigate();const {id}=useParams();const [search]=useSearchParams();const editing=Boolean(id);
 const initialType=search.get('type')==='FOUND'?'FOUND':'LOST';
 const [form,setForm]=useState<ReportInput>({...blank,reportType:initialType});const [categories,setCategories]=useState<Picklist[]>([]);const [locations,setLocations]=useState<Picklist[]>([]);
 const [files,setFiles]=useState<File[]>([]);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{Promise.all([request<{categories:Picklist[];locations:Picklist[]}>('/reports/metadata'), id?request<{report:Report}>(`/reports/${id}`):Promise.resolve(null)])
 .then(([meta,old])=>{setCategories(meta.categories);setLocations(meta.locations);if(old){const r=old.report;setForm({reportType:r.reportType,title:r.title,publicDescription:r.publicDescription,categoryId:r.categoryId,locationId:r.locationId,eventDate:r.eventDate.slice(0,10),secretAttributes:r.privateDetails?.secretAttributes||'',storageLocation:r.privateDetails?.storageLocation||'',finderContact:r.privateDetails?.finderContact||''});if(r.status!=='REJECTED')setError('Only rejected reports can be edited.');}})
 .catch(e=>setError((e as Error).message)).finally(()=>setLoading(false));},[id]);
 function set<K extends keyof ReportInput>(key:K,value:ReportInput[K]){setForm(old=>({...old,[key]:value}));}
 function onFiles(e:ChangeEvent<HTMLInputElement>){const list=Array.from(e.target.files||[]);if(list.length>3){setError('Upload a maximum of 3 photos.');return;}setFiles(list);setError('');}
 async function submit(e:FormEvent){e.preventDefault();setError('');setBusy(true);
 try {
  if(!form.categoryId||!form.locationId)throw new Error('Choose a category and location.');
  if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024))throw new Error('Each image must be JPG, PNG or WebP and no larger than 5 MB.');
  let reportId=id;
  if(editing){await request(`/reports/${id}`,{method:'PATCH',body:JSON.stringify(form)});}
  else {const d=await request<{report:{id:string}}>('/reports',{method:'POST',body:JSON.stringify(form)});reportId=d.report.id;}
  for(const f of files){const body=new FormData();body.append('image',f);await request(`/reports/${reportId}/images`,{method:'POST',body});}
  if(editing)await request(`/reports/${reportId}/resubmit`,{method:'POST'});
  navigate(`/reports/${reportId}`,{replace:true});
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="shell content-page"><button className="back-link" onClick={()=>navigate(-1)}><ArrowLeft size={16}/> Back</button><PageHeading eyebrow={editing?'UPDATE REPORT':'NEW REPORT'} title={editing?'Edit & resubmit your report':"Let's get it back where it belongs"} subtitle="The more accurate your details, the easier it is for the campus community to help."/>
 {error&&<Banner tone="error">{error}</Banner>}{loading?<p>Loading form...</p>:<form className="report-form-layout" onSubmit={submit}><div className="form-main panel"><h2>Item information</h2><p className="muted">Tell us about the item. Your report will be reviewed before it appears publicly.</p><div className="form-stack">
 <fieldset className="type-toggle"><legend>What are you reporting?</legend><div className="toggle-row"><button type="button" className={form.reportType==='LOST'?'selected':''} onClick={()=>set('reportType','LOST')}>✳ &nbsp; I lost something</button><button type="button" className={form.reportType==='FOUND'?'selected':''} onClick={()=>set('reportType','FOUND')}>✦ &nbsp; I found something</button></div></fieldset>
 <label>Item title <span>*</span><input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Black wireless headphones" minLength={4} maxLength={120} required/></label>
 <div className="form-two"><label>Category <span>*</span><select required value={form.categoryId} onChange={e=>set('categoryId',Number(e.target.value))}><option value={0}>Choose category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Location <span>*</span><select required value={form.locationId} onChange={e=>set('locationId',Number(e.target.value))}><option value={0}>Choose location</option>{locations.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
 <label>Date {form.reportType==='LOST'?'lost':'found'} <span>*</span><input type="date" required value={form.eventDate} max={today()} onChange={e=>set('eventDate',e.target.value)}/></label>
 <label>Public description <span>*</span><textarea rows={5} required minLength={12} maxLength={2000} value={form.publicDescription} onChange={e=>set('publicDescription',e.target.value)} placeholder="Color, general appearance, where and when you last saw it..."></textarea><small>Avoid mentioning identifying details that someone could use to make a false claim.</small></label>
 <div className="private-divider"><LockKeyhole size={20}/><div><strong>Private information</strong><p>Only you and authorized administrators can access these details.</p></div></div>
 <label>Secret identifying feature {form.reportType==='FOUND'&&<span>*</span>}<textarea rows={3} value={form.secretAttributes} onChange={e=>set('secretAttributes',e.target.value)} required={form.reportType==='FOUND'} maxLength={1000} placeholder="e.g. hidden scratch, distinctive sticker, serial suffix (never include full confidential numbers)"></textarea></label>
 {form.reportType==='FOUND'&&<><label>Storage / collection location<input value={form.storageLocation} onChange={e=>set('storageLocation',e.target.value)} maxLength={500} placeholder="e.g. handed to lab office"/></label><label>Finder contact (private)<input value={form.finderContact} onChange={e=>set('finderContact',e.target.value)} maxLength={300} placeholder="Optional relevant contact information"/></label></>}
 <label className="upload-label"><Camera size={23}/><strong>Add item photos</strong><span>Optional • JPEG, PNG or WebP • 5 MB each • Max 3</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onFiles}/>{files.length>0&&<small>{files.map(f=>f.name).join(', ')}</small>}</label>
 </div></div><aside className="form-aside"><div className="side-card"><MapPin size={24}/><h3>Community first</h3><p>Accurate reports help other students and staff find and return items more easily.</p></div><div className="side-card side-card-light"><Info size={23}/><h3>What happens next?</h3><p>An administrator reviews your submission. You'll see the result in My Reports.</p></div><button disabled={busy||Boolean(error&&error.includes('Only rejected'))} className="button button-block" type="submit">{busy?'Saving...':editing?'Save and resubmit':'Submit for review'} <ArrowRight size={18}/></button></aside></form>}</section>
}
