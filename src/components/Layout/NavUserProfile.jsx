import React, { useState, useRef } from 'react';
import {
  User,
  ChevronDown,
  LogOut,
  Camera,
  MapPin,
  BookOpen,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getShortName } from '../../utils/aiCorrector';
import { compressImage } from '../../utils/imageUtils';

export default function NavUserProfile({ user, logout, updateUserAvatar }) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(null); // 'user' | 'admin' | null
  const [docError, setDocError] = useState(null);
  const [fallbackUrl, setFallbackUrl] = useState(null);
  const avatarInputRef = useRef(null);

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
    setFallbackUrl(null);

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
      const newWindow = window.open(signedUrl, '_blank', 'noopener,noreferrer');

      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Bloqueador de popups detectado: no redirigir la PWA, conservar la URL en memoria y ofrecer fallback interactivo
        setFallbackUrl(signedUrl);
      } else {
        // Apertura exitosa en nueva pestaña: cerrar menú y limpiar estados
        setShowRoleMenu(false);
        setDocError(null);
        setFallbackUrl(null);
      }
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
      setFallbackUrl(null);
      setShowRoleMenu(false);
    } else {
      setShowRoleMenu(true);
    }
  };

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
              <User size={18} />
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
            <Camera size={8} color="#FFFFFF" />
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
            <div className="user-name-full" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
              {user.name}
            </div>
            <div className="user-name-short" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {getShortName(user.name)}
            </div>
            {/* Muestra Mina y Grupo en lugar del Rol */}
            <div style={{ fontSize: '0.68rem', color: 'var(--brand-beige)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <MapPin size={10} style={{ flexShrink: 0 }} /> {user?.mine || 'Pribbenow'} - {user?.group || 'Grupo 1'}
            </div>
          </div>
          <ChevronDown size={15} color="rgba(255,255,255,0.7)" />
        </button>

        {/* Dropdown menú de perfil y documentación */}
        {showRoleMenu && (
          <div style={{
            position: 'absolute',
            top: '115%',
            right: 0,
            width: '240px',
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
                setFallbackUrl(null);
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
              <Camera size={16} color="var(--brand-beige)" /> Cambiar Foto de Perfil
            </button>

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
                  <BookOpen size={16} color="var(--brand-beige)" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Manual de Usuario</span>
                </div>
                {loadingDoc === 'user' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--brand-beige)', flexShrink: 0 }}>
                    <Loader2 size={13} style={{ animation: 'docSpin 1s linear infinite' }} />
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
                    <FileText size={16} color="var(--brand-beige)" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Manual Administrativo</span>
                  </div>
                  {loadingDoc === 'admin' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--brand-beige)', flexShrink: 0 }}>
                      <Loader2 size={13} style={{ animation: 'docSpin 1s linear infinite' }} />
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
                  <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div style={{ flex: 1 }}>{docError}</div>
                </div>
              )}

              {/* Enlace Fallback si el Navegador Bloqueó la Ventana Emergente */}
              {fallbackUrl && (
                <div style={{
                  marginTop: '4px',
                  marginBottom: '4px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  color: '#FEF08A',
                  fontSize: '0.74rem',
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: '6px' }}>No se pudo abrir automáticamente.</div>
                  <a
                    href={fallbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setFallbackUrl(null);
                      setShowRoleMenu(false);
                    }}
                    style={{
                      display: 'inline-block',
                      color: '#0F1115',
                      background: 'var(--brand-beige)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      fontSize: '0.75rem'
                    }}
                  >
                    Abrir Manual
                  </a>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '6px', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setDocError(null);
                  setFallbackUrl(null);
                  setShowRoleMenu(false);
                  logout();
                }}
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
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
