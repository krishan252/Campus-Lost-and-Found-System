import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { request } from '../api';
import { Banner, PageHeading } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

type ClaimableItem = { id: string; title: string; reportType: 'LOST' | 'FOUND'; status: 'APPROVED'; category: { name: string }; location: { name: string } };
type ClaimReceipt = { id: string; reportId: string; status: 'PENDING'; createdAt: string };

export function ClaimFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<ClaimableItem | null>(null);
  const [evidence, setEvidence] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ClaimReceipt | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    if (!id) { setError('Item not found.'); setLoading(false); return; }
    request<{ report: ClaimableItem }>(`/public/reports/${encodeURIComponent(id)}`)
      .then(({ report }) => { if (active) setItem(report); })
      .catch(reason => { if (active) setError((reason as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || submitting || receipt) return;
    setError('');
    setSubmitting(true);
    try {
      const { claim } = await request<{ claim: ClaimReceipt }>('/claims', {
        method: 'POST', body: JSON.stringify({ reportId: id, ownershipEvidence: evidence.trim() })
      });
      setReceipt(claim);
      setEvidence('');
    } catch (reason) { setError((reason as Error).message); }
    finally { setSubmitting(false); }
  }

  return <section className="shell content-page">
    <Link className="back-link" to={id ? `/items/${id}` : '/'}><ArrowLeft size={16}/> Back to item details</Link>
    <PageHeading eyebrow="SPRINT 2 · CLFR-63" title="Submit an ownership claim" subtitle="Provide identifying evidence privately. Campus staff will review your claim before any handover." />
    {loading ? <p role="status">Loading item...</p> : error && !item ? <Banner tone="error">{error}</Banner> : !item ? <Banner tone="error">This item is unavailable.</Banner> : receipt ? <div className="panel claim-form-card" role="status">
      <div className="claim-success-icon"><CheckCircle2 size={28}/></div>
      <h2>Claim submitted successfully</h2>
      <p>Your claim for <strong>{item.title}</strong> has been saved with <strong>Pending</strong> status. Submission is not proof of ownership. An authorized officer will review it in a later workflow.</p>
      <p className="muted">Claim reference: <code>{receipt.id}</code></p>
      <Link className="button" to={`/items/${item.id}`}>Back to item</Link>
    </div> : item.reportType !== 'FOUND' ? <Banner tone="info">Ownership claims are currently available only for approved found-item reports.</Banner>
    : user?.role !== 'USER' ? <Banner tone="error">This account cannot submit an ownership claim.</Banner>
    : <div className="claim-form-grid">
      <form className="panel claim-form-card" onSubmit={submit}>
        <div className="claim-form-item"><span className="type-pill type-found">FOUND ITEM</span><h2>{item.title}</h2><p className="muted">{item.category.name} · {item.location.name}</p></div>
        {error && <Banner tone="error">{error}</Banner>}
        <div className="form-stack">
          <label htmlFor="ownership-evidence">How can you prove this item belongs to you? <span>*</span>
            <textarea id="ownership-evidence" rows={6} required minLength={20} maxLength={1000} value={evidence}
              onChange={event => setEvidence(event.target.value)}
              placeholder="Describe a distinctive private feature or something you know about the item that is not shown publicly." />
            <small>{evidence.length}/1000 characters · At least 20 required. Do not enter passwords, full account numbers or other sensitive credentials.</small>
          </label>
        </div>
        <div className="claim-privacy-note"><LockKeyhole size={18}/><span>Your response is saved privately and is not displayed to other users.</span></div>
        <button className="button button-block" type="submit" disabled={submitting || evidence.trim().length < 20 || evidence.trim().length > 1000}>{submitting ? 'Submitting claim…' : 'Submit claim for review'}</button>
      </form>
      <aside className="panel claim-help-panel"><ShieldCheck size={28}/><h3>What happens next?</h3><p>1. Your claim is saved as pending.</p><p>2. An authorized officer will review identifying details in a future sprint workflow.</p><p>3. Contact and collection details stay protected until verification and authorized handover.</p><p className="muted">Do not submit evidence about someone else's property.</p></aside>
    </div>}
  </section>;
}
