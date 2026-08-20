import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReportProvider, useReports } from './context/ReportContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import MobileNav from './components/Layout/MobileNav';
import KPIOverview from './components/Dashboard/KPIOverview';
import TruckTable from './components/Dashboard/TruckTable';
import OperatorManager from './components/Management/OperatorManager';
import UserManager from './components/Management/UserManager';
import TruckReportModal from './components/Forms/TruckReportModal';
import ExportModal from './components/Reports/ExportModal';
import TruckHistoryModal from './components/Reports/TruckHistoryModal';
import GlobalHistory from './components/Reports/GlobalHistory';
import Login from './components/Auth/Login';
import ChangePasswordModal from './components/Auth/ChangePasswordModal';

function MainContent() {
  const { user, isAdmin, activeMine, activeShift } = useAuth();
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
            <GlobalHistory
              onEditReport={handleOpenEditReport}
              onDeleteReport={deleteReport}
              onViewHistory={handleOpenHistory}
            />
          )}

          {activeTab === 'operators' && isAdmin && (
            <OperatorManager />
          )}

          {activeTab === 'users' && isAdmin && (
            <UserManager />
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

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <TruckHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        initialTruckId={historyTruckId}
        reports={reports}
      />

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

