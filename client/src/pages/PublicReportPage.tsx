import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, LockKeyhole, MapPin, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { request } from '../api';
import { Banner, PageHeading } from '../components/Layout';

type PublicReport = {
  id: string;
  title: string;
  publicDescription: string;
  reportType: 'LOST' | 'FOUND';
  status: 'APPROVED';
  eventDate: string;
  category: { id: number; name: string };
  location: { id: number; name: string };
  images: Array<{ id: string; mimeType: string; sizeBytes: number }>;
};

export function PublicReportPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!id) { setLoading(false); return; }
    request<{ report: PublicReport }>(`/public/reports/${encodeURIComponent(id)}`)
      .then(data => { if (active) setReport(data.report); })
      .catch(reason => { if (active) setError((reason as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return <section className="shell content-page">
    <Link className="back-link" to="/"><ArrowLeft size={16}/> Back to approved reports</Link>
    {loading ? <p role="status">Loading public item details...</p> : error ? <Banner tone="error">{error}</Banner> : !report ? <p>Report unavailable.</p> : <>
      <PageHeading eyebrow={report.reportType === 'FOUND' ? 'APPROVED FOUND ITEM' : 'APPROVED LOST REPORT'} title={report.title} subtitle="Only information approved for public display appears here." />
      <div className="details-layout">
        <div className="panel">
          <h2>Item information</h2>
          <p className="details-description">{report.publicDescription}</p>
          <div className="detail-info">
            <div><Tag size={18}/><span><small>Category</small>{report.category.name}</span></div>
            <div><MapPin size={18}/><span><small>Campus location</small>{report.location.name}</span></div>
            <div><CalendarDays size={18}/><span><small>Date</small>{new Date(report.eventDate).toLocaleDateString()}</span></div>
          </div>
          {report.images.length > 0 && <><h3>Approved photographs</h3><div className="photo-grid">
            {report.images.map(image => <a key={image.id} href={`/api/v1/public/reports/${report.id}/images/${image.id}`} target="_blank" rel="noreferrer">
              <img alt={`Item photograph ${image.id}`} src={`/api/v1/public/reports/${report.id}/images/${image.id}`}/>
            </a>)}
          </div></>}
        </div>
        <aside className="panel private-panel">
          <div className="private-heading"><LockKeyhole size={21}/><h3>Protected ownership verification</h3></div>
          <p>Secret identifying details and personal contact information are never displayed in public reports.</p>
          {report.reportType === 'FOUND' ? <>
            <p>If this is your item, submit private identifying information for authorized staff to review. Submitting a claim does not automatically verify ownership or release contact details.</p>
            {user?.role === 'ADMIN'
              ? <p>Administrator accounts cannot submit ownership claims.</p>
              : <Link className="button button-block" to={user ? `/items/${report.id}/claim` : '/login'}>
                  {user ? 'Claim this found item' : 'Sign in to claim this item'}
                </Link>}
          </> : <p>This is a lost-item report. Ownership claims are available for approved found items.</p>}
        </aside>
      </div>
    </>}
  </section>;
}
