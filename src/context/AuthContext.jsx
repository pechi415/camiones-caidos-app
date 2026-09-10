import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getOperationalDateISO } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

const AUTH_DOMAIN = 'camionescaidos.internal';

const CACHE_PROFILE_KEY = 'camiones_user_profile';

/**
 * Normaliza la cédula eliminando espacios y caracteres no numéricos.
 */
const cleanNationalId = (id) => String(id || '').replace(/\D/g, '').trim();

/**
 * Función única y canónica para derivar el email técnico desde la cédula.
 */
const nationalIdToTechnicalEmail = (id) => {
  const cleaned = cleanNationalId(id);
  if (!cleaned) throw new Error('Cédula inválida para generar email técnico.');
  return `${cleaned}@${AUTH_DOMAIN}`;
};

/**
 * Guarda el perfil validado en caché local para soporte offline seguro.
 */
const saveCachedProfile = (profile) => {
  if (!profile || !profile.authUserId) return;
  try {
    localStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('No fue posible guardar el perfil en caché local:', err);
  }
};

/**
 * Lee el perfil validado previamente desde el caché local.
 */
const getCachedProfile = () => {
  try {
    const raw = localStorage.getItem(CACHE_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.authUserId) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('Error leyendo perfil en caché local:', err);
    return null;
  }
};

/**
 * Elimina el perfil del caché local al cerrar sesión o invalidar credenciales.
 */
const clearCachedProfile = () => {
  try {
    localStorage.removeItem(CACHE_PROFILE_KEY);
  } catch (err) {
    console.warn('Error limpiando perfil en caché local:', err);
  }
};

/**
 * Determina de forma precisa si un error se debe a fallas de red, transporte o pérdida de conexión.
 */
