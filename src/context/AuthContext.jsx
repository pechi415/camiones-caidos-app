import React, { createContext, useContext, useState, useEffect } from 'react';
import { getOperationalDateISO } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

const PRESEEDED_USERS = [
  {
    id: 'u1',
    name: 'Alexander Francisco Ramirez Cordoba',
    nationalId: '7574445',
    role: 'Administrador',
    mine: 'El Descanso',
    group: 'Grupo 1',
    password: 'caidos1234',
    mustChangePassword: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'u2',
    name: 'Efrain Tafur',
    nationalId: '1234567',
    role: 'Encargado',
    mine: 'El Descanso',
    group: 'Grupo 1',
    password: 'caidos1234',
    mustChangePassword: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  }
];

export function AuthProvider({ children }) {
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('camiones_all_users');
    if (!saved) return PRESEEDED_USERS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : PRESEEDED_USERS;
    } catch (e) {
      return PRESEEDED_USERS;
    }
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('camiones_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.mine) parsed.mine = parsed.mine.replace(' (PB)', '').replace(' (ED)', '');
      return parsed;
    } catch (e) {
      return null;
    }
  });

  const [activeMine, setActiveMine] = useState(() => {
    const saved = localStorage.getItem('camiones_mine');
    if (!saved) return 'Pribbenow';
    return saved.replace(' (PB)', '').replace(' (ED)', '');
  });

  const [activeShift, setActiveShift] = useState(() => {
    const currentHour = new Date().getHours();
    return (currentHour >= 6 && currentHour < 18) ? 'Diurno' : 'Nocturno';
  });

  // Mapear campos entre Supabase y App
  const mapSupabaseUser = (u) => ({
    id: u.id,
    nationalId: u.national_id,
    name: u.name,
    role: u.role,
    mine: u.mine,
    group: u.group_name || u.group || 'Grupo 1',
    password: u.password,
    mustChangePassword: u.must_change_password !== undefined ? u.must_change_password : true,
    avatar: u.avatar || ''
  });

  const mapAppUserToSupabase = (u) => ({
    id: u.id,
    national_id: u.nationalId,
    name: u.name,
    role: u.role,
    mine: u.mine,
    group_name: u.group,
    password: u.password,
    must_change_password: u.mustChangePassword,
    avatar: u.avatar || ''
  });

  const loadUsersFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('app_users').select('*');
      if (error) {
        console.warn('Error leyendo usuarios de Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mapped = data.map(mapSupabaseUser);
        setUsersList(mapped);
        localStorage.setItem('camiones_all_users', JSON.stringify(mapped));
      } else {
        const seedData = PRESEEDED_USERS.map(mapAppUserToSupabase);
        await supabase.from('app_users').upsert(seedData);
      }
    } catch (err) {
      console.warn('Excepción al conectar con Supabase:', err);
    }
  };

  // Cargar usuarios desde Supabase y escuchar cambios en tiempo real (sin polling)
  useEffect(() => {
    loadUsersFromSupabase();

    const channel = supabase
      .channel('app_users_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => {
        loadUsersFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('camiones_user', JSON.stringify(user));
      if (user.role !== 'Administrador' && user.mine) {
        setActiveMine(user.mine);
      }
    } else {
      localStorage.removeItem('camiones_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('camiones_all_users', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    localStorage.setItem('camiones_mine', activeMine);
  }, [activeMine]);

  const updateUsersListGlobal = async (newList) => {
    setUsersList(newList);
    localStorage.setItem('camiones_all_users', JSON.stringify(newList));
    try {
      const dbPayload = newList.map(mapAppUserToSupabase);
      await supabase.from('app_users').upsert(dbPayload);
      setTimeout(loadUsersFromSupabase, 300);
    } catch (e) {
      console.warn('Error guardando usuario en Supabase:', e);
    }
  };

  const login = (nationalId, inputPassword) => {
    const cleanId = nationalId.trim();
    const foundUser = usersList.find(u => u.nationalId === cleanId);

    if (!foundUser) {
      return { success: false, message: 'El número de identificación no se encuentra registrado.' };
    }

    const expectedPassword = foundUser.password || 'caidos1234';
    if (inputPassword !== expectedPassword) {
      return { success: false, message: 'La contraseña ingresada es incorrecta.' };
    }

    setUser(foundUser);
    setActiveMine(foundUser.mine || 'Pribbenow');
    return {
      success: true,
      mustChangePassword: foundUser.mustChangePassword !== undefined ? foundUser.mustChangePassword : true
    };
  };

  const changePassword = async (userId, newPassword) => {
    const updatedUsers = usersList.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          password: newPassword,
          mustChangePassword: false
        };
      }
      return u;
    });

    await updateUsersListGlobal(updatedUsers);

    if (user && user.id === userId) {
      setUser({
        ...user,
        password: newPassword,
        mustChangePassword: false
      });
    }
  };

  const resetUserPassword = async (userId) => {
    const updatedUsers = usersList.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          password: 'caidos1234',
          mustChangePassword: true
        };
      }
      return u;
    });

    await updateUsersListGlobal(updatedUsers);

    if (user && user.id === userId) {
      setUser({
        ...user,
        password: 'caidos1234',
        mustChangePassword: true
      });
    }
    return true;
  };

  const updateUserAvatar = async (userId, newAvatar) => {
    const updatedUsers = usersList.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          avatar: newAvatar
        };
      }
      return u;
    });

    await updateUsersListGlobal(updatedUsers);

    if (user && user.id === userId) {
      setUser(prev => ({
        ...prev,
        avatar: newAvatar
      }));
    }
  };

  const deleteUser = async (userId) => {
    const updatedUsers = usersList.filter(u => u.id !== userId);
    setUsersList(updatedUsers);
    localStorage.setItem('camiones_all_users', JSON.stringify(updatedUsers));

    try {
      const { error } = await supabase.from('app_users').delete().eq('id', userId);
      if (error) {
        console.error('Error eliminando usuario en Supabase:', error.message);
      } else {
        setTimeout(loadUsersFromSupabase, 300);
      }
    } catch (e) {
      console.warn('Excepción eliminando usuario de Supabase:', e);
    }
  };

  const logout = () => {
    setUser(null);
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
      isAdmin,
      login,
      logout,
      changePassword,
      resetUserPassword,
      updateUserAvatar,
      deleteUser,
      usersList,
      setUsersList: updateUsersListGlobal,
      preseededUsers: PRESEEDED_USERS,
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
