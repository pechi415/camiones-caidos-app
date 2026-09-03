import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, History, Plus, UserCheck, Users, FileSpreadsheet } from 'lucide-react';

export default function MobileNav({ activeTab, setActiveTab, onOpenNewReport, onOpenExport }) {
  const { isAdmin } = useAuth();

  // Definición unificada de elementos de navegación con "Registrar" en el centro
  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, action: () => setActiveTab('dashboard') },
    { id: 'history', label: 'Historial', icon: History, action: () => setActiveTab('history') },
    { id: 'register', label: 'Registrar', icon: Plus, isAction: true, action: onOpenNewReport },
    ...(isAdmin ? [
      { id: 'operators', label: 'Operad.', icon: UserCheck, action: () => setActiveTab('operators') },
      { id: 'users', label: 'Usuarios', icon: Users, action: () => setActiveTab('users') }
    ] : []),
    { id: 'export', label: 'PDF', icon: FileSpreadsheet, action: onOpenExport }
  ];

  // Índice activo para las pestañas de navegación (excluyendo acciones que no cambian de tab)
  const activeIndex = Math.max(0, navItems.findIndex(item => item.id === activeTab));
  const totalItems = navItems.length;
  const itemWidthPercent = 100 / totalItems;

  // Estado para la física elástica de la gota de agua (Squash & Stretch)
  const [prevIndex, setPrevIndex] = useState(activeIndex);
  const [isStretching, setIsStretching] = useState(false);
  const [stretchDirection, setStretchDirection] = useState(0); // -1: izquierda, 1: derecha
  const [lastAnimatedTab, setLastAnimatedTab] = useState(activeTab);

  // Detección de cambio de pestaña para calcular dirección y deformación elástica
  useEffect(() => {
    if (activeTab === 'register') return;

    const newIdx = navItems.findIndex(item => item.id === activeTab);
    if (newIdx !== -1 && newIdx !== prevIndex) {
      const dir = newIdx > prevIndex ? 1 : -1;
      const distance = Math.abs(newIdx - prevIndex);
      
      setStretchDirection(dir);
      setIsStretching(true);
      setLastAnimatedTab(activeTab);

      const timer = setTimeout(() => {
        setIsStretching(false);
        setPrevIndex(newIdx);
      }, 340);

      return () => clearTimeout(timer);
    } else {
      setPrevIndex(newIdx !== -1 ? newIdx : 0);
    }
  }, [activeTab]);

  return (
    <nav
      className="mobile-only mobile-nav-pill"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        maxWidth: '420px',
        margin: '0 auto',
        height: '62px',
        borderRadius: '35px',
        padding: '5px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 9999,
        background: 'rgba(12, 16, 25, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(28px) saturate(190%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), 0 2px 10px rgba(0, 0, 0, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.38), inset 0 -1px 1px rgba(0, 0, 0, 0.3)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation'
      }}
    >
      {/* 💧 Gota de Agua Líquida con Física de Deformación (WhatsApp iOS Liquid Indicator) */}
      <div
        style={{
          position: 'absolute',
          top: '5px',
          bottom: '5px',
          left: `${activeIndex * itemWidthPercent}%`,
          width: `${itemWidthPercent}%`,
          transition: 'left 0.34s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: '0 3px',
          zIndex: 1,
          transformOrigin: stretchDirection > 0 ? 'left center' : stretchDirection < 0 ? 'right center' : 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '24px',
            background: 'radial-gradient(ellipse at 50% 18%, rgba(255, 255, 255, 0.35) 0%, rgba(229, 46, 46, 0.45) 50%, rgba(185, 28, 28, 0.62) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.42)',
            boxShadow: '0 4px 18px rgba(229, 46, 46, 0.5), inset 0 1.5px 2px rgba(255, 255, 255, 0.65), inset 0 -1px 2px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transform: isStretching
              ? `scaleX(1.24) scaleY(0.92) skewX(${stretchDirection * -3.5}deg)`
              : 'scale(1) scaleY(1)',
            transition: 'transform 0.30s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        />
      </div>

      {/* Botones de Navegación Integrados */}
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx && !item.isAction;
        const isAction = item.isAction === true;

        if (isAction) {
          // Botón Central "Registrar" Integrado con relieve de cristal líquido
          return (
            <button
              key={item.id}
              onClick={item.action}
              className="mobile-nav-register-btn"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.55)',
                borderRadius: '22px',
                padding: '4px 8px',
                height: '46px',
                cursor: 'pointer',
                flex: 1.15,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1px',
                zIndex: 3,
                outline: 'none',
                position: 'relative',
                margin: '0 2px',
                boxShadow: '0 4px 16px rgba(229, 46, 46, 0.55), inset 0 1px 1.5px rgba(255, 255, 255, 0.65)'
              }}
              title="Registrar Camión Caído"
            >
              <Icon size={18} color="#FFFFFF" strokeWidth={2.6} />
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '-0.1px',
                  lineHeight: 1
                }}
              >
                {item.label}
              </span>
            </button>
          );
        }

        // Pestañas Estándar con Micro-animación de Resorte (Icon Pop)
        return (
          <button
            key={item.id}
            onClick={item.action}
            className="mobile-nav-item-btn"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px 2px',
              cursor: 'pointer',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              zIndex: 2,
              outline: 'none',
              position: 'relative',
              height: '100%'
            }}
          >
            <div className={isActive ? 'icon-spring-active' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon
                size={19}
                color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.62)'}
                strokeWidth={isActive ? 2.3 : 1.9}
              />
            </div>

            <span
              style={{
                fontSize: item.id === 'operators' ? '0.58rem' : '0.62rem',
                fontWeight: isActive ? 750 : 500,
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                letterSpacing: item.id === 'operators' ? '-0.2px' : '0px',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'color 0.2s ease, font-weight 0.2s ease'
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
