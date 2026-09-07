import React from 'react';
import NavMineFilter from './NavMineFilter';
import NavShiftFilter from './NavShiftFilter';
import NavDateFilter from './NavDateFilter';

export default function NavOperationalFilters({
  variant = 'desktop',
  activeTab,
  activeMine,
  setActiveMine,
  canSelectPribbenow,
  canSelectElDescanso,
  activeShift,
  setActiveShift,
  selectedDate,
  setSelectedDate,
  getTodayISO,
  userMine
}) {
  if (variant === 'mobile') {
    if (activeTab !== 'dashboard') return null;

    return (
      <div
        className="mobile-only"
        style={{
          width: '100%',
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        <NavMineFilter
          variant="mobile"
          activeMine={activeMine}
          setActiveMine={setActiveMine}
          canSelectPribbenow={canSelectPribbenow}
          canSelectElDescanso={canSelectElDescanso}
          userMine={userMine}
        />
        <NavShiftFilter
          variant="mobile"
          activeShift={activeShift}
          setActiveShift={setActiveShift}
        />
        <NavDateFilter
          variant="mobile"
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          getTodayISO={getTodayISO}
        />
      </div>
    );
  }

  // Variante Desktop / Tablet por defecto
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        flexWrap: 'nowrap',
        flex: 1
      }}
      className="hidden-mobile nav-center-filters"
    >
      <NavMineFilter
        variant="desktop"
        activeMine={activeMine}
        setActiveMine={setActiveMine}
        canSelectPribbenow={canSelectPribbenow}
        canSelectElDescanso={canSelectElDescanso}
        userMine={userMine}
      />
      <NavShiftFilter
        variant="desktop"
        activeShift={activeShift}
        setActiveShift={setActiveShift}
      />
      <NavDateFilter
        variant="desktop"
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        getTodayISO={getTodayISO}
      />
    </div>
  );
}
