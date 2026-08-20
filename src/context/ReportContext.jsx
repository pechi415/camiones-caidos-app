import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_OPERATORS_808 } from '../data/operatorsList';
import { getLocalDateISO, getOperationalDateISO } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';

const ReportContext = createContext();

const INITIAL_TRUCK_REPORTS = [];
const INITIAL_OPERATORS = INITIAL_OPERATORS_808;

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
  status: op.status || 'Activo'
});

const mapAppOperatorToSupabase = (op) => ({
  id: op.id,
  name: op.name,
  mine: op.mine,
  group_name: op.group || 'Grupo 1',
  status: op.status || 'Activo'
});

// Helper para fusionar lista inicial de 808 operadores con registros de Supabase
const mergeOperators = (baseList, dbOps) => {
  const map = new Map();
  if (Array.isArray(baseList)) {
    baseList.forEach(op => map.set(op.id, op));
  }
  if (Array.isArray(dbOps)) {
    dbOps.forEach(raw => {
      const mapped = mapSupabaseOperator(raw);
      if (mapped.status === 'Eliminado') {
        map.delete(mapped.id);
      } else {
        map.set(mapped.id, mapped);
      }
    });
  }
  return Array.from(map.values());
};

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
    if (!saved) return INITIAL_OPERATORS;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length < 100) {
        return INITIAL_OPERATORS;
      }
      return parsed;
    } catch (e) {
      return INITIAL_OPERATORS;
    }
  });

  const [dbStatus, setDbStatus] = useState('connecting'); // connecting | online | error
  const isSyncingRef = React.useRef(false);

  // Helper con timeout de 12 segundos para evitar falsas alarmas en redes móviles
  const withTimeout = (promise, ms = 12000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión a la nube')), ms))
    ]);
  };

  // Función de carga y fusión de datos desde Supabase
  const loadInitialData = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      // Cargar Reportes con timeout de 12s
      const repPromise = supabase
        .from('truck_reports')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: dbReports, error: repErr } = await withTimeout(repPromise, 12000);

      if (repErr) {
        console.warn('Error leyendo truck_reports de Supabase:', repErr.message);
        setDbStatus('error');
      } else if (Array.isArray(dbReports)) {
        setDbStatus('online');
        const mappedReps = dbReports.map(mapSupabaseReport);
        setReports(mappedReps);
        localStorage.setItem('camiones_reports', JSON.stringify(mappedReps));
      }

      // Cargar Operadores (Fusionando con la base de 808 sin borrado masivo)
      const opsPromise = supabase.from('operators').select('*');
      const { data: dbOps, error: opErr } = await withTimeout(opsPromise, 12000).catch(() => ({ data: null, error: true }));
      if (!opErr && Array.isArray(dbOps)) {
        const mergedOps = mergeOperators(INITIAL_OPERATORS, dbOps);
        setOperators(mergedOps);
        localStorage.setItem('camiones_operators', JSON.stringify(mergedOps));
      }
    } catch (err) {
      console.warn('Excepción o timeout cargando datos desde Supabase:', err.message);
      setDbStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  };

  // Cargar al montar y activar WebSockets Realtime en tiempo real
  useEffect(() => {
    loadInitialData();

    // Suscripción Realtime para Reportes
    const reportsChannel = supabase
      .channel('public:truck_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_reports' }, () => {
        loadInitialData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setDbStatus('online');
        }
      });

    // Suscripción Realtime para Operadores
    const operatorsChannel = supabase
      .channel('public:operators')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operators' }, () => {
        loadInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(operatorsChannel);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('camiones_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('camiones_operators', JSON.stringify(operators));
  }, [operators]);

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

    setReports(prev => [newReport, ...prev]);

    try {
      const payload = mapAppReportToSupabase(newReport);
      const { error } = await supabase.from('truck_reports').upsert([payload]);
      if (error) {
        console.error('Error guardando en Supabase:', error.message);
      } else {
        setTimeout(loadInitialData, 200);
      }
    } catch (e) {
      console.warn('Excepción insertando reporte en Supabase:', e);
    }
    return newReport;
  };

  const updateReportStatus = async (id, newStatus, returnTime = null) => {
    let updatedTarget = null;

    setReports(prev => prev.map(rep => {
      if (rep.id === id) {
        updatedTarget = {
          ...rep,
          status: newStatus,
          actualReturnTime: newStatus === 'OPERATIVO' ? (returnTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : rep.actualReturnTime,
          updatedAt: new Date().toISOString()
        };
        return updatedTarget;
      }
      return rep;
    }));

    if (updatedTarget) {
      try {
        const { error } = await supabase.from('truck_reports').upsert([mapAppReportToSupabase(updatedTarget)]);
        if (error) {
          console.error('Error actualizando en Supabase:', error.message);
        } else {
          setTimeout(loadInitialData, 200);
        }
      } catch (e) {
        console.warn('Error actualizando estado en Supabase:', e);
      }
    }
  };

  const editReport = async (id, updatedFields) => {
    let updatedTarget = null;

    setReports(prev => prev.map(rep => {
      if (rep.id === id) {
        updatedTarget = { ...rep, ...updatedFields, updatedAt: new Date().toISOString() };
        return updatedTarget;
      }
      return rep;
    }));

    if (updatedTarget) {
      try {
        const { error } = await supabase.from('truck_reports').upsert([mapAppReportToSupabase(updatedTarget)]);
        if (error) {
          console.error('Error editando en Supabase:', error.message);
        } else {
          setTimeout(loadInitialData, 200);
        }
      } catch (e) {
        console.warn('Error editando reporte en Supabase:', e);
      }
    }
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
