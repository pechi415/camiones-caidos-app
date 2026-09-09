import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getOperationalDateISO } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

const AUTH_DOMAIN = 'camionescaidos.internal';

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
   * Solicita únicamente los campos de perfil necesarios (nunca contraseñas).
   */
  const fetchProfileByAuthId = async (authUserId) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, national_id, name, role, mine, group_name, must_change_password, avatar, auth_user_id')
        .eq('auth_user_id', authUserId)
        .single();

      if (error || !data) {
        console.error('Error al consultar perfil en app_users por auth_user_id:', error);
        return null;
      }

      return {
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
    } catch (err) {
      console.error('Excepción consultando perfil por auth_user_id:', err);
      return null;
    }
  };

  /**
   * Carga el perfil de aplicación deduplicando peticiones en curso y
   * reutilizando el perfil en memoria si ya fue cargado para el mismo auth_user_id.
   */
  const getOrFetchProfile = async (authUserId) => {
    if (!authUserId) return null;

    // Si ya tenemos el perfil de este auth_user_id cargado en memoria, reutilizarlo
    if (currentAuthIdRef.current === authUserId && currentProfileRef.current) {
      return currentProfileRef.current;
    }

    // Si ya existe una petición en curso para este auth_user_id, reutilizar la misma promesa
    if (
      pendingProfilePromiseRef.current &&
      pendingProfilePromiseRef.current.authUserId === authUserId
    ) {
      return pendingProfilePromiseRef.current.promise;
    }

    currentAuthIdRef.current = authUserId;

    const fetchPromise = (async () => {
      try {
        const profile = await fetchProfileByAuthId(authUserId);
        if (profile) {
          currentProfileRef.current = profile;
        }
        return profile;
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

  // 1. Inicialización de sesión oficial y escucha de cambios de Supabase Auth
  useEffect(() => {
    let isMounted = true;

    // Limpieza de almacenamiento obsoleto que almacenaba contraseñas en texto plano
    localStorage.removeItem('camiones_all_users');

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error recuperando sesión de Supabase Auth:', error.message);
        }

        const sessionAuthId = session?.user?.id;
        if (sessionAuthId && isMounted) {
          const profile = await getOrFetchProfile(sessionAuthId);
          if (profile && isMounted) {
            setUser(profile);
            if (profile.mine) {
              setActiveMine(profile.mine.replace(' (PB)', '').replace(' (ED)', ''));
            }
          } else if (isMounted) {
            currentAuthIdRef.current = null;
            currentProfileRef.current = null;
            await supabase.auth.signOut();
            setUser(null);
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
            const profile = await getOrFetchProfile(sessionAuthId);
            if (profile && isMounted) {
              setUser(profile);
              if (profile.mine) {
                setActiveMine(profile.mine.replace(' (PB)', '').replace(' (ED)', ''));
              }
            } else if (isMounted) {
              currentAuthIdRef.current = null;
              currentProfileRef.current = null;
              await supabase.auth.signOut();
              setUser(null);
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

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
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
   * Inicio de sesión híbrido:
   * 1. Intenta Supabase Auth (usuarios migrados).
   * 2. Si el usuario no tiene auth_user_id en BD, aplica fallback legacy.
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

    // Intento 1: Supabase Auth oficial (para usuarios ya migrados)
    let authSuccess = false;
    let authUser = null;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: technicalEmail,
        password: inputPassword
      });

      if (!error && data?.user) {
        authSuccess = true;
        authUser = data.user;
      }
    } catch (err) {
      console.warn('Error intentando login con Supabase Auth:', err);
    }

    if (authSuccess && authUser) {
      const profile = await getOrFetchProfile(authUser.id);
      if (!profile) {
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

    // Intento 2: Fallback temporal exclusivo para usuarios no migrados (auth_user_id IS NULL).
    // NOTA: Este bloque es transitorio y se eliminará al completar la migración de los 21 usuarios a Auth.
    try {
      const { data: legacyUser, error: legacyErr } = await supabase
        .from('app_users')
        .select('id, national_id, name, role, mine, group_name, password, must_change_password, avatar, auth_user_id')
        .eq('national_id', cleanId)
        .maybeSingle();

      if (legacyErr || !legacyUser) {
        return { success: false, message: 'El número de identificación no se encuentra registrado.' };
      }

      // Si el usuario ya está migrado a Auth (auth_user_id != null), NO se admite fallback legacy.
      // Su fallo en signInWithPassword indica contraseña incorrecta.
      if (legacyUser.auth_user_id !== null) {
        return { success: false, message: 'La contraseña ingresada es incorrecta.' };
      }

      // Si aún no está migrado (auth_user_id === null), se valida contra la contraseña histórica
      if (legacyUser.password !== inputPassword) {
        return { success: false, message: 'La contraseña ingresada es incorrecta.' };
      }

      // Login legacy exitoso en memoria
      const legacyProfile = {
        id: legacyUser.id,
        nationalId: legacyUser.national_id,
        name: legacyUser.name,
        role: legacyUser.role,
        mine: legacyUser.mine,
        group: legacyUser.group_name || 'Grupo 1',
        mustChangePassword: legacyUser.must_change_password !== undefined ? legacyUser.must_change_password : false,
        avatar: legacyUser.avatar || '',
        authUserId: null
      };

      setUser(legacyProfile);
      if (legacyProfile.mine) {
        setActiveMine(legacyProfile.mine.replace(' (PB)', '').replace(' (ED)', ''));
      }

      return {
        success: true,
        mustChangePassword: legacyProfile.mustChangePassword === true
      };
    } catch (fallbackErr) {
      console.error('Error durante verificación de fallback legacy:', fallbackErr);
      return { success: false, message: 'No se pudo conectar con el servidor. Verifique su conexión.' };
    }
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
      currentAuthIdRef.current = null;
      currentProfileRef.current = null;
      pendingProfilePromiseRef.current = null;
      setUser(null);
      localStorage.removeItem('camiones_user');
    }
  };

  /**
   * Actualización de contraseña:
   * 1. Actualiza en Supabase Auth mediante updateUser({ password }).
   * 2. Si Auth tiene éxito, actualiza must_change_password = false en public.app_users.
   * 3. Si falla el paso 2, lanza error explícito para evitar falsos positivos.
   */
  const changePassword = async (userId, newPassword) => {
    if (user?.authUserId) {
      // Usuario con cuenta oficial Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
      if (authErr) {
        console.error('Error actualizando contraseña en Supabase Auth:', authErr);
        throw new Error(authErr.message || 'Error al actualizar la contraseña en el servidor de autenticación.');
      }

      const { error: dbErr } = await supabase
        .from('app_users')
        .update({ must_change_password: false })
        .eq('auth_user_id', user.authUserId);

      if (dbErr) {
        console.error('Error actualizando must_change_password en app_users:', dbErr);
        throw new Error('La contraseña fue registrada en el sistema de seguridad, pero la confirmación del perfil no pudo completarse. Por favor pulse nuevamente Guardar para completar el proceso.');
      }

      if (currentProfileRef.current) {
        currentProfileRef.current.mustChangePassword = false;
      }
      setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
      return { success: true };
    } else {
      // Fallback para usuario no migrado
      const { error: dbErr } = await supabase
        .from('app_users')
        .update({ password: newPassword, must_change_password: false })
        .eq('id', userId);

      if (dbErr) {
        console.error('Error actualizando contraseña legacy en app_users:', dbErr);
        throw new Error('Error al actualizar la contraseña en el servidor.');
      }

      setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
      return { success: true };
    }
  };

  /**
   * Restablecimiento de contraseña por Administrador (Fija 'caidos1234' y must_change_password = true)
   */
  const resetUserPassword = async (userId) => {
    try {
      const { error } = await supabase
        .from('app_users')
        .update({ password: 'caidos1234', must_change_password: true })
        .eq('id', userId);

      if (error) throw error;
      await loadUsersForAdmin();
      return true;
    } catch (e) {
      console.error('Error al restablecer contraseña de usuario:', e);
      return false;
    }
  };

  const updateUserAvatar = async (userId, newAvatar) => {
    try {
      await supabase.from('app_users').update({ avatar: newAvatar }).eq('id', userId);
      if (user && user.id === userId) {
        setUser(prev => prev ? { ...prev, avatar: newAvatar } : null);
      }
      await loadUsersForAdmin();
    } catch (e) {
      console.error('Error al actualizar avatar:', e);
    }
  };

  const deleteUser = async (userId) => {
    try {
      const { error } = await supabase.from('app_users').delete().eq('id', userId);
      if (error) {
        console.error('Error eliminando usuario en Supabase:', error.message);
      } else {
        await loadUsersForAdmin();
      }
    } catch (e) {
      console.warn('Excepción eliminando usuario de Supabase:', e);
    }
  };

  const updateUsersListGlobal = async (newList) => {
    setUsersList(newList);
    try {
      const dbPayload = newList.map(u => ({
        id: u.id,
        national_id: u.nationalId,
        name: u.name,
        role: u.role,
        mine: u.mine,
        group_name: u.group,
        must_change_password: u.mustChangePassword,
        avatar: u.avatar || '',
        auth_user_id: u.authUserId || null
      }));
      await supabase.from('app_users').upsert(dbPayload);
    } catch (e) {
      console.warn('Error guardando usuarios en Supabase:', e);
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
      resetUserPassword,
      updateUserAvatar,
      deleteUser,
      usersList,
      setUsersList: updateUsersListGlobal,
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
