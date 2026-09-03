import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, History, PlusCircle, UserCheck, Users, FileSpreadsheet } from 'lucide-react';
import LiquidLensCanvas from './LiquidLensCanvas';

export default function MobileNav({ activeTab, setActiveTab, onOpenNewReport, onOpenExport }) {
  const { isAdmin } = useAuth();
  const navRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 380, height: 60 });
  const [webGLReady, setWebGLReady] = useState(false);

  useEffect(() => {
    if (!navRef.current) return;
    const updateSize = () => {
      const rect = navRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Definición de pestañas en total sintonía visual
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

  const activeIndex = Math.max(0, navItems.findIndex(item => item.id === activeTab));

  // Estados de arrastre táctil y física líquida
  const [isDragging, setIsDragging] = useState(false);
  const [dragCenterXPercent, setDragCenterXPercent] = useState(null);
  const [dragHoverIndex, setDragHoverIndex] = useState(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [prevIndex, setPrevIndex] = useState(activeIndex);

  const lastTouchXRef = useRef(0);
  const touchMovedRef = useRef(false);

  // Cambio de pestaña por clic directo (animación de transición con expansión de agua)
  useEffect(() => {
    if (activeTab === 'register') return;

    const newIdx = navItems.findIndex(item => item.id === activeTab);
    if (newIdx !== -1 && newIdx !== prevIndex) {
      setIsSnapping(true);

      const timer = setTimeout(() => {
        setIsSnapping(false);
        setPrevIndex(newIdx);
      }, 360);

      return () => clearTimeout(timer);
    } else {
      setPrevIndex(newIdx !== -1 ? newIdx : 0);
    }
  }, [activeTab]);

  // --- Dimensiones y Posición de la Gota de Agua Líquida ---
  // Al arrastrar o saltar entre pestañas, la gota se expande moderadamente (1.30x) para rozar/cubrir solo una parte del icono anterior y siguiente
  // En reposo, se ajusta limpiamente dentro de la barra (0.94x) sin sobresalir
  const isExpanded = isDragging || isSnapping;
  const lensWidthPercent = isExpanded ? itemWidthPercent * 1.30 : itemWidthPercent * 0.94;

  // Centro de la gota (durante el arrastre sigue el dedo, en reposo se centra en el item activo)
  const defaultCenterPercent = (activeIndex + 0.5) * itemWidthPercent;
  const currentCenterXPercent = isDragging && dragCenterXPercent !== null
    ? dragCenterXPercent
    : defaultCenterPercent;

  // Límite para que no se salga de los extremos de la barra
  const halfLensPercent = lensWidthPercent / 2;
  const clampedLeftPercent = Math.max(
    -1,
    Math.min(100 - lensWidthPercent + 1, currentCenterXPercent - halfLensPercent)
  );

  // Rango horizontal que cubre la lente actualmente (para distorsionar y magnificar los iconos debajo)
  const lensLeftBoundary = clampedLeftPercent;
  const lensRightBoundary = clampedLeftPercent + lensWidthPercent;

  // --- GESTOS TÁCTILES: Arrastre 1:1 con deformación y absorción de iconos ---
  const handleTouchStart = (e) => {
    if (!navRef.current) return;
    const touch = e.touches[0];
    lastTouchXRef.current = touch.clientX;
    touchMovedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!navRef.current) return;
    const touch = e.touches[0];
    const rect = navRef.current.getBoundingClientRect();
    const clientX = touch.clientX;

    if (Math.abs(clientX - lastTouchXRef.current) > 3) {
      touchMovedRef.current = true;
    }
    lastTouchXRef.current = clientX;

    const relX = clientX - rect.left;
    const centerPercent = (relX / rect.width) * 100;
    const hoverIdx = Math.max(0, Math.min(totalItems - 1, Math.floor((relX / rect.width) * totalItems)));

    setIsDragging(true);
    setDragCenterXPercent(centerPercent);
    setDragHoverIndex(hoverIdx);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !touchMovedRef.current) {
      setIsDragging(false);
      setDragCenterXPercent(null);
      setDragHoverIndex(null);
      return;
    }

    const targetIdx = dragHoverIndex !== null ? dragHoverIndex : activeIndex;
    const targetItem = navItems[targetIdx];

    setIsDragging(false);
    setDragCenterXPercent(null);
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
        bottom: '24px',
        left: '16px',
        right: '16px',
        maxWidth: '420px',
        margin: '0 auto',
        height: '60px',
        borderRadius: '35px',
        padding: '4px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 9999,
        background: 'rgba(12, 16, 25, 0.78)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(28px) saturate(190%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), inset 0 1px 1.5px rgba(255, 255, 255, 0.38), inset 0 -1px 1px rgba(0, 0, 0, 0.3)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        overflow: 'visible',
        // La barra se encoge ligeramente en su interior por la tensión/peso de la gota al arrastrar
        transform: isDragging ? 'scale(0.978)' : 'scale(1)',
        transition: 'transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      {/* 🔮 MOTOR ÓPTICO WEBGL (Refracción física por Shaders GLSL de Apple Liquid Glass) */}
      <LiquidLensCanvas
        navItems={navItems}
        activeTab={activeTab}
        lensCenterXPercent={currentCenterXPercent}
        lensWidthPercent={lensWidthPercent}
        isMoving={isDragging || isSnapping}
        containerWidth={dimensions.width}
        containerHeight={dimensions.height}
        onReady={setWebGLReady}
      />

      {/* Fallback CSS Lente (si WebGL no estuviera soportado) */}
      {!webGLReady && (
        <div
          className={`whatsapp-water-lens ${isDragging ? 'is-dragging' : ''} ${isSnapping ? 'is-snapping' : ''}`}
          style={{
            left: `${clampedLeftPercent}%`,
            width: `${lensWidthPercent}%`,
            transition: isDragging
              ? 'width 0.16s ease-out'
              : 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.30s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div className="whatsapp-water-lens-optical-rim" />
        </div>
      )}

      {/* Botones de Navegación interactivos (Por encima del canvas con zIndex: 10 para capturar toques) */}
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        const itemCenterPercent = (idx + 0.5) * itemWidthPercent;
        
        // Elemento cubierto por la lente de agua
        const isCoveredByLens = itemCenterPercent >= lensLeftBoundary && itemCenterPercent <= lensRightBoundary;

        // Relleno dinámico: vacíos al estar inactivos, se inundan/rellenan al quedar bajo la gota
        const getFill = () => {
          if (!isCoveredByLens) return 'transparent';
          if (item.id === 'dashboard' || item.id === 'operators' || item.id === 'users') {
            return 'currentColor';
          }
          if (item.id === 'register') {
            return 'rgba(255, 255, 255, 0.35)';
          }
          return 'rgba(255, 255, 255, 0.30)';
        };

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
              zIndex: 10, // Por encima del canvas para capturar toques instantáneos
              outline: 'none',
              position: 'relative',
              height: '100%',
              userSelect: 'none',
              opacity: webGLReady ? 0 : 1 // Si WebGL está listo, el shader renderiza la barra; si no, fallback
            }}
          >
            {/* Icono con inundación/relleno sólido suave al ser cubierto por la gota */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isCoveredByLens ? 'scale(1.10)' : 'scale(1)',
                transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <Icon
                size={19}
                color={isCoveredByLens ? '#FFFFFF' : 'rgba(255, 255, 255, 0.62)'}
                strokeWidth={isCoveredByLens ? 2.2 : 1.85}
                fill={getFill()}
                style={{
                  transition: 'fill 0.25s ease, color 0.2s ease'
                }}
              />
            </div>

            {/* Texto limpio y nítido */}
            <span
              style={{
                fontSize: item.id === 'operators' ? '0.58rem' : '0.62rem',
                fontWeight: isCoveredByLens ? 800 : 500,
                color: isCoveredByLens ? '#FFFFFF' : 'rgba(255, 255, 255, 0.62)',
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