const isNetworkOrConnectionError = (error, err) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (error?.status === 0 || err?.status === 0 || (typeof TypeError !== 'undefined' && err instanceof TypeError)) {
    return true;
  }
  const msg = (error?.message || err?.message || String(error || err || '')).toLowerCase();
  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('connection') ||
    msg.includes('load failed') ||
    msg.includes('offline') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_name_not_resolved')
  ) {
    return true;
  }
  return false;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Referencia para rastrear el auth_user_id autenticado actualmente y evitar consultas duplicadas
  const currentAuthIdRef = useRef(null);
  // Perfil cargado en memoria para resolución inmediata y reutilización
  const currentProfileRef = useRef(null);
  // Promesa de carga en vuelo para coordinar peticiones concurrentes del mismo auth_user_id
  const pendingProfilePromiseRef = useRef(null);

  // Lista de usuarios en memoria exclusivamente para el módulo de administración (no almacena contraseñas)
  const [usersList, setUsersList] = useState([]);

  const [activeMine, setActiveMine] = useState(() => {
    const saved = localStorage.getItem('camiones_mine');
    if (!saved) return 'Pribbenow';
    return saved.replace(' (PB)', '').replace(' (ED)', '');
  });

  const [activeShift, setActiveShift] = useState(() => {
    const currentHour = new Date().getHours();
    return (currentHour >= 6 && currentHour < 18) ? 'Diurno' : 'Nocturno';
  });

  /**
   * Consulta el perfil de aplicación en public.app_users correspondiente
   * al auth_user_id autenticado en Supabase Auth.
   * Si la red falla, consulta de forma segura el perfil previamente validado en caché.
   */
  const fetchProfileByAuthId = async (authUserId, options = {}) => {
    try {
      // Si el navegador ya detecta que no hay conexión y no se fuerza consulta al servidor
      if (typeof navigator !== 'undefined' && navigator.onLine === false && !options.forceServer) {
        const cached = getCachedProfile();
        if (cached && cached.authUserId === authUserId) {
          return { profile: cached, isNetworkError: true, notFound: false };
        }
        return { profile: null, isNetworkError: true, notFound: false };
      }

      const { data, error } = await supabase
        .from('app_users')
        .select('id, national_id, name, role, mine, group_name, must_change_password, avatar, auth_user_id')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        // Distinguir error de red vs error del servidor / usuario inexistente
        if (isNetworkOrConnectionError(error)) {
          const cached = getCachedProfile();
          if (cached && cached.authUserId === authUserId) {
            return { profile: cached, isNetworkError: true, notFound: false };
          }
          return { profile: null, isNetworkError: true, notFound: false };
        }

        // Si el código es PGRST116 (0 filas encontradas), el usuario fue eliminado de app_users
        if (error.code === 'PGRST116') {
          return { profile: null, isNetworkError: false, notFound: true };
        }

        console.error('Error al consultar perfil en app_users por auth_user_id:', error);
        return { profile: null, isNetworkError: false, notFound: false, error };
      }

      if (!data) {
        return { profile: null, isNetworkError: false, notFound: true };
      }

      const freshProfile = {
        id: data.id,
        nationalId: data.national_id,
        name: data.name,
        role: data.role,
        mine: data.mine,
        group: data.group_name || 'Grupo 1',
        mustChangePassword: data.must_change_password !== undefined ? data.must_change_password : false,
        avatar: data.avatar || '',
        authUserId: data.auth_user_id
      };

      // Guardar snapshot actualizado en caché local seguro
      saveCachedProfile(freshProfile);

      return { profile: freshProfile, isNetworkError: false, notFound: false };
    } catch (err) {
      if (isNetworkOrConnectionError(null, err)) {
        const cached = getCachedProfile();
        if (cached && cached.authUserId === authUserId) {
          return { profile: cached, isNetworkError: true, notFound: false };
        }
        return { profile: null, isNetworkError: true, notFound: false };
      }

      console.error('Excepción consultando perfil por auth_user_id:', err);
      return { profile: null, isNetworkError: false, notFound: false, error: err };
    }
  };

  /**
   * Carga el perfil de aplicación deduplicando peticiones en curso y
   * reutilizando el perfil en memoria si ya fue cargado para el mismo auth_user_id.
   */
  const getOrFetchProfile = async (authUserId, options = {}) => {
    if (!authUserId) return null;

    // Si ya tenemos el perfil de este auth_user_id cargado en memoria
    if (!options.forceServer && currentAuthIdRef.current === authUserId && currentProfileRef.current) {
      return { profile: currentProfileRef.current, isNetworkError: false, notFound: false };
    }

    // Si ya existe una petición en curso para este auth_user_id, reutilizar la misma promesa
    if (
      !options.forceServer &&
      pendingProfilePromiseRef.current &&
      pendingProfilePromiseRef.current.authUserId === authUserId
    ) {
      return pendingProfilePromiseRef.current.promise;
    }

    currentAuthIdRef.current = authUserId;

    const fetchPromise = (async () => {
      try {
        const result = await fetchProfileByAuthId(authUserId, options);
        if (result?.profile && currentAuthIdRef.current === authUserId) {
          currentProfileRef.current = result.profile;
        }
        return result;
      } finally {
        if (pendingProfilePromiseRef.current?.authUserId === authUserId) {
          pendingProfilePromiseRef.current = null;
        }
      }
    })();

    pendingProfilePromiseRef.current = {
      authUserId,
      promise: fetchPromise
    };

    return fetchPromise;
  };

  /**
   * Carga el directorio de usuarios exclusivamente cuando un Administrador
   * accede a la gestión. NUNCA solicita el campo password.
   */
  const loadUsersForAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, national_id, name, role, mine, group_name, must_change_password, avatar, auth_user_id, created_at')
        .order('name');

      if (error) {
        console.warn('Error al leer usuarios para administración:', error.message);
        return;
      }

      if (data) {
        const mapped = data.map(u => ({
          id: u.id,
          nationalId: u.national_id,
          name: u.name,
          role: u.role,
          mine: u.mine,
          group: u.group_name || 'Grupo 1',
          mustChangePassword: u.must_change_password !== undefined ? u.must_change_password : true,
          avatar: u.avatar || '',
          authUserId: u.auth_user_id,
          createdAt: u.created_at
        }));
        setUsersList(mapped);
      }
    } catch (err) {
      console.warn('Excepción cargando usuarios para administración:', err);
    }
  };

  // 1. Inicialización de sesión oficial, escucha de cambios de Supabase Auth y revalidación en reconexión
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error recuperando sesión de Supabase Auth:', error.message);
        }

        const sessionAuthId = session?.user?.id;
        if (sessionAuthId && isMounted) {
          const result = await getOrFetchProfile(sessionAuthId);
          const profile = result?.profile;

          if (profile && isMounted) {
            setUser(profile);
            if (profile.mine) {
              setActiveMine(profile.mine.replace(' (PB)', '').replace(' (ED)', ''));
            }
          } else if (isMounted) {
            // Solo cerrar sesión si NO es un error de transporte/red
            if (!result?.isNetworkError) {
              clearCachedProfile();
              currentAuthIdRef.current = null;
              currentProfileRef.current = null;
              await supabase.auth.signOut();
              setUser(null);
            } else {
              // Error de red sin caché previo: mantener en login sin forzar signOut
              setUser(null);
            }
          }
        } else if (isMounted && !currentAuthIdRef.current) {
          setUser(null);
        }
      } catch (err) {
        console.error('Error durante initSession:', err);
        if (isMounted) {
          currentAuthIdRef.current = null;
          currentProfileRef.current = null;
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoadingSession(false);
        }
      }
    };

    initSession();

    // Suscripción al ciclo de vida de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        clearCachedProfile();
        currentAuthIdRef.current = null;
        currentProfileRef.current = null;
        pendingProfilePromiseRef.current = null;
        setUser(null);
        setLoadingSession(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const sessionAuthId = session?.user?.id;
        if (sessionAuthId) {
          try {
            const result = await getOrFetchProfile(sessionAuthId);
            const profile = result?.profile;

            if (profile && isMounted) {
              setUser(profile);
              if (profile.mine) {
                setActiveMine(profile.mine.replace(' (PB)', '').replace(' (ED)', ''));
              }
            } else if (isMounted) {
              if (!result?.isNetworkError) {
                clearCachedProfile();
                currentAuthIdRef.current = null;
                currentProfileRef.current = null;
                await supabase.auth.signOut();
                setUser(null);
              } else {
                setUser(null);
              }
            }
          } catch (err) {
            console.error('Error sincronizando perfil en evento auth:', err);
          } finally {
            if (isMounted) setLoadingSession(false);
          }
        } else {
          if (isMounted && !currentAuthIdRef.current) {
            setUser(null);
            setLoadingSession(false);
          }
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // Renovación transparente del token: no consultar app_users ni recargar perfil
        return;
      }

      if (event === 'USER_UPDATED') {
        // Actualización de metadatos de Auth: no provocar consultas redundantes
        return;
      }
    });

    // Revalidación silenciosa en segundo plano al recuperar la conexión a internet
    const handleOnline = async () => {
      if (!isMounted) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeAuthId = session?.user?.id;
        if (!activeAuthId) return;

        const freshResult = await fetchProfileByAuthId(activeAuthId, { forceServer: true });
        if (!isMounted || currentAuthIdRef.current !== activeAuthId) return;

        if (freshResult?.profile) {
          setUser(prev => {
            const p = freshResult.profile;
            if (
              !prev ||
              prev.role !== p.role ||
              prev.mine !== p.mine ||
              prev.name !== p.name ||
              prev.group !== p.group ||
              prev.mustChangePassword !== p.mustChangePassword ||
              prev.avatar !== p.avatar
            ) {
              if (p.mine) {
                setActiveMine(p.mine.replace(' (PB)', '').replace(' (ED)', ''));
              }
              return p;
            }
            return prev;
          });
        } else if (freshResult?.notFound) {
          console.warn('Usuario eliminado o revocado del sistema. Cerrando sesión...');
          clearCachedProfile();
          currentAuthIdRef.current = null;
          currentProfileRef.current = null;
          await supabase.auth.signOut();
          if (isMounted) setUser(null);
        }
      } catch (err) {
        console.warn('Error durante la revalidación silenciosa en reconexión online:', err);
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Cargar lista de administración si el usuario autenticado es Administrador
  useEffect(() => {
    if (user?.role === 'Administrador') {
      loadUsersForAdmin();
    }
  }, [user?.role]);

  // Persistir configuración de mina activa
  useEffect(() => {
    localStorage.setItem('camiones_mine', activeMine);
  }, [activeMine]);

  /**
   * Inicio de sesión exclusivo mediante Supabase Auth oficial.
   */
  const login = async (nationalId, inputPassword) => {
    const cleanId = cleanNationalId(nationalId);
    if (!cleanId) {
      return { success: false, message: 'Por favor ingrese un número de identificación válido.' };
    }
    if (!inputPassword) {
      return { success: false, message: 'Por favor ingrese su contraseña.' };
    }

    const technicalEmail = nationalIdToTechnicalEmail(cleanId);

    // Supabase Auth oficial
    let authSuccess = false;
    let authUser = null;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: technicalEmail,
        password: inputPassword
      });

      if (error) {
        if (isNetworkOrConnectionError(error)) {
          return { success: false, message: 'Sin conexión a internet. Para iniciar sesión se requiere conexión a la red.' };
        }
      }

      if (!error && data?.user) {
        authSuccess = true;
        authUser = data.user;
      }
    } catch (err) {
      if (isNetworkOrConnectionError(null, err)) {
        return { success: false, message: 'Sin conexión a internet. Para iniciar sesión se requiere conexión a la red.' };
      }
      console.warn('Error intentando login con Supabase Auth:', err);
    }

    if (authSuccess && authUser) {
      const result = await getOrFetchProfile(authUser.id, { forceServer: true });
      const profile = result?.profile;

      if (!profile) {
        clearCachedProfile();
        currentAuthIdRef.current = null;
        currentProfileRef.current = null;
        await supabase.auth.signOut();
        return { success: false, message: 'Error al cargar el perfil de usuario. Contacte al administrador.' };
      }

      setUser(profile);
      if (profile.mine) {
        setActiveMine(profile.mine.replace(' (PB)', '').replace(' (ED)', ''));
      }
      setLoadingSession(false);
      return {
        success: true,
        mustChangePassword: profile.mustChangePassword === true
      };
    }

    return { success: false, message: 'El número de identificación o la contraseña son incorrectos.' };
  };

  /**
   * Cierre de sesión oficial en Supabase Auth y reseteo de estado React.
   */
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error al cerrar sesión en Supabase Auth:', err);
    } finally {
      clearCachedProfile();
      currentAuthIdRef.current = null;
      currentProfileRef.current = null;
      pendingProfilePromiseRef.current = null;
      setUser(null);
    }
  };

  /**
   * Actualización de contraseña oficial en Supabase Auth:
   * 1. Actualiza en Supabase Auth mediante updateUser({ password }).
   * 2. Si Auth tiene éxito, actualiza must_change_password = false en public.app_users.
   * 3. Si falla el paso 2, lanza error explícito para evitar falsos positivos.
   */
  const changePassword = async (userId, newPassword) => {
    const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
    if (authErr) {
      console.error('Error actualizando contraseña en Supabase Auth:', authErr);
      throw new Error(authErr.message || 'Error al actualizar la contraseña en el servidor de autenticación.');
    }

    const { error: dbErr } = await supabase
      .from('app_users')
      .update({ must_change_password: false })
      .eq('id', userId);

    if (dbErr) {
      console.error('Error actualizando must_change_password en app_users:', dbErr);
      throw new Error('La contraseña fue registrada en el sistema de seguridad, pero la confirmación del perfil no pudo completarse. Por favor pulse nuevamente Guardar para completar el proceso.');
    }

    if (currentProfileRef.current) {
      currentProfileRef.current.mustChangePassword = false;
      saveCachedProfile(currentProfileRef.current);
    }
    setUser(prev => {
      const updated = prev ? { ...prev, mustChangePassword: false } : null;
      if (updated) saveCachedProfile(updated);
      return updated;
    });
    return { success: true };
  };

  /**
   * Creación administrativa segura mediante Supabase Edge Function 'admin-create-user'.
   * La Edge Function genera la identidad en Supabase Auth, asigna la clave temporal
   * e inserta el perfil en public.app_users vinculando auth_user_id.
   */
  const adminCreateUser = async (userData) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          name: userData.name.trim(),
          nationalId: userData.nationalId.trim(),
          role: userData.role,
          mine: userData.mine,
          group: userData.group || 'Grupo 1',
          avatar: userData.avatar || ''
        }
      });

      if (error) {
        let safeMessage = 'Error en el servidor al procesar la solicitud. Por favor intente más tarde.';
        let statusCode = error.context?.status || 500;
        try {
          const body = await error.context?.json();
          if (body?.error) safeMessage = body.error;
        } catch {
          // Mantener mensaje seguro
        }

        if (statusCode === 401) {
          safeMessage = 'Su sesión ha expirado. Por favor inicie sesión nuevamente.';
          await logout();
        } else if (statusCode === 403) {
          safeMessage = 'Acceso denegado: solo administradores pueden realizar esta acción.';
        } else if (statusCode === 409) {
          safeMessage = 'El número de identificación ya se encuentra registrado.';
        } else if (statusCode === 404) {
          safeMessage = 'El usuario seleccionado ya no existe en el sistema.';
        }

        return { success: false, error: safeMessage, status: statusCode };
      }

      if (data?.success && data.user) {
        const newUser = {
          id: data.user.id,
          nationalId: data.user.nationalId,
          name: data.user.name,
          role: data.user.role,
          mine: data.user.mine,
          group: data.user.group || 'Grupo 1',
          mustChangePassword: data.user.mustChangePassword !== undefined ? data.user.mustChangePassword : true,
          avatar: data.user.avatar || '',
          authUserId: data.user.authUserId,
          createdAt: data.user.createdAt
        };

        setUsersList(prev => [...prev, newUser]);
        return { success: true, user: newUser };
      }

      return { success: false, error: 'Respuesta inesperada del servidor.' };
    } catch (err) {
      console.error('Error al crear usuario mediante Edge Function:', err);
      return { success: false, error: 'Error de conexión al procesar la solicitud.' };
    }
  };

  /**
   * Restablecimiento administrativo de contraseña mediante Edge Function 'admin-reset-password'.
   * Actualiza la clave temporal en Supabase Auth y activa must_change_password = true.
   */
  const resetUserPassword = async (userId) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { target_app_user_id: userId }
      });

      if (error) {
        let safeMessage = 'Error en el servidor al procesar la solicitud. Por favor intente más tarde.';
        let statusCode = error.context?.status || 500;
        try {
          const body = await error.context?.json();
          if (body?.error) safeMessage = body.error;
        } catch {
          // Mantener mensaje seguro
        }

        if (statusCode === 401) {
          safeMessage = 'Su sesión ha expirado. Por favor inicie sesión nuevamente.';
          await logout();
        } else if (statusCode === 403) {
          safeMessage = 'Acceso denegado: solo administradores pueden realizar esta acción.';
        } else if (statusCode === 404) {
          safeMessage = 'El usuario seleccionado ya no existe en el sistema.';
        }

        return { success: false, error: safeMessage, status: statusCode };
      }

      if (data?.success) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, mustChangePassword: true } : u));
        return { success: true, message: data.message };
      }

      return { success: false, error: 'Respuesta inesperada del servidor.' };
    } catch (err) {
      console.error('Error al restablecer contraseña mediante Edge Function:', err);
      return { success: false, error: 'Error de conexión al procesar la solicitud.' };
    }
  };

  const updateUserAvatar = async (userId, newAvatar) => {
    try {
      await supabase.from('app_users').update({ avatar: newAvatar }).eq('id', userId);
      if (user && user.id === userId) {
        setUser(prev => {
          const updated = prev ? { ...prev, avatar: newAvatar } : null;
          if (updated) {
            saveCachedProfile(updated);
            if (currentProfileRef.current) currentProfileRef.current.avatar = newAvatar;
          }
          return updated;
        });
      }
      await loadUsersForAdmin();
    } catch (e) {
      console.error('Error al actualizar avatar:', e);
    }
  };

  /**
   * Eliminación administrativa segura mediante Edge Function 'admin-delete-user'.
   * Elimina la identidad en Supabase Auth y el registro en public.app_users de forma coordinada.
   */
  const deleteUser = async (userId) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { target_app_user_id: userId }
      });

      if (error) {
        let safeMessage = 'No fue posible eliminar el usuario';
        let statusCode = error.context?.status || 500;
        let body = null;
        try {
          body = await error.context?.json();
          if (body?.error) safeMessage = body.error;
        } catch {
          // Mantener mensaje seguro
        }

        if (statusCode === 401) {
          safeMessage = 'No autorizado';
          await logout();
        } else if (statusCode === 403) {
          safeMessage = 'No tienes permisos para realizar esta operación';
        } else if (statusCode === 400) {
          safeMessage = body?.error || 'No fue posible realizar la operación con los datos suministrados';
        } else if (statusCode === 404) {
          safeMessage = 'Usuario no encontrado';
        } else if (statusCode === 405) {
          safeMessage = 'No fue posible realizar la operación';
        } else if (statusCode === 500) {
          safeMessage = 'No fue posible eliminar el usuario';
        }

        return { success: false, error: safeMessage, status: statusCode };
      }

      if (data?.success) {
        setUsersList(prev => prev.filter(u => u.id !== userId));
        return {
          success: true,
          message: data.message || 'Usuario eliminado correctamente',
          targetAppUserId: data.targetAppUserId,
          targetAuthUserId: data.targetAuthUserId
        };
      }

      return { success: false, error: 'Respuesta inesperada del servidor.' };
    } catch (err) {
      console.error('Error al invocar eliminación de usuario mediante Edge Function:', err);
      return { success: false, error: 'Error de conexión al procesar la solicitud.' };
    }
  };

  /**
   * Actualización puntual del perfil de un usuario por parte de un Administrador.
   * Modifica ÚNICAMENTE los campos permitidos del perfil sin sobreescribir auth_user_id
   * ni reescribir toda la tabla con upsert.
   */
  const adminUpdateUserProfile = async (userId, fields) => {
    try {
      const updatePayload = {};
      if (fields.name !== undefined) updatePayload.name = fields.name.trim();
      if (fields.role !== undefined) updatePayload.role = fields.role;
      if (fields.mine !== undefined) updatePayload.mine = fields.mine;
      if (fields.group !== undefined) updatePayload.group_name = fields.group;
      if (fields.group_name !== undefined) updatePayload.group_name = fields.group_name;
      if (fields.avatar !== undefined) updatePayload.avatar = fields.avatar;

      const { error } = await supabase
        .from('app_users')
        .update(updatePayload)
        .eq('id', userId);

      if (error) {
        console.error('Error actualizando perfil en app_users:', error.message);
        throw error;
      }

      if (user && user.id === userId) {
        setUser(prev => {
          const updated = prev ? {
            ...prev,
            ...(updatePayload.name ? { name: updatePayload.name } : {}),
            ...(updatePayload.role ? { role: updatePayload.role } : {}),
            ...(updatePayload.mine ? { mine: updatePayload.mine } : {}),
            ...(updatePayload.group_name ? { group: updatePayload.group_name } : {}),
            ...(updatePayload.avatar !== undefined ? { avatar: updatePayload.avatar } : {})
          } : null;
          if (updated) {
            saveCachedProfile(updated);
            if (currentProfileRef.current) currentProfileRef.current = updated;
          }
          return updated;
        });
      }

      return { success: true };
    } catch (err) {
      console.error('Excepción actualizando perfil de usuario:', err);
      throw err;
    }
  };

  const changeActiveMine = (newMine) => {
    if (user && user.role !== 'Administrador') {
      setActiveMine(user.mine || 'Pribbenow');
    } else {
      setActiveMine(newMine);
    }
  };

  const getTodayISO = () => getOperationalDateISO();
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const isAdmin = user?.role === 'Administrador';

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loadingSession,
      isAdmin,
      login,
      logout,
      changePassword,
      adminCreateUser,
      resetUserPassword,
      adminUpdateUserProfile,
      updateUserAvatar,
      deleteUser,
      usersList,
      setUsersList,
      activeMine,
      setActiveMine: changeActiveMine,
      activeShift,
      setActiveShift,
      selectedDate,
      setSelectedDate,
      getTodayISO
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
