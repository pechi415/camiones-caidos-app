import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLocalDateISO, getOperationalDateISO } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ReportContext = createContext();

const INITIAL_TRUCK_REPORTS = [];

// Mapeos de Reportes (Soporta nombres de Supabase y alias de la UI)
const mapSupabaseReport = (r) => {
  const operatorVal = r.operator || r.operatorName || '';
  const systemVal = r.system || r.systemCategory || '';
  const detailVal = r.detail || r.failureDescription || '';
  const locationVal = r.location || r.bayLocation || '';
  const downTimeVal = r.down_time || r.downTime || r.reportTime || '';

  return {
    id: r.id,
    truckId: r.truck_id || r.truckId,
    mine: r.mine,
    shift: r.shift,
    operatorId: r.operator_id || '',
    operator: operatorVal,
    operatorName: operatorVal,
    system: systemVal,
    systemCategory: systemVal,
    detail: detailVal,
    failureDescription: detailVal,
    location: locationVal,
    bayLocation: locationVal,
    status: r.status,
    downTime: downTimeVal,
    reportTime: downTimeVal,
    estimatedReturnTime: r.estimated_return_time || r.estimatedReturnTime || '',
    actualReturnTime: r.actual_return_time || r.actualReturnTime || null,
    date: r.date,
    createdAt: r.created_at || r.createdAt,
    updatedAt: r.updated_at || r.updatedAt
  };
};

const mapAppReportToSupabase = (r) => ({
  id: r.id,
  truck_id: r.truckId,
  mine: r.mine,
  shift: r.shift || 'Diurno',
  operator_id: r.operatorId || null,
  operator: r.operatorName || r.operator || '',
  system: r.systemCategory || r.system || '',
  detail: r.failureDescription || r.detail || '',
  location: r.bayLocation || r.location || '',
  status: r.status || 'DOWN',
  down_time: r.reportTime || r.downTime || '',
  estimated_return_time: r.estimatedReturnTime || '',
  actual_return_time: r.actualReturnTime || null,
  date: r.date || getOperationalDateISO(),
  created_at: r.createdAt || new Date().toISOString(),
  updated_at: r.updatedAt || new Date().toISOString()
});

// Mapeos de Operadores
const mapSupabaseOperator = (op) => ({
  id: op.id,
  name: op.name,
  mine: op.mine,
  group: op.group_name || op.group || 'Grupo 1',
  status: op.status || 'Activo',
  avatar: op.avatar || ''
});

const mapAppOperatorToSupabase = (op) => ({
  id: op.id,
  name: op.name,
  mine: op.mine,
  group_name: op.group || 'Grupo 1',
  status: op.status || 'Activo',
  avatar: op.avatar || ''
});


