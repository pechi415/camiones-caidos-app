import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider, useReports } from './context/ReportContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
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
const NotificationDetail = React.lazy(() => import('./components/Notifications/NotificationDetail'));

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
  const {
    user,
    isAdmin,
    activeMine,
    setActiveMine,
    activeShift,
    setActiveShift,
    selectedDate: _selectedDate,
    setSelectedDate,
    loadingSession
  } = useAuth();
  const { reports, updateReportStatus, deleteReport } = useReports();
  const { activeNotification, closeNotificationDetail } = useNotifications();

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | history | operators | users
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [historyTruckId, setHistoryTruckId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [targetTruckId, setTargetTruckId] = useState(null);

  const handleNavigateFromNotification = (notif) => {
    if (notif) {
      if (notif.mine) setActiveMine(notif.mine);
      if (notif.shift) setActiveShift(notif.shift);
      if (notif.operational_date) setSelectedDate(notif.operational_date);
      const targetId = notif.metadata?.truck_id || notif.truck_ids?.[0] || null;
      setTargetTruckId(targetId);
      setActiveTab('dashboard');
      closeNotificationDetail();
    }
  };

  const handleOpenHistory = (truckId) => {
    setHistoryTruckId(truckId);
    setIsHistoryModalOpen(true);
  };

  useEffect(() => {
    if (user && !isAdmin && activeTab !== 'dashboard' && activeTab !== 'history') {
      setActiveTab('dashboard');
    }
  }, [user, isAdmin, activeTab]);

  // Sincronización de parámetros URL / Push al abrir o enfocar la aplicación
  useEffect(() => {
    if (!user) return;

    const processNavigationParams = (truckId, mine, shift, date) => {
      if (!truckId) return;

      // 1. Establecer activeMine con prioridad (la mina de la notificación es la fuente de verdad)
      if (mine && setActiveMine) {
        setActiveMine(mine);
      } else if (!mine) {
        // Fallback únicamente si la mina no viene provista en la notificación
        const cleanTruck = String(truckId).trim().toLowerCase();
        const matchingReport = reports.find(
          r => String(r.truckId || r.truck_id).trim().toLowerCase() === cleanTruck
        );
        if (matchingReport?.mine && setActiveMine) {
          setActiveMine(matchingReport.mine);
        }
      }

      // 2. Establecer activeShift
      if (shift && setActiveShift) {
        setActiveShift(shift);
      }

      // 3. Establecer selectedDate
      if (date && setSelectedDate) {
        setSelectedDate(date);
      }

      // 4. Establecer targetTruckId
      setTargetTruckId(truckId);

      // 5. Mostrar Dashboard
      setActiveTab('dashboard');
    };

    // 1. Detección en query params (apertura de URL)
    const urlParams = new URLSearchParams(window.location.search);
    const paramTruckId = urlParams.get('truck_id');
    const paramMine = urlParams.get('mine');
    const paramShift = urlParams.get('shift');
    const paramDate = urlParams.get('date');

    if (paramTruckId) {
      processNavigationParams(paramTruckId, paramMine, paramShift, paramDate);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 2. Detección por postMessage del Service Worker (ventana ya enfocada)
    const handleSwMessage = (event) => {
      if (event.data?.type === 'OPERATIONAL_NOTIFICATION_CLICK' && event.data.truck_id) {
        processNavigationParams(
          event.data.truck_id,
          event.data.mine,
          event.data.shift,
          event.data.date
        );
      }
    };

    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [user, reports, setActiveMine, setActiveShift, setSelectedDate]);

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
                targetTruckId={targetTruckId}
                onClearTargetTruck={() => setTargetTruckId(null)}
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

        {activeNotification && (
          <NotificationDetail
            isOpen={!!activeNotification}
            notification={activeNotification}
            onClose={closeNotificationDetail}
            onNavigateToDashboard={handleNavigateFromNotification}
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
      <NotificationProvider>
        <ReportProvider>
          <MainContent />
        </ReportProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

