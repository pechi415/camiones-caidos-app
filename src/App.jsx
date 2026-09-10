import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider, useReports } from './context/ReportContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import MobileNav from './components/Layout/MobileNav';
import KPIOverview from './components/Dashboard/KPIOverview';
import TruckTable from './components/Dashboard/TruckTable';
import TruckReportModal from './components/Forms/TruckReportModal';
import Login from './components/Auth/Login';
import ChangePasswordModal from './components/Auth/ChangePasswordModal';

// Carga diferida bajo demanda de vistas y modales secundarios
const GlobalHistory = React.lazy(() => import('./components/Reports/GlobalHistory'));
const OperatorManager = React.lazy(() => import('./components/Management/OperatorManager'));
const UserManager = React.lazy(() => import('./components/Management/UserManager'));
const ExportModal = React.lazy(() => import('./components/Reports/ExportModal'));
const TruckHistoryModal = React.lazy(() => import('./components/Reports/TruckHistoryModal'));

const ViewLoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '280px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-sans, sans-serif)'
  }}>
    <div style={{
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: '2px solid rgba(255, 255, 255, 0.15)',
      borderTopColor: 'var(--brand-red, #E52E2E)',
      animation: 'spin 0.8s linear infinite',
      marginRight: '12px'
    }} />
    <span>Cargando módulo...</span>
  </div>
);

function MainContent() {
  const { user, isAdmin, activeMine, activeShift, loadingSession } = useAuth();
  const { reports, updateReportStatus, deleteReport } = useReports();

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | history | operators | users
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [historyTruckId, setHistoryTruckId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const handleOpenHistory = (truckId) => {
    setHistoryTruckId(truckId);
    setIsHistoryModalOpen(true);
  };

  useEffect(() => {
    if (user && !isAdmin && activeTab !== 'dashboard' && activeTab !== 'history') {
      setActiveTab('dashboard');
    }
  }, [user, isAdmin, activeTab]);

  if (loadingSession) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(229, 46, 46, 0.15) 0%, rgba(10, 10, 15, 0.95) 70%)',
        color: '#FFFFFF',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '3px solid rgba(229, 46, 46, 0.2)',
          borderTopColor: 'var(--brand-red)',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.7)', letterSpacing: '0.5px' }}>
          Iniciando sesión segura...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleOpenNewReport = () => {
    setEditingReport(null);
    setIsReportModalOpen(true);
  };

  const handleOpenEditReport = (report) => {
    setEditingReport(report);
    setIsReportModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Navbar
        onOpenNewReport={handleOpenNewReport}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Layout */}
      <div className="main-content-layout" style={{
        display: 'flex',
        flex: 1,
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        minWidth: 0,
        overflowX: 'hidden'
      }}>
        {/* Sidebar escritorio */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenNewReport={handleOpenNewReport}
          onOpenExport={() => setIsExportModalOpen(true)}
        />

        {/* Dynamic Main View Area */}
        <main style={{ flex: 1, padding: '16px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
          {activeTab === 'dashboard' && (
            <>
              <KPIOverview
                reports={reports}
                activeMine={activeMine}
                activeShift={activeShift}
              />
              <TruckTable
                reports={reports}
                onUpdateStatus={updateReportStatus}
                onEditReport={handleOpenEditReport}
                onDeleteReport={deleteReport}
                onViewHistory={handleOpenHistory}
                activeMine={activeMine}
                activeShift={activeShift}
              />
            </>
          )}

          {activeTab === 'history' && (
            <React.Suspense fallback={<ViewLoadingFallback />}>
              <GlobalHistory
                onEditReport={handleOpenEditReport}
                onDeleteReport={deleteReport}
                onViewHistory={handleOpenHistory}
              />
            </React.Suspense>
          )}

          {activeTab === 'operators' && isAdmin && (
            <React.Suspense fallback={<ViewLoadingFallback />}>
              <OperatorManager />
            </React.Suspense>
          )}

          {activeTab === 'users' && isAdmin && (
            <React.Suspense fallback={<ViewLoadingFallback />}>
              <UserManager />
            </React.Suspense>
          )}
        </main>
      </div>

      {/* Mobile Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewReport={handleOpenNewReport}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Modales */}
      <TruckReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setEditingReport(null);
        }}
        editingReport={editingReport}
        onSuccess={() => setActiveTab('dashboard')}
      />

      {/* Modales cargados bajo demanda */}
      <React.Suspense fallback={null}>
        {isExportModalOpen && (
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
          />
        )}

        {isHistoryModalOpen && (
          <TruckHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            initialTruckId={historyTruckId}
            reports={reports}
          />
        )}
      </React.Suspense>

      {/* Modal Obligatorio de Cambio de Contraseña por Primer Ingreso */}
      <ChangePasswordModal isOpen={user.mustChangePassword === true} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ReportProvider>
        <MainContent />
      </ReportProvider>
    </AuthProvider>
  );
}