export function ReportProvider({ children }) {
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('camiones_reports');
    if (!saved) return INITIAL_TRUCK_REPORTS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_TRUCK_REPORTS;
    } catch (e) {
      return INITIAL_TRUCK_REPORTS;
    }
  });

  const [operators, setOperators] = useState(() => {
    const saved = localStorage.getItem('camiones_operators');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [];
      }
      return parsed;
    } catch (e) {
      return [];
    }
  });

  const { user, loadingSession } = useAuth();
  const [dbStatus, setDbStatus] = useState('connecting'); // connecting | online | error
  const isSyncingRef = React.useRef(false);
  const currentAuthIdRef = React.useRef(user?.authUserId || null);

  // Helper con timeout de 12 segundos para evitar falsas alarmas en redes móviles
  const withTimeout = (promise, ms = 12000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión a la nube')), ms))
    ]);
  };

  // Función de carga y fusión de datos desde Supabase (solo para usuarios autenticados)
  const loadInitialData = async () => {
    const activeAuthId = currentAuthIdRef.current;
    if (!activeAuthId) {
      // Guarda: No realizar consultas de datos protegidos si no hay usuario autenticado
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      // Cargar Reportes con timeout de 12s
      const repPromise = supabase
        .from('truck_reports')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: dbReports, error: repErr } = await withTimeout(repPromise, 12000);

      // Descartar si el usuario cambió o cerró sesión mientras la petición estaba en vuelo
      if (currentAuthIdRef.current !== activeAuthId) return;

      if (repErr) {
        console.warn('Error leyendo truck_reports de Supabase:', repErr.message);
        setDbStatus('error');
      } else if (Array.isArray(dbReports)) {
        setDbStatus('online');
        const mappedReps = dbReports.map(mapSupabaseReport);
        setReports(mappedReps);
        localStorage.setItem('camiones_reports', JSON.stringify(mappedReps));
      }

      // Cargar Operadores directamente desde Supabase (Fuente Primaria)
      const opsPromise = supabase.from('operators').select('*');
      const { data: dbOps, error: opErr } = await withTimeout(opsPromise, 12000).catch(() => ({ data: null, error: true }));

      if (currentAuthIdRef.current !== activeAuthId) return;

      if (!opErr && Array.isArray(dbOps) && dbOps.length > 0) {
        // Fuente Primaria: Supabase centralizado (excluir bajas lógicas y ordenar alfabéticamente)
        const activeOps = dbOps
          .map(mapSupabaseOperator)
          .filter(op => op.status !== 'Eliminado')
          .sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim(), 'es', { sensitivity: 'base' }));

        setOperators(activeOps);
        localStorage.setItem('camiones_operators', JSON.stringify(activeOps));
      } else if (opErr) {
        console.warn('Error o timeout leyendo operators de Supabase:', opErr.message || opErr);
      } else if (Array.isArray(dbOps) && dbOps.length === 0) {
        console.warn('Supabase retornó 0 operadores; conservando catálogo en caché/fallback');
      }
    } catch (err) {
      console.warn('Excepción o timeout cargando datos desde Supabase:', err.message);
      setDbStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  };

  // Sincronizar ciclo de vida de datos con Supabase Auth
  useEffect(() => {
    if (loadingSession) return;

    const authId = user?.authUserId || null;
    currentAuthIdRef.current = authId;

    if (!authId) {
      // Usuario no autenticado: limpiar estado de reportes para no filtrar datos a otra sesión
      setReports([]);
      localStorage.removeItem('camiones_reports');
      setDbStatus('connecting');
      return;
    }

    // Usuario autenticado: cargar reportes y operadores con JWT válido
    loadInitialData();

    // Suscripción Realtime para Reportes (aislada por sesión activa)
    const reportsChannel = supabase
      .channel(`public:truck_reports:${authId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_reports' }, () => {
        loadInitialData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setDbStatus('online');
        }
      });

    // Suscripción Realtime para Operadores (aislada por sesión activa)
    const operatorsChannel = supabase
      .channel(`public:operators:${authId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operators' }, () => {
        loadInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(operatorsChannel);
    };
  }, [user?.authUserId, loadingSession]);

  useEffect(() => {
    if (user?.authUserId) {
      localStorage.setItem('camiones_reports', JSON.stringify(reports));
    }
  }, [reports, user?.authUserId]);

  useEffect(() => {
    if (user?.authUserId) {
      localStorage.setItem('camiones_operators', JSON.stringify(operators));
    }
  }, [operators, user?.authUserId]);

  // Operaciones de Reportes (Camiones Caídos)
  const addReport = async (newReportData) => {
    const todayStr = getOperationalDateISO();
    const nowIso = new Date().toISOString();
    const newReport = {
      id: `REP-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString().slice(-4)}`,
      status: 'DOWN',
      actualReturnTime: null,
      date: newReportData.date || todayStr,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...newReportData
    };

    // Confirmar persistencia antes de incorporar el reporte a la interfaz y la caché.
    const { data, error } = await supabase.from('truck_reports')
      .insert([mapAppReportToSupabase(newReport)])
      .select('*').single();
    if (error) throw error;
    if (!data) throw new Error('No se pudo confirmar el guardado del reporte.');
    const savedReport = mapSupabaseReport(data);
    setReports(prev => [savedReport, ...prev.filter(rep => rep.id !== savedReport.id)]);
    return savedReport;
  };

  const updateReportStatus = async (id, newStatus, returnTime = null) => {
    const current = reports.find(rep => rep.id === id);
    if (!current) throw new Error('El reporte ya no está disponible. Actualice la lista.');
    if (!['DOWN', 'OPERATIVO'].includes(newStatus)) throw new Error('Estado no válido.');
    if (current.status === newStatus) throw new Error('El reporte ya tiene ese estado. Actualice la lista.');

    // Actualizar solo el estado y su hora; no sobrescribir otros datos del reporte.
    const { data, error } = await supabase.from('truck_reports')
      .update({
        status: newStatus,
        actual_return_time: newStatus === 'OPERATIVO'
          ? (returnTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          : current.actualReturnTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', current.status)
      .select('*').single();
    if (error) throw error;
    if (!data) throw new Error('No se pudo confirmar el cambio. Actualice la lista.');
    const savedReport = mapSupabaseReport(data);
    setReports(prev => prev.map(rep => rep.id === id ? savedReport : rep));
    return savedReport;
  };

  const editReport = async (id, updatedFields) => {
    const current = reports.find(rep => rep.id === id);
    if (!current) throw new Error('El reporte ya no está disponible. Actualice la lista.');
    const payload = mapAppReportToSupabase({ ...current, ...updatedFields, updatedAt: new Date().toISOString() });
    const { data, error } = await supabase.from('truck_reports')
      .update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    if (!data) throw new Error('No se pudo confirmar la edición del reporte.');
    const savedReport = mapSupabaseReport(data);
    setReports(prev => prev.map(rep => rep.id === id ? savedReport : rep));
    return savedReport;
  };

  const deleteReport = async (id) => {
    setReports(prev => prev.filter(rep => rep.id !== id));
    try {
      const { error } = await supabase.from('truck_reports').delete().eq('id', id);
      if (!error) {
        setTimeout(loadInitialData, 200);
      }
    } catch (e) {
      console.warn('Error eliminando reporte en Supabase:', e);
    }
  };

  // Operaciones de Operadores
  const addOperator = async (operatorData) => {
    const newOp = {
      id: `OP-${Math.floor(500 + Math.random() * 400)}-${Date.now().toString().slice(-4)}`,
      status: 'Activo',
      ...operatorData
    };
    setOperators(prev => [...prev, newOp]);

    try {
      const { error } = await supabase.from('operators').upsert([mapAppOperatorToSupabase(newOp)]);
      if (!error) {
        setTimeout(loadInitialData, 200);
      }
    } catch (e) {
      console.warn('Error insertando operador en Supabase:', e);
    }
  };

  const editOperator = async (id, updatedFields) => {
    let updatedTarget = null;
    setOperators(prev => prev.map(op => {
      if (op.id === id) {
        updatedTarget = { ...op, ...updatedFields };
        return updatedTarget;
      }
      return op;
    }));

    if (updatedTarget) {
      try {
        const { error } = await supabase.from('operators').upsert([mapAppOperatorToSupabase(updatedTarget)]);
        if (!error) {
          setTimeout(loadInitialData, 200);
        }
      } catch (e) {
        console.warn('Error editando operador en Supabase:', e);
      }
    }
  };

  const deleteOperator = async (id) => {
    const targetOp = operators.find(op => op.id === id);
    setOperators(prev => prev.filter(op => op.id !== id));
    try {
      if (targetOp) {
        await supabase.from('operators').upsert([{
          id: targetOp.id,
          name: targetOp.name,
          mine: targetOp.mine,
          group_name: targetOp.group || 'Grupo 1',
          status: 'Eliminado'
        }]);
      }
      await supabase.from('operators').delete().eq('id', id);
      setTimeout(loadInitialData, 200);
    } catch (e) {
      console.warn('Error eliminando operador en Supabase:', e);
    }
  };

  return (
    <ReportContext.Provider value={{
      reports,
      addReport,
      updateReportStatus,
      editReport,
      deleteReport,
      operators,
      addOperator,
      editOperator,
      deleteOperator,
      dbStatus,
      refreshData: loadInitialData
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReports() {
  return useContext(ReportContext);
}
