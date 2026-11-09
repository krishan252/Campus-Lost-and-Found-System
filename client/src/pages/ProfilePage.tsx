import {Link} from 'react-router-dom';
import {ArrowLeft,ShieldCheck,UserRound} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {PageHeading} from '../components/Layout';
export function ProfilePage(){const {user}=useAuth();return <div className="shell content-page"><Link className="back-link" to="/reports"><ArrowLeft size={16}/> Back to reports</Link><PageHeading eyebrow="ACCOUNT" title="Your profile" subtitle="Basic account information."/><div className="panel" style={{maxWidth:600}}><div className="private-heading"><UserRound size={24}/><h3>Account details</h3></div><dl><dt>Full name</dt><dd>{user?.fullName}</dd><dt>Email</dt><dd>{user?.email}</dd><dt>Access level</dt><dd>{user?.role}</dd></dl><div className="privacy-note"><ShieldCheck size={18}/> Your session is protected by an HttpOnly authentication cookie.</div></div></div>}
