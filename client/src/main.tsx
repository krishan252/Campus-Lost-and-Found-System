import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter,Navigate,Route,Routes} from 'react-router-dom';
import {AuthProvider,useAuth} from './context/AuthContext';
import {Layout} from './components/Layout';
import {HomePage} from './pages/HomePage';
import {LoginPage,RegisterPage,VerifyPage} from './pages/AuthPages';
import {ReportsPage} from './pages/ReportsPage';
import {ReportFormPage} from './pages/ReportFormPage';
import {ReportDetailsPage} from './pages/ReportDetailsPage';
import {AdminPage} from './pages/AdminPage';
import {ProfilePage} from './pages/ProfilePage';
import './styles.css';
function Protected({children,admin=false}:{children:React.ReactNode;admin?:boolean}){const {user,loading}=useAuth();if(loading)return <div className="shell content-page">Loading your account...</div>;if(!user)return <Navigate to="/login" replace/>;if(admin&&user.role!=='ADMIN')return <Navigate to="/reports" replace/>;return <>{children}</>}
function App(){return <AuthProvider><BrowserRouter><Layout><Routes><Route path="/" element={<HomePage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/register" element={<RegisterPage/>}/><Route path="/verify" element={<VerifyPage/>}/><Route path="/reports" element={<Protected><ReportsPage/></Protected>}/><Route path="/reports/new" element={<Protected><ReportFormPage/></Protected>}/><Route path="/reports/:id" element={<Protected><ReportDetailsPage/></Protected>}/><Route path="/reports/:id/edit" element={<Protected><ReportFormPage/></Protected>}/><Route path="/profile" element={<Protected><ProfilePage/></Protected>}/><Route path="/admin" element={<Protected admin><AdminPage/></Protected>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Layout></BrowserRouter></AuthProvider>}
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
