import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, loadingSession } = useAuth();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const alertTimeoutRef = useRef(null);
  const activeAuthIdRef = useRef(null);

  // Microanimación de pulso en campana (300ms)
  const triggerBellPulse = useCallback(() => {
    setHasNewAlert(true);
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    alertTimeoutRef.current = setTimeout(() => {
      setHasNewAlert(false);
    }, 300);
  }, []);

  // Carga inicial de notificaciones del usuario autenticado con fusión anti-carrera
  const fetchNotifications = useCallback(async () => {
    const authId = user?.authUserId;
    if (!authId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (activeAuthIdRef.current !== authId) return;

      if (fetchErr) {
        console.warn('Error al consultar notificaciones en Supabase:', fetchErr.message);
        setError(fetchErr.message);
        return;
      }

      if (Array.isArray(data)) {
        setNotifications((prev) => {
          // Fusión idempotente: no sobreescribir ciegamente para preservar INSERTs de Realtime en vuelo
          const map = new Map();

          // 1. Incorporar datos del servidor
          for (const item of data) {
            if (item && item.id) {
              map.set(item.id, item);
            }
          }

          // 2. Fusionar con elementos en memoria (preserva INSERTs recientes y mutaciones optimistas)
          for (const prevItem of prev) {
            if (!prevItem || !prevItem.id) continue;
            if (map.has(prevItem.id)) {
              const serverItem = map.get(prevItem.id);
              // Preservar lectura si ya fue leída en memoria
              const isRead = prevItem.is_read || serverItem.is_read;
              map.set(prevItem.id, {
                ...serverItem,
                ...prevItem,
                is_read: isRead,
                read_at: prevItem.read_at || serverItem.read_at
              });
            } else {
              // Elemento en memoria que no vino en el fetch (ej. INSERT Realtime recibido durante la petición)
              map.set(prevItem.id, prevItem);
            }
          }

          // 3. Ordenar estrictamente por created_at DESC
          const merged = Array.from(map.values()).sort((a, b) => {
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            return timeB - timeA;
          });

          // 4. Calcular unreadCount coherente con la lista fusionada
          const unread = merged.filter((n) => !n.is_read).length;
          setUnreadCount(unread);

          return merged;
        });
      }
    } catch (err) {
      console.warn('Excepción al consultar notificaciones:', err);
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [user?.authUserId]);

  // Sincronización de ciclo de vida de sesión y canal Realtime
  useEffect(() => {
    if (loadingSession) return;

    const authId = user?.authUserId || null;
    activeAuthIdRef.current = authId;

    if (!authId) {
      // Limpieza de estado al cerrar sesión para aislar datos entre usuarios
      setNotifications([]);
      setUnreadCount(0);
      setIsPanelOpen(false);
      setActiveNotification(null);
      setError(null);
      return;
    }

    // Cargar datos iniciales
    fetchNotifications();

    // Suscripción Realtime aislada por auth_user_id
    const channel = supabase
      .channel(`public:notifications:${authId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `auth_user_id=eq.${authId}`
        },
        (payload) => {
          const newNotif = payload.new;
          if (!newNotif) return;

          setNotifications((prev) => {
            // Evitar duplicación
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          if (!newNotif.is_read) {
            setUnreadCount((prev) => prev + 1);
          }

          // Animación visual de campana
          triggerBellPulse();

          // Alerta Toast no bloqueante
          if (newNotif.event_type === 'new_report' || newNotif.event_type === 'status_change') {
            const toastTitle = newNotif.title || 'Novedad operacional';
            const toastBody = newNotif.message ? newNotif.message.replace(/\n/g, ' · ') : '';
            toast.info(`${toastTitle}${toastBody ? `: ${toastBody}` : ''}`);
          } else {
            const count = newNotif.truck_count || 0;
            const countText = `${count} ${count === 1 ? 'camión' : 'camiones'} DOWN en campo`;
            toast.info(`Cambio de turno — ${newNotif.mine}: ${countText}`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `auth_user_id=eq.${authId}`
        },
        (payload) => {
          const updatedNotif = payload.new;
          if (!updatedNotif) return;

          setNotifications((prev) => {
            const next = prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n));
            const unread = next.filter((n) => !n.is_read).length;
            setUnreadCount(unread);
            return next;
          });

          setActiveNotification((current) => {
            if (current && current.id === updatedNotif.id) {
              return updatedNotif;
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [user?.authUserId, loadingSession, fetchNotifications, triggerBellPulse, toast]);

  // Marcar una notificación individual como leída con rollback en caso de fallo
  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;

    let previousNotifications = null;
    let previousUnreadCount = null;
    let wasUnread = false;

    // Mutación optimista inmediata en memoria guardando snapshot para rollback
    setNotifications((prev) => {
      previousNotifications = prev;
      const target = prev.find((n) => n.id === notificationId);
      if (!target || target.is_read) return prev;
      wasUnread = true;
      return prev.map((n) =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      );
    });

    if (wasUnread) {
      setUnreadCount((prev) => {
        previousUnreadCount = prev;
        return Math.max(0, prev - 1);
      });
    }

    try {
      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (updateErr) {
        throw new Error(updateErr.message);
      }
    } catch (err) {
      console.warn('Fallo al actualizar notificación en Supabase. Ejecutando rollback:', err.message || err);
      // Revertir exactamente al snapshot anterior
      if (previousNotifications) {
        setNotifications(previousNotifications);
      }
      if (previousUnreadCount !== null) {
        setUnreadCount(previousUnreadCount);
      }
    }
  }, []);

  // Marcar todas las notificaciones pendientes como leídas con rollback en caso de fallo
  const markAllAsRead = useCallback(async () => {
    let previousNotifications = null;
    let previousUnreadCount = null;

    // Mutación optimista inmediata guardando snapshot para rollback
    setNotifications((prev) => {
      previousNotifications = prev;
      return prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || new Date().toISOString()
      }));
    });

    setUnreadCount((prev) => {
      previousUnreadCount = prev;
      return 0;
    });

    try {
      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (updateErr) {
        throw new Error(updateErr.message);
      }
    } catch (err) {
      console.warn('Fallo al marcar todas como leídas en Supabase. Ejecutando rollback:', err.message || err);
      // Revertir exactamente al snapshot anterior
      if (previousNotifications) {
        setNotifications(previousNotifications);
      }
      if (previousUnreadCount !== null) {
        setUnreadCount(previousUnreadCount);
      }
    }
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const openNotificationDetail = useCallback((notification) => {
    setActiveNotification(notification);
    if (notification && !notification.is_read) {
      markAsRead(notification.id);
    }
  }, [markAsRead]);

  const closeNotificationDetail = useCallback(() => {
    setActiveNotification(null);
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    isPanelOpen,
    activeNotification,
    hasNewAlert,
    togglePanel,
    closePanel,
    openNotificationDetail,
    closeNotificationDetail,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    isPanelOpen,
    activeNotification,
    hasNewAlert,
    togglePanel,
    closePanel,
    openNotificationDetail,
    closeNotificationDetail,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe ser utilizado dentro de un NotificationProvider');
  }
  return context;
}
