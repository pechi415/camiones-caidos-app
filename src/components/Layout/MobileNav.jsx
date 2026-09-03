import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, History, PlusCircle, UserCheck, Users, FileSpreadsheet } from 'lucide-react';

export default function MobileNav({ activeTab, setActiveTab, onOpenNewReport, onOpenExport }) {
  const { isAdmin } = useAuth();
  const navRef = useRef(null);

  // Definición de pestañas en total sintonía visual y geométrica
  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, action: () => setActiveTab('dashboard') },
    { id: 'history', label: 'Historial', icon: History, action: () => setActiveTab('history') },
    { id: 'register', label: 'Registrar', icon: PlusCircle, isAction: true, action: onOpenNewReport },
    ...(isAdmin ? [
      { id: 'operators', label: 'Operad.', icon: UserCheck, action: () => setActiveTab('operators') },
      { id: 'users', label: 'Usuarios', icon: Users, action: () => setActiveTab('users') }
    ] : []),
    { id: 'export', label: 'PDF', icon: FileSpreadsheet, action: onOpenExport }
  ];

  const totalItems = navItems.length;
  const itemWidthPercent = 100 / totalItems;

  // Índice activo basado en el tab actual (si se abrió Registrar u otro modal, se mantiene el tab de fondo)
  const activeIndex = Math.max(0, navItems.findIndex(item => item.id === activeTab));

  // Estados para el arrastre táctil 1:1 (deslizar con el dedo como en WhatsApp iOS)
  const [isDragging, setIsDragging] = useState(false);
  const [dragLeftPercent, setDragLeftPercent] = useState(null);
  const [dragHoverIndex, setDragHoverIndex] = useState(null);
  const [dragDirection, setStretchDirection] = useState(0); // -1: izq, 1: der

  // Referencias para el cálculo de física táctil instantánea
  const lastTouchXRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const touchHasMovedRef = useRef(false);

  // Animación al cambiar de pestaña por clic
  const [prevIndex, setPrevIndex] = useState(activeIndex);
  const [isSnapping, setIsSnapping] = useState(false);

  useEffect(() => {
    if (activeTab === 'register') return;

    const newIdx = navItems.findIndex(item => item.id === activeTab);
    if (newIdx !== -1 && newIdx !== prevIndex) {
      const dir = newIdx > prevIndex ? 1 : -1;
      setStretchDirection(dir);
      setIsSnapping(true);

      const timer = setTimeout(() => {
        setIsSnapping(false);
        setPrevIndex(newIdx);
      }, 340);

      return () => clearTimeout(timer);
    } else {
      setPrevIndex(newIdx !== -1 ? newIdx : 0);
    }
  }, [activeTab]);

  // Posición calculada de la gota: si se está arrastrando sigue al dedo 1:1, si no, se ubica en el tab activo
  const displayedLeftPercent = isDragging && dragLeftPercent !== null
    ? dragLeftPercent
    : activeIndex * itemWidthPercent;

  // Índice resaltado actualmente (mientras se arrastra resalta donde está el dedo)
  const currentHighlightIndex = isDragging && dragHoverIndex !== null ? dragHoverIndex : activeIndex;

  // --- GESTOS TÁCTILES: Arrastre 1:1 fluido estilo WhatsApp iPhone ---
  const handleTouchStart = (e) => {
    if (!navRef.current) return;
    const touch = e.touches[0];
    lastTouchXRef.current = touch.clientX;
    touchStartTimeRef.current = Date.now();
    touchHasMovedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!navRef.current) return;
    const touch = e.touches[0];
    const rect = navRef.current.getBoundingClientRect();
    const clientX = touch.clientX;

    const deltaX = clientX - lastTouchXRef.current;
    if (Math.abs(deltaX) > 3) {
      touchHasMovedRef.current = true;
    }

    const dir = deltaX > 0.5 ? 1 : deltaX < -0.5 ? -1 : dragDirection;
    setStretchDirection(dir);
    lastTouchXRef.current = clientX;

    // Calcular posición horizontal relativa dentro de la barra
    const relX = clientX - rect.left;
    const itemWidthPx = rect.width / totalItems;

    // La burbuja centra su posición en el dedo del usuario
    const bubbleLeftPx = relX - (itemWidthPx / 2);
    const maxLeftPx = rect.width - itemWidthPx;
    const clampedLeftPx = Math.max(0, Math.min(maxLeftPx, bubbleLeftPx));
    const leftPercent = (clampedLeftPx / rect.width) * 100;

    // Determinar qué pestaña está bajo el pulgar en tiempo real
    const hoverIdx = Math.max(0, Math.min(totalItems - 1, Math.floor((relX / rect.width) * totalItems)));

    setIsDragging(true);
    setDragLeftPercent(leftPercent);
    setDragHoverIndex(hoverIdx);
  };

  const handleTouchEnd = (e) => {
    if (!isDragging || !touchHasMovedRef.current) {
      setIsDragging(false);
      setDragLeftPercent(null);
      setDragHoverIndex(null);
      return;
    }

    // Al soltar el dedo, activar con rebote magnético la pestaña más cercana
    const targetIdx = dragHoverIndex !== null ? dragHoverIndex : activeIndex;
    const targetItem = navItems[targetIdx];

    setIsDragging(false);
    setDragLeftPercent(null);
    setDragHoverIndex(null);

    if (targetItem) {
      targetItem.action();
    }
  };

  return (
    <nav
      ref={navRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
        background: 'rgba(12, 16, 25, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(28px) saturate(190%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), 0 2px 10px rgba(0, 0, 0, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.38), inset 0 -1px 1px rgba(0, 0, 0, 0.3)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none' // Permite el seguimiento gestual horizontal 1:1 sin interferencia de scroll
      }}
    >
      {/* 💧 Gota de Agua Líquida con Seguimiento Táctil 1:1 y Física Elástica */}
      <div
        style={{
          position: 'absolute',
          top: '5px',
          bottom: '5px',
          left: `${displayedLeftPercent}%`,
          width: `${itemWidthPercent}%`,
          // Si el usuario está arrastrando con el dedo, NO hay transición (sigue al dedo 1:1 instantáneamente)
          // Si soltó el dedo o hizo clic, anima con rebote elástico de agua
          transition: isDragging
            ? 'none'
            : 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: '0 3px',
          zIndex: 1,
          transformOrigin: dragDirection > 0 ? 'left center' : dragDirection < 0 ? 'right center' : 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '24px',
            background: 'radial-gradient(ellipse at 50% 18%, rgba(255, 255, 255, 0.38) 0%, rgba(229, 46, 46, 0.45) 50%, rgba(185, 28, 28, 0.65) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.42)',
            boxShadow: '0 4px 18px rgba(229, 46, 46, 0.52), inset 0 1.5px 2px rgba(255, 255, 255, 0.65), inset 0 -1px 2px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            transform: (isDragging || isSnapping)
              ? `scaleX(1.22) scaleY(0.92) skewX(${dragDirection * -3}deg)`
              : 'scale(1) scaleY(1)',
            transition: isDragging
              ? 'transform 0.1s ease-out'
              : 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        />
      </div>

      {/* Botones de Navegación (Todos en la misma sintonía visual y geométrica) */}
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        const isHighlighted = currentHighlightIndex === idx;

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
              height: '100%',
              userSelect: 'none'
            }}
          >
            <div
              className={isHighlighted ? 'icon-spring-active' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isHighlighted ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <Icon
                size={19}
                color={isHighlighted ? '#FFFFFF' : 'rgba(255, 255, 255, 0.62)'}
                strokeWidth={isHighlighted ? 2.3 : 1.85}
              />
            </div>

            <span
              style={{
                fontSize: item.id === 'operators' ? '0.58rem' : '0.62rem',
                fontWeight: isHighlighted ? 800 : 500,
                color: isHighlighted ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
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
