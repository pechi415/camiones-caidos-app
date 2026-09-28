import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User,
  CaretDown,
  SignOut,
  Camera,
  MapPin,
  BookOpen,
  FileText,
  CircleNotch,
  WarningCircle,
  BellRinging,
  BellSlash,
  CheckCircle,
  DeviceMobile,
  Info
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { getShortName } from '../../utils/aiCorrector';
import { compressImage } from '../../utils/imageUtils';
import {
  getPushSubscriptionState,
  subscribeUserToPush,
  unsubscribeUserFromPush
} from '../../utils/pushUtils';

/**
 * Obtiene las iniciales exactas del usuario:
 * Primera letra del nombre + primera letra del primer apellido.
 * Ejemplo: "Alexander Francisco Ramirez Cordoba" -> "AR"
 * SIN puntos, SIN espacios, SIN separadores.
 */
function getUserInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const shortName = getShortName(fullName);
  const parts = shortName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * Obtiene el formato de nombre corto: primera letra del primer nombre + ". " + primer apellido.
 * Ejemplo: "Alexander Francisco Ramirez Cordoba" -> "A. Ramirez"
 */
function getCompactName(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const shortName = getShortName(fullName);
  const parts = shortName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0].charAt(0).toUpperCase()}. ${parts[1]}`;
}

export default function NavUserProfile({ user, logout, updateUserAvatar }) {
  const { toast } = useToast();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(null); // 'user' | 'admin' | null
  const [docError, setDocError] = useState(null);
  const [pushStatus, setPushStatus] = useState('checking'); // Incluye estados verificables, desconocidos y limpieza parcial.
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState(null);
  const avatarInputRef = useRef(null);

  const pushBusyRef = useRef(false);
  const pushCleanupRef = useRef(null);
  const pushCheckRef = useRef(0);
  const accountRef = useRef(null);
  const accountId = `${user?.id || ''}:${user?.authUserId || user?.auth_user_id || ''}`;
  accountRef.current = accountId;

  const checkPushState = useCallback(async () => {
    if (pushBusyRef.current) return;
    if (pushCleanupRef.current?.accountId === accountId) {
      setPushStatus('partial');
      return;
    }
    const requestId = ++pushCheckRef.current;
    setPushStatus('checking');
    const state = await getPushSubscriptionState(user);
    if (accountRef.current !== accountId || requestId !== pushCheckRef.current) return;
    setPushStatus(state.status);
    setPushError(state.message || (state.status === 'repair'
      ? 'La suscripción cambió o no está vinculada a esta cuenta. Pulse Activar Alertas para volver a configurarla.'
      : null));
  }, [user, accountId]);

  useEffect(() => {
    // Renovación: comprobar, sin pedir permisos ni reactivar alertas automáticamente.
    const checkGeneration = pushCheckRef;
    const refresh = () => { void checkPushState(); };
    const onMessage = event => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') refresh();
    };
    if (showRoleMenu) refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      ++checkGeneration.current;
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [showRoleMenu, checkPushState]);

  const handleTogglePush = async () => {
    if (pushBusyRef.current) return;
    if (pushStatus === 'unknown') { await checkPushState(); return; }
    pushBusyRef.current = true;
    ++pushCheckRef.current;
    setPushLoading(true);
    setPushError(null);
    try {
      const removing = pushStatus === 'active' || pushStatus === 'partial';
      const pendingEndpoint = pushCleanupRef.current?.accountId === accountId
        ? pushCleanupRef.current.endpoint : null;
      const res = removing
        ? await unsubscribeUserFromPush(user, pendingEndpoint)
        : await subscribeUserToPush(user);
      if (accountRef.current !== accountId) return;
      if (res.success) {
        pushCleanupRef.current = null;
        if (removing) {
          const state = await getPushSubscriptionState(user);
          if (accountRef.current !== accountId) return;
          setPushStatus(state.status);
          setPushError(state.message || null);
        } else setPushStatus('active');
      } else {
        setPushError(res.error || res.message || 'No se pudo confirmar la operación.');
        if (removing) {
          pushCleanupRef.current = { accountId, endpoint: res.endpoint };
          setPushStatus('partial');
        } else {
          setPushStatus(res.code === 'PERMISSION_DENIED' ? 'denied'
            : res.code === 'IOS_NOT_STANDALONE' ? 'ios_not_standalone'
              : res.code === 'UNSUPPORTED' ? 'unsupported' : 'repair');
        }
      }
    } catch {
      if (accountRef.current === accountId) {
        setPushStatus('unknown');
        setPushError('No se pudo confirmar el estado de las alertas.');
      }
    } finally {
      pushBusyRef.current = false;
      setPushLoading(false);
    }
  };

  const handleLogout = async () => {
    if (pushBusyRef.current) return;
    pushBusyRef.current = true;
    ++pushCheckRef.current;
    setPushLoading(true);
    setShowRoleMenu(false);
    try {
      const pendingEndpoint = pushCleanupRef.current?.accountId === accountId
        ? pushCleanupRef.current.endpoint : null;
      const result = await unsubscribeUserFromPush(user, pendingEndpoint);
      if (!result.success) toast.warning('Se cerrará la sesión, pero no se pudo confirmar la desactivación de las alertas de este dispositivo.');
    } catch {
      toast.warning('No se pudo confirmar la desactivación de las alertas antes de cerrar sesión.');
    } finally {
      // Las esperas de limpieza están acotadas. Un fallo push no impide cerrar sesión.
      try { await logout(); }
      finally { pushBusyRef.current = false; setPushLoading(false); }
    }
  };

  const handleSelfAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      if (user && user.id && updateUserAvatar) {
        updateUserAvatar(user.id, compressed);
      }
    } catch (err) {
      console.error('Error al procesar avatar:', err);
    }
  };

  const handleOpenDoc = async (docType) => {
    if (loadingDoc) return;

    setLoadingDoc(docType);
    setDocError(null);

    try {
      const { data, error } = await supabase.functions.invoke('get-doc-url', {
        body: {
          document: docType
        }
      });

      if (error) {
        let safeMessage = 'No fue posible obtener el manual. Intente más tarde.';
        try {
          const body = await error.context?.json();
          if (body?.error) safeMessage = body.error;
        } catch {
          // Mantener mensaje seguro
        }
        setDocError(safeMessage);
        return;
      }

      if (!data?.success || !data?.url) {
        setDocError(data?.error || 'Enlace del documento no disponible.');
        return;
      }

      const signedUrl = data.url;

      // Navegación segura mediante elemento <a> nativo con target="_blank" y rel="noopener noreferrer"
      const link = document.createElement('a');
      link.href = signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cierre del menú y limpieza de estados sin falsos positivos
      setShowRoleMenu(false);
      setDocError(null);
    } catch (err) {
      console.error('Error al solicitar URL del manual:', err);
      setDocError('Error de conexión al obtener el documento.');
    } finally {
      setLoadingDoc(null);
    }
  };

  const toggleRoleMenu = () => {
    if (showRoleMenu) {
      setDocError(null);
      setShowRoleMenu(false);
    } else {
      setShowRoleMenu(true);
    }
  };

  const userInitials = getUserInitials(user?.name);
  const compactName = getCompactName(user?.name);
  const mineCode = user?.mine === 'El Descanso' ? 'ED' : (user?.mine === 'Pribbenow' || !user?.mine ? 'PB' : user.mine);
  const groupCode = (user?.group || 'Grupo 1').replace(/^Grupo\s*/i, 'G');
  const shortLocation = `${mineCode} · ${groupCode}`;

  if (!user) return null;

  return (
    <>
      {/* Input Oculto para Cargar Foto de Perfil del Usuario Logeado */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleSelfAvatarUpload}
      />

      {/* Estilo para microanimación suave del spinner de carga */}
      <style>{`
        @keyframes docSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Usuario y Selector de Rol */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div
          onClick={() => avatarInputRef.current?.click()}
          title="Haz clic para cambiar tu foto de perfil"
          style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--brand-red)' }}
            />
          ) : (
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <User size={18} weight="duotone" />
            </div>
          )}
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            background: 'var(--brand-red)',
            borderRadius: '50%',
            width: '14px',
            height: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #000'
          }}>
            <Camera size={8} weight="bold" color="#FFFFFF" />
          </div>
        </div>

        <button
          type="button"
          onClick={toggleRoleMenu}
          aria-expanded={showRoleMenu}
          aria-label="Menú de perfil y documentación"
          style={{
            background: 'rgba(255, 255, 255, 0.07)',
            border: 'var(--glass-border-light)',
            padding: '5px 10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            color: '#FFFFFF'
          }}
        >
          <div style={{ textAlign: 'left', minWidth: 0 }} className="user-profile-info">
            <div className="user-name-full" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '360px' }}>
              {user.name}
            </div>
            <div className="user-name-short" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {compactName}
            </div>
            <div className="user-name-initials" title={user.name} style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
              {userInitials}
            </div>
            {/* Muestra Mina y Grupo en lugar del Rol */}
            <div className="user-location-full" style={{ fontSize: '0.68rem', color: 'var(--brand-beige)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <MapPin size={10} weight="duotone" style={{ flexShrink: 0 }} /> {user?.mine || 'Pribbenow'} - {user?.group || 'Grupo 1'}
            </div>
            <div className="user-location-short" title={`${user?.mine || 'Pribbenow'} - ${user?.group || 'Grupo 1'}`} style={{ fontSize: '0.68rem', color: 'var(--brand-beige)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {shortLocation}
            </div>
            <div className="user-compact-inline" title={`${user.name} (${user?.mine || 'Pribbenow'} - ${user?.group || 'Grupo 1'})`} style={{ fontSize: '0.72rem', color: '#FFFFFF', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {`${userInitials} · ${shortLocation}`}
            </div>
          </div>
          <CaretDown size={15} weight="bold" color="rgba(255,255,255,0.7)" />
        </button>

        {/* Dropdown menú de perfil y documentación */}
        {showRoleMenu && (
          <div style={{
            position: 'absolute',
            top: '115%',
            right: 0,
            width: '260px',
            background: 'var(--bg-surface-elevated)',
            backdropFilter: 'blur(20px)',
            border: 'var(--glass-border-light)',
            borderRadius: '14px',
            boxShadow: 'var(--glass-shadow-lg)',
            padding: '8px',
            zIndex: 200
          }}>
            {/* Opción Directa de Cambiar Foto de Perfil */}
            <button
              type="button"
              onClick={() => {
                setDocError(null);
                setPushError(null);
                setShowRoleMenu(false);
                avatarInputRef.current?.click();
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'rgba(243, 235, 221, 0.1)',
                border: 'var(--glass-border-beige)',
                padding: '8px 10px',
                borderRadius: '10px',
                color: 'var(--brand-beige)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '4px',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              <Camera size={16} weight="duotone" color="var(--brand-beige)" /> Cambiar Foto de Perfil
            </button>

            {/* Sección Notificaciones Push */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '6px', paddingTop: '6px' }}>
              <div style={{
                padding: '2px 8px 6px 8px',
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Notificaciones Push</span>
                {pushStatus === 'active' && (
                  <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem' }}>
                    <CheckCircle size={11} weight="fill" /> Activas
                  </span>
                )}
              </div>

              {pushStatus === 'checking' ? (
                <div style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CircleNotch size={14} weight="bold" style={{ animation: 'docSpin 1s linear infinite' }} />
                  <span>Comprobando alertas...</span>
                </div>
              ) : pushStatus === 'unsupported' ? (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.74rem',
                  lineHeight: '1.3',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}>
                  <Info size={16} weight="duotone" color="rgba(255,255,255,0.5)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Este navegador no soporta notificaciones Web Push del sistema.</span>
                </div>
              ) : pushStatus === 'ios_not_standalone' ? (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(243, 235, 221, 0.08)',
                  border: 'var(--glass-border-beige)',
                  color: 'var(--brand-beige)',
                  fontSize: '0.74rem',
                  lineHeight: '1.3',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}>
                  <DeviceMobile size={16} weight="duotone" color="var(--brand-beige)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>En iPhone, agrega la app a la Pantalla de Inicio desde Compartir para recibir alertas.</span>
                </div>
              ) : pushStatus === 'denied' ? (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#FCA5A5',
                  fontSize: '0.74rem',
                  lineHeight: '1.3',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}>
                  <WarningCircle size={16} weight="duotone" color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Permiso bloqueado. Habilítalo en la configuración de permisos del navegador.</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={pushLoading}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: pushStatus === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.07)',
                    border: pushStatus === 'active' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    color: pushStatus === 'active' ? '#34D399' : '#FFFFFF',
                    cursor: pushLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    transition: 'background 0.2s, border-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {pushStatus === 'active' ? (
                      <BellSlash size={16} weight="duotone" color="#34D399" style={{ flexShrink: 0 }} />
                    ) : (
                      <BellRinging size={16} weight="duotone" color="var(--brand-beige)" style={{ flexShrink: 0 }} />
                    )}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pushStatus === 'active' ? 'Desactivar Alertas' : pushStatus === 'partial' ? 'Reintentar desactivación' : pushStatus === 'unknown' ? 'Comprobar de nuevo' : 'Activar Alertas'}
                    </span>
                  </div>
                  {pushLoading && (
                    <CircleNotch size={14} weight="bold" style={{ animation: 'docSpin 1s linear infinite', flexShrink: 0 }} />
                  )}
                </button>
              )}

              {pushError && (
                <div style={{
                  marginTop: '4px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  lineHeight: '1.25'
                }}>
                  <WarningCircle size={13} weight="duotone" color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div style={{ flex: 1 }}>{pushError}</div>
                </div>
              )}
            </div>

            {/* Sección Documentación */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '6px', paddingTop: '6px' }}>
              <div style={{
                padding: '2px 8px 6px 8px',
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}>
                Documentación
              </div>

              {/* Botón Manual de Usuario (Disponible para Administrador, Encargado y Digitador) */}
              <button
                type="button"
                onClick={() => handleOpenDoc('user')}
                disabled={Boolean(loadingDoc)}
                title="Abrir Manual de Usuario Oficial"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: loadingDoc === 'user' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  cursor: loadingDoc ? 'not-allowed' : 'pointer',
                  opacity: loadingDoc && loadingDoc !== 'user' ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '4px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'background 0.2s, opacity 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <BookOpen size={16} weight="duotone" color="var(--brand-beige)" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Manual de Usuario</span>
                </div>
                {loadingDoc === 'user' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--brand-beige)', flexShrink: 0 }}>
                    <CircleNotch size={13} weight="bold" style={{ animation: 'docSpin 1s linear infinite' }} />
                    <span>Abriendo...</span>
                  </div>
                )}
              </button>

              {/* Botón Manual Administrativo (Exclusivo para Administrador y Encargado) */}
              {(user?.role === 'Administrador' || user?.role === 'Encargado') && (
                <button
                  type="button"
                  onClick={() => handleOpenDoc('admin')}
                  disabled={Boolean(loadingDoc)}
                  title="Abrir Manual Administrativo Oficial"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: loadingDoc === 'admin' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    cursor: loadingDoc ? 'not-allowed' : 'pointer',
                    opacity: loadingDoc && loadingDoc !== 'admin' ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    transition: 'background 0.2s, opacity 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FileText size={16} weight="duotone" color="var(--brand-beige)" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Manual Administrativo</span>
                  </div>
                  {loadingDoc === 'admin' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--brand-beige)', flexShrink: 0 }}>
                      <CircleNotch size={13} weight="bold" style={{ animation: 'docSpin 1s linear infinite' }} />
                      <span>Abriendo...</span>
                    </div>
                  )}
                </button>
              )}

              {/* Mensaje de Error Inline en la Interfaz */}
              {docError && (
                <div style={{
                  marginTop: '4px',
                  marginBottom: '4px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  lineHeight: '1.25'
                }}>
                  <WarningCircle size={14} weight="duotone" color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div style={{ flex: 1 }}>{docError}</div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '6px', paddingTop: '6px' }}>
              <button
                type="button"
                disabled={pushLoading}
                onClick={handleLogout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  color: '#EF4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <SignOut size={16} weight="duotone" /> Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
