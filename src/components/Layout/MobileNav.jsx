import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, History, PlusCircle, UserCheck, Users, FileSpreadsheet } from 'lucide-react';
import LiquidLensCanvas from './LiquidLensCanvas';

export default function MobileNav({ activeTab, setActiveTab, onOpenNewReport, onOpenExport }) {
  const { isAdmin } = useAuth();
  const navRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 380, height: 66 });
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

  // Anchura adaptativa de la cápsula según la posición:
  // - En los extremos (Inicio y PDF): 86% para no chocar con las puntas redondas ni desplazarse hacia el centro
  // - En los botones intermedios (Historial, Registrar, Operad., Usuarios): 105% para amplio respiro horizontal
  const getTabBaseWidth = useCallback((idx) => {
    if (idx === 0 || idx === totalItems - 1) {
      return itemWidthPercent * 0.86;
    }
    return itemWidthPercent * 1.05;
  }, [itemWidthPercent, totalItems]);

  const maxStretchPercent = itemWidthPercent * 0.45;

  // Estados de arrastre e interacción táctil
  const [isDragging, setIsDragging] = useState(false);
  const [dragHoverIndex, setDragHoverIndex] = useState(null);

  const initialWidth = getTabBaseWidth(activeIndex);

  // Refs para el motor continuo de física de fluidos (Spring Physics 60/120fps)
  const animFrameIdRef = useRef(null);
  const physicsRef = useRef({
    x: (activeIndex + 0.5) * itemWidthPercent,
    targetX: (activeIndex + 0.5) * itemWidthPercent,
    vx: 0,
    width: initialWidth,
    vw: 0,
    isDragging: false,
    dragTargetX: null,
    lastTime: null
  });

  // Estado reactivo que alimenta el WebGL Canvas y el contorno elástico SVG
  const [lensState, setLensState] = useState(() => ({
    centerX: (activeIndex + 0.5) * itemWidthPercent,
    width: initialWidth,
    isMoving: false
  }));

  const lastTouchXRef = useRef(0);
  const touchMovedRef = useRef(false);

  // Bucle de Física de Resorte Continuo (Spring Physics)
  const startPhysicsLoop = useCallback(() => {
    if (animFrameIdRef.current) return;

    physicsRef.current.lastTime = performance.now();

    const tick = (now) => {
      const p = physicsRef.current;
      const dt = Math.min((now - (p.lastTime || now)) / 1000, 0.032);
      p.lastTime = now;

      // Determinar objetivo actual (posición táctil o centro de la pestaña seleccionada)
      let currentTargetX = p.targetX;
      if (p.isDragging && p.dragTargetX !== null) {
        currentTargetX = p.dragTargetX;
      }

      // Determinar el índice de la pestaña de destino para su anchura base
      const targetIdx = p.isDragging && dragHoverIndex !== null
        ? dragHoverIndex
        : Math.max(0, Math.min(totalItems - 1, Math.round((currentTargetX / itemWidthPercent) - 0.5)));
      const targetBaseWidth = getTabBaseWidth(targetIdx);

      // 1. SPRING PHYSICS EN POSICIÓN X
      // Rigidez (k=240) y amortiguación (c=21) para el rebote elástico característico de iOS
      const k = p.isDragging ? 480 : 240;
      const c = p.isDragging ? 38 : 21;
      const dx = p.x - currentTargetX;
      const springForce = -k * dx - c * p.vx;
      p.vx += springForce * dt;
      p.x += p.vx * dt;

      // 2. DEFORMACIÓN E INERCIA LÍQUIDA (STRETCH PROPORCIONAL A LA VELOCIDAD)
      const speed = Math.abs(p.vx);
      const velocityStretch = Math.min(maxStretchPercent, speed * 0.11);
      const desiredWidth = (p.isDragging ? itemWidthPercent * 1.22 : targetBaseWidth) + velocityStretch;

      // Resorte suave para la anchura para un estiramiento y contracción orgánicos
      const kw = 260;
      const cw = 24;
      const dw = p.width - desiredWidth;
      p.vw += (-kw * dw - cw * p.vw) * dt;
      p.width += p.vw * dt;

      // 3. LÍMITES DE CONTENCIÓN ESTRICTA EN EL DOCK
      const halfW = p.width * 0.5;
      const edgeMargin = 1.0;
      const minAllowed = halfW + edgeMargin;
      const maxAllowed = 100 - halfW - edgeMargin;
      const clampedX = Math.max(minAllowed, Math.min(maxAllowed, p.x));

      // Detección de movimiento
      const stillMoving = p.isDragging || Math.abs(dx) > 0.05 || speed > 0.3 || Math.abs(p.width - targetBaseWidth) > 0.08;

      if (stillMoving) {
        setLensState({
          centerX: clampedX,
          width: p.width,
          isMoving: true
        });
        animFrameIdRef.current = requestAnimationFrame(tick);
      } else {
        // En reposo definitivo en el botón seleccionado
        p.x = currentTargetX;
        p.vx = 0;
        p.width = targetBaseWidth;
        p.vw = 0;
        p.lastTime = null;
        animFrameIdRef.current = null;
        setLensState({
          centerX: currentTargetX,
          width: targetBaseWidth,
          isMoving: false
        });
      }
    };

    animFrameIdRef.current = requestAnimationFrame(tick);
  }, [itemWidthPercent, getTabBaseWidth, maxStretchPercent, totalItems, dragHoverIndex]);

  // Al cambiar la pestaña activa (por clic directo), la gota viaja físicamente por la barra
  useEffect(() => {
    const newIdx = navItems.findIndex(item => item.id === activeTab);
    if (newIdx !== -1) {
      const targetPercent = (newIdx + 0.5) * itemWidthPercent;
      physicsRef.current.targetX = targetPercent;
      startPhysicsLoop();
    }
  }, [activeTab, itemWidthPercent, startPhysicsLoop]);

  // Limpiar loop de animación al desmontar
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Coordenadas actuales interpoladas en tiempo real para shaders y cortes vectoriales
  const currentCenterXPercent = lensState.centerX;
  const lensWidthPercent = lensState.width;
  const isMoving = lensState.isMoving;

  const halfLensPercent = lensWidthPercent / 2;
  const clampedLeftPercent = currentCenterXPercent - halfLensPercent;
  const lensLeftBoundary = clampedLeftPercent;
  const lensRightBoundary = clampedLeftPercent + lensWidthPercent;

  // --- GESTOS: Arrastre fluido 1:1 táctil y mouse con deformación física ---
  const handlePointerDown = (clientX) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    lastTouchXRef.current = clientX;
    touchMovedRef.current = true;

    const relX = clientX - rect.left;
    const centerPercent = (relX / rect.width) * 100;
    const hoverIdx = Math.max(0, Math.min(totalItems - 1, Math.floor((relX / rect.width) * totalItems)));

    physicsRef.current.isDragging = true;
    physicsRef.current.dragTargetX = centerPercent;
    setIsDragging(true);
    setDragHoverIndex(hoverIdx);
    startPhysicsLoop();
  };

  const handlePointerMove = (clientX) => {
    if (!navRef.current || !physicsRef.current.isDragging) return;
    const rect = navRef.current.getBoundingClientRect();

    if (Math.abs(clientX - lastTouchXRef.current) > 3) {
      touchMovedRef.current = true;
    }
    lastTouchXRef.current = clientX;

    const relX = clientX - rect.left;
    const centerPercent = (relX / rect.width) * 100;
    const hoverIdx = Math.max(0, Math.min(totalItems - 1, Math.floor((relX / rect.width) * totalItems)));

    physicsRef.current.dragTargetX = centerPercent;
    setDragHoverIndex(hoverIdx);
    startPhysicsLoop();
  };

  const handlePointerUp = () => {
    if (!physicsRef.current.isDragging) return;

    physicsRef.current.isDragging = false;
    physicsRef.current.dragTargetX = null;
    setIsDragging(false);

    const targetIdx = dragHoverIndex !== null ? dragHoverIndex : activeIndex;
    const targetItem = navItems[targetIdx];
    setDragHoverIndex(null);

    if (targetItem) {
      targetItem.action();
      const targetPercent = (targetIdx + 0.5) * itemWidthPercent;
      physicsRef.current.targetX = targetPercent;
      startPhysicsLoop();
    }
  };

  const handleTouchStart = (e) => handlePointerDown(e.touches[0].clientX);
  const handleTouchMove = (e) => handlePointerMove(e.touches[0].clientX);
  const handleTouchEnd = () => handlePointerUp();

  const handleMouseDown = (e) => {
    handlePointerDown(e.clientX);
    const onMouseMove = (moveEvt) => handlePointerMove(moveEvt.clientX);
    const onMouseUp = () => {
      handlePointerUp();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Genera el contorno SVG de la barra con efecto cinturilla elástica que se aprieta en la posición de la gota
  const getDockPath = () => {
    const W = dimensions.width || 380;
    const H = dimensions.height || 66;
    const R = H / 2; // 33px radio de extremos
    const pinch = isMoving ? 3.5 : 0; // Contracción sutil y delicada de 3.5px arriba y abajo
    const pw = 56; // Amplitud amplia de 56px para una transición sedosa y orgánica
    const cx = (currentCenterXPercent / 100) * W;

    // Estado en reposo: Cápsula rectangular redondeada perfecta
    if (pinch <= 0.1) {
      return `M ${R} 0 L ${W - R} 0 A ${R} ${R} 0 0 1 ${W} ${R} A ${R} ${R} 0 0 1 ${W - R} ${H} L ${R} ${H} A ${R} ${R} 0 0 1 0 ${R} A ${R} ${R} 0 0 1 ${R} 0 Z`;
    }

    // Estado activo: Línea superior se hunde hacia abajo y línea inferior se eleva hacia arriba en la coordenada de la gota
    const x0 = Math.max(R, cx - pw);
    const x1 = Math.min(W - R, cx + pw);

    return `
      M ${R} 0
      L ${x0} 0
      C ${x0 + pw * 0.35} 0, ${cx - pw * 0.25} ${pinch}, ${cx} ${pinch}
      C ${cx + pw * 0.25} ${pinch}, ${x1 - pw * 0.35} 0, ${x1} 0
      L ${W - R} 0
      A ${R} ${R} 0 0 1 ${W} ${R}
      A ${R} ${R} 0 0 1 ${W - R} ${H}
      L ${x1} ${H}
      C ${x1 - pw * 0.35} ${H}, ${cx + pw * 0.25} ${H - pinch}, ${cx} ${H - pinch}
      C ${cx - pw * 0.25} ${H - pinch}, ${x0 + pw * 0.35} ${H}, ${x0} ${H}
      L ${R} ${H}
      A ${R} ${R} 0 0 1 0 ${R}
      A ${R} ${R} 0 0 1 ${R} 0
      Z
    `;
  };

  return (
    <nav
      ref={navRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className="mobile-only mobile-nav-pill"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '16px',
        right: '16px',
        maxWidth: '420px',
        margin: '0 auto',
        height: '66px',
        borderRadius: '35px',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 9999,
        background: 'transparent',
        border: 'none',
        backdropFilter: 'blur(28px) saturate(190%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        overflow: 'visible'
      }}
    >
      {/* 🧬 CONTORNO DINÁMICO DE CINTURILLA ELÁSTICA (Líneas superior e inferior se curvan hacia adentro en la gota) */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex: 0,
          filter: 'drop-shadow(0 16px 40px rgba(0, 0, 0, 0.65))'
        }}
      >
        <defs>
          <linearGradient id="dockBorderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.40)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.16)" />
          </linearGradient>
        </defs>
        <path
          d={getDockPath()}
          fill="rgba(12, 16, 25, 0.78)"
          stroke="url(#dockBorderGrad)"
          strokeWidth="1.2"
        />
      </svg>
      {/* 🔮 MOTOR ÓPTICO WEBGL (Refracción física por Shaders GLSL de Apple Liquid Glass) */}
      <LiquidLensCanvas
        navItems={navItems}
        activeTab={activeTab}
        lensCenterXPercent={currentCenterXPercent}
        lensWidthPercent={lensWidthPercent}
        isMoving={isMoving}
        containerWidth={dimensions.width}
        containerHeight={dimensions.height}
        onReady={setWebGLReady}
      />

      {/* Fallback CSS Lente (si WebGL no estuviera soportado) */}
      {!webGLReady && (
        <div
          className={`whatsapp-water-lens ${isDragging ? 'is-dragging' : ''} ${isMoving ? 'is-snapping' : ''}`}
          style={{
            left: `${clampedLeftPercent}%`,
            width: `${lensWidthPercent}%`,
            transition: isDragging
              ? 'width 0.16s ease-out'
              : 'none'
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
              gap: '4px',
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
                size={20}
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
