import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, PlusCircle, UserCheck, Users, FileSpreadsheet, History } from 'lucide-react';

export default function MobileNav({ activeTab, setActiveTab, onOpenNewReport, onOpenExport }) {
  const { isAdmin } = useAuth();
  const navRef = useRef(null);
  const fabRef = useRef(null);
  const [touchActiveIndex, setTouchActiveIndex] = useState(null);

  // Estado y Ref de Posición AssistiveTouch (X, Y)
  const [fabPos, setFabPos] = useState(null);
  const fabPosRef = useRef(fabPos);
  fabPosRef.current = fabPos;

  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, fabStartX: 0, fabStartY: 0, hasMoved: false });
  const isCustomPlacedRef = useRef(false);

  // Estado de Inactividad (Reposo estilo AssistiveTouch iOS)
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef(null);

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 2200); // Ocultar parcialmente tras 2.2 segundos de inactividad
  };

  // Detectar scroll para ocultar parcialmente el botón durante la navegación
  useEffect(() => {
    resetIdleTimer();
    const handleScroll = () => {
      setIsIdle(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 1500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Inicializar y ajustar posición ante rotaciones de pantalla sin esconderse
  useEffect(() => {
    const handleResize = () => {
      const buttonWidth = fabRef.current ? fabRef.current.offsetWidth : 120;
      const buttonHeight = fabRef.current ? fabRef.current.offsetHeight : 44;
      const bottomSafeMargin = 70;

      if (!fabPosRef.current) {
        const defaultX = window.innerWidth - buttonWidth - 20;
        const defaultY = window.innerHeight - buttonHeight - bottomSafeMargin;
        setFabPos({ x: Math.max(16, defaultX), y: Math.max(70, defaultY) });
      } else if (isCustomPlacedRef.current) {
        const current = fabPosRef.current;
        const midPoint = window.innerWidth / 2;
        const isLeftSide = current.x + buttonWidth / 2 < midPoint;
        const clampedX = isLeftSide ? 16 : (window.innerWidth - buttonWidth - 16);
        const clampedY = Math.max(65, Math.min(window.innerHeight - buttonHeight - bottomSafeMargin, current.y));
        setFabPos({ x: clampedX, y: clampedY });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, action: () => setActiveTab('dashboard') },
    { id: 'history', label: 'Historial', icon: History, action: () => setActiveTab('history') },
    ...(isAdmin ? [
      { id: 'users', label: 'Usuarios', icon: Users, action: () => setActiveTab('users') },
      { id: 'operators', label: 'Operadores', icon: UserCheck, action: () => setActiveTab('operators') }
    ] : []),
    { id: 'export', label: 'PDF', icon: FileSpreadsheet, action: onOpenExport }
  ];

  const activeIndex = touchActiveIndex !== null 
    ? touchActiveIndex 
    : Math.max(0, navItems.findIndex(item => item.id === activeTab));

  const totalItems = navItems.length;
  const itemWidthPercent = 100 / totalItems;

  // Arrastre Táctil AssistiveTouch (Touch Start)
  const handleFabTouchStart = (e) => {
    resetIdleTimer();
    const touch = e.touches[0];
    const buttonWidth = fabRef.current ? fabRef.current.offsetWidth : 120;
    const buttonHeight = fabRef.current ? fabRef.current.offsetHeight : 44;
    const currentX = fabPosRef.current ? fabPosRef.current.x : (window.innerWidth - buttonWidth - 20);
    const currentY = fabPosRef.current ? fabPosRef.current.y : (window.innerHeight - buttonHeight - 70);

    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      fabStartX: currentX,
      fabStartY: currentY,
      hasMoved: false
    };
    setIsDraggingFab(true);
  };

  // Arrastre Táctil AssistiveTouch (Touch Move)
  const handleFabTouchMove = (e) => {
    if (!isDraggingFab) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.startX;
    const deltaY = touch.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      dragStartRef.current.hasMoved = true;
    }

    const buttonWidth = fabRef.current ? fabRef.current.offsetWidth : 120;
    const buttonHeight = fabRef.current ? fabRef.current.offsetHeight : 44;

    let newX = dragStartRef.current.fabStartX + deltaX;
    let newY = dragStartRef.current.fabStartY + deltaY;

    newX = Math.max(10, Math.min(window.innerWidth - buttonWidth - 10, newX));
    newY = Math.max(65, Math.min(window.innerHeight - buttonHeight - 65, newY));

    setFabPos({ x: newX, y: newY });
  };

  // Encaje Magnético AssistiveTouch a los Bordes (Touch End)
  const handleFabTouchEnd = () => {
    setIsDraggingFab(false);

    if (!dragStartRef.current.hasMoved) {
      onOpenNewReport();
      resetIdleTimer();
      return;
    }

    isCustomPlacedRef.current = true;

    if (fabPosRef.current) {
      const buttonWidth = fabRef.current ? fabRef.current.offsetWidth : 120;
      const buttonHeight = fabRef.current ? fabRef.current.offsetHeight : 44;
      const midPoint = window.innerWidth / 2;
      const currentCenterX = fabPosRef.current.x + buttonWidth / 2;

      const targetX = currentCenterX < midPoint ? 16 : (window.innerWidth - buttonWidth - 16);
      const targetY = Math.max(65, Math.min(window.innerHeight - buttonHeight - 65, fabPosRef.current.y));
      
      setFabPos({
        x: targetX,
        y: targetY
      });
    }

    resetIdleTimer();
  };

  // Soporte Mouse (Escritorio)
  const handleFabMouseDown = (e) => {
    resetIdleTimer();
    const buttonWidth = fabRef.current ? fabRef.current.offsetWidth : 120;
    const buttonHeight = fabRef.current ? fabRef.current.offsetHeight : 44;
    const currentX = fabPosRef.current ? fabPosRef.current.x : (window.innerWidth - buttonWidth - 20);
    const currentY = fabPosRef.current ? fabPosRef.current.y : (window.innerHeight - buttonHeight - 70);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      fabStartX: currentX,
      fabStartY: currentY,
      hasMoved: false
    };
    setIsDraggingFab(true);

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        dragStartRef.current.hasMoved = true;
      }
      const buttonWidthVal = fabRef.current ? fabRef.current.offsetWidth : 120;
      const buttonHeightVal = fabRef.current ? fabRef.current.offsetHeight : 44;
      let newX = Math.max(10, Math.min(window.innerWidth - buttonWidthVal - 10, dragStartRef.current.fabStartX + deltaX));
      let newY = Math.max(65, Math.min(window.innerHeight - buttonHeightVal - 65, dragStartRef.current.fabStartY + deltaY));
      setFabPos({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      setIsDraggingFab(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!dragStartRef.current.hasMoved) {
        onOpenNewReport();
      } else if (fabPosRef.current) {
        isCustomPlacedRef.current = true;
        const buttonWidthVal = fabRef.current ? fabRef.current.offsetWidth : 120;
        const buttonHeightVal = fabRef.current ? fabRef.current.offsetHeight : 44;
        const midPoint = window.innerWidth / 2;
        const currentCenterX = fabPosRef.current.x + buttonWidthVal / 2;
        const targetX = currentCenterX < midPoint ? 16 : (window.innerWidth - buttonWidthVal - 16);
        const targetY = Math.max(65, Math.min(window.innerHeight - buttonHeightVal - 65, fabPosRef.current.y));
        setFabPos({ x: targetX, y: targetY });
      }
      resetIdleTimer();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Seguimiento táctil al arrastrar el dedo por la cápsula estilo gota líquida
  const handleTouchMove = (e) => {
    if (!navRef.current) return;
    const touch = e.touches[0];
    const rect = navRef.current.getBoundingClientRect();
    const relativeX = touch.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, relativeX));
    const newIndex = Math.floor((clampedX / rect.width) * totalItems);
    const validIndex = Math.min(totalItems - 1, Math.max(0, newIndex));
    setTouchActiveIndex(validIndex);
  };

  const handleTouchEnd = () => {
    if (touchActiveIndex !== null) {
      const selectedItem = navItems[touchActiveIndex];
      if (selectedItem) {
        selectedItem.action();
      }
      setTouchActiveIndex(null);
    }
  };

  // Determinar en qué borde lateral se encuentra actualmente el botón para replegarlo suavemente
  const midPoint = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
  const buttonWidthVal = fabRef.current ? fabRef.current.offsetWidth : 120;
  const isOnLeftSide = fabPos ? fabPos.x + buttonWidthVal / 2 < midPoint : false;

  // Transformación y Opacidad en Reposo (Sin salirse de la pantalla)
  let fabTransform = 'none';
  if (isDraggingFab) {
    fabTransform = 'scale(1.08)';
  } else if (isIdle) {
    fabTransform = isOnLeftSide ? 'translateX(-6px) scale(0.92)' : 'translateX(6px) scale(0.92)';
  }

  const fabOpacity = isDraggingFab ? 1 : (isIdle ? 0.35 : 0.95);

  return (
    <>
      {/* Botón Flotante AssistiveTouch (Docking en Reposo / Scroll + zIndex: 9999) */}
      <div
        ref={fabRef}
        onTouchStart={handleFabTouchStart}
        onTouchMove={handleFabTouchMove}
        onTouchEnd={handleFabTouchEnd}
        onMouseDown={handleFabMouseDown}
        onMouseEnter={() => setIsIdle(false)}
        className="mobile-only mobile-fab-container"
        style={{
          position: 'fixed',
          left: fabPos ? `${fabPos.x}px` : 'auto',
          right: fabPos ? 'auto' : '16px',
          top: fabPos ? `${fabPos.y}px` : 'auto',
          bottom: fabPos ? 'auto' : '135px',
          zIndex: 9999,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transition: isDraggingFab 
            ? 'none' 
            : 'left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.4s ease, opacity 0.4s ease'
        }}
      >
        <button
          className="mobile-fab-btn"
          style={{
            background: 'linear-gradient(135deg, rgba(229, 46, 46, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            padding: '11px 18px',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: isDraggingFab ? 'grabbing' : 'pointer',
            fontWeight: 800,
            fontSize: '0.85rem',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.2px',
            backdropFilter: 'blur(12px) saturate(160%)',
            WebkitBackdropFilter: 'blur(12px) saturate(160%)',
            boxShadow: isDraggingFab 
              ? '0 15px 35px rgba(229, 46, 46, 0.75)' 
              : (isIdle ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 8px 24px rgba(229, 46, 46, 0.45)'),
            transform: fabTransform,
            opacity: fabOpacity,
            transition: 'transform 0.4s ease, opacity 0.4s ease, box-shadow 0.4s ease'
          }}
        >
          <PlusCircle size={20} color="#FFFFFF" />
          <span>Registrar</span>
        </button>
      </div>

      {/* Cápsula de Navegación Inferior Flotante Estilo WhatsApp */}
      <nav
        ref={navRef}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="mobile-only mobile-nav-pill"
        style={{
          position: 'fixed',
          bottom: '14px',
          left: '26px',
          right: '26px',
          maxWidth: '380px',
          margin: '0 auto',
          borderRadius: '35px',
          padding: '4px 3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 900,
          background: 'rgba(15, 23, 42, 0.18)',
          border: '1px solid rgba(255, 255, 255, 0.28)',
          backdropFilter: 'blur(8px) saturate(140%)',
          WebkitBackdropFilter: 'blur(8px) saturate(140%)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'pan-x'
        }}
      >
        {/* Burbuja / Gota Líquida Desplazable */}
        <div style={{
          position: 'absolute',
          top: '4px',
          bottom: '4px',
          left: `${activeIndex * itemWidthPercent}%`,
          width: `${itemWidthPercent}%`,
          transition: 'left 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: '0 1px'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(229, 46, 46, 0.38) 0%, rgba(185, 28, 28, 0.38) 100%)',
            border: '1px solid rgba(229, 46, 46, 0.65)',
            borderRadius: '26px',
            boxShadow: '0 0 16px rgba(229, 46, 46, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }} />
        </div>

        {/* Botones de Navegación */}
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeIndex === idx;

          return (
            <button
              key={item.id}
              onClick={item.action}
              className="mobile-nav-item-btn"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '3px 1px',
                cursor: 'pointer',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                zIndex: 2,
                outline: 'none',
                position: 'relative'
              }}
            >
              <Icon size={18} color={isActive ? '#FF5252' : 'rgba(255, 255, 255, 0.65)'} />
              <span style={{
                fontSize: item.id === 'operators' ? '0.58rem' : '0.62rem',
                fontWeight: isActive ? 800 : 500,
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                letterSpacing: item.id === 'operators' ? '-0.25px' : '0px',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
