import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../context/ReportContext';
import NavBrand from './NavBrand';
import NavOperationalFilters from './NavOperationalFilters';
import NavUserProfile from './NavUserProfile';

export default function Navbar({ onOpenNewReport, activeTab, setActiveTab }) {
  const {
    user,
    isAdmin,
    logout,
    activeMine,
    setActiveMine,
    activeShift,
    setActiveShift,
    selectedDate,
    setSelectedDate,
    getTodayISO,
    updateUserAvatar
  } = useAuth();
  const { dbStatus, refreshData } = useReports();

  const canSelectPribbenow = isAdmin || user?.mine === 'Pribbenow';
  const canSelectElDescanso = isAdmin || user?.mine === 'El Descanso';

  return (
    <header className="glass-panel navbar-floating" style={{
      margin: '12px 16px 0 16px',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: '0',
      zIndex: 1000,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)'
    }}>
      {/* Fila Principal Superior (Logo, Filtros Desktop, Perfil) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
        <NavBrand
          isAdmin={isAdmin}
          dbStatus={dbStatus}
          refreshData={refreshData}
        />

        <NavOperationalFilters
          variant="desktop"
          activeMine={activeMine}
          setActiveMine={setActiveMine}
          canSelectPribbenow={canSelectPribbenow}
          canSelectElDescanso={canSelectElDescanso}
          activeShift={activeShift}
          setActiveShift={setActiveShift}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          getTodayISO={getTodayISO}
          userMine={user?.mine}
        />

        <NavUserProfile
          user={user}
          logout={logout}
          updateUserAvatar={updateUserAvatar}
        />
      </div>

      {/* Tira de Filtros Móvil (Mina, Turno, Fecha) - Solo visible en teléfonos móviles */}
      <NavOperationalFilters
        variant="mobile"
        activeTab={activeTab}
        activeMine={activeMine}
        setActiveMine={setActiveMine}
        canSelectPribbenow={canSelectPribbenow}
        canSelectElDescanso={canSelectElDescanso}
        activeShift={activeShift}
        setActiveShift={setActiveShift}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        getTodayISO={getTodayISO}
        userMine={user?.mine}
      />
    </header>
  );
}
