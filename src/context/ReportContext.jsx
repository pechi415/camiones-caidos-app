import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_OPERATORS_808 } from '../data/operatorsList';
import { getLocalDateISO, getOperationalDateISO } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';

const ReportContext = createContext();

const INITIAL_TRUCK_REPORTS = [];
const INITIAL_OPERATORS = INITIAL_OPERATORS_808;

// Mapeos de Reportes
const mapSupabaseReport = (r) => ({
  id: r.id,
  truckId: r.truck_id || r.truckId,
  mine: r.mine,
  shift: r.shift,
  operator: r.operator,
  system: r.system,
  detail: r.detail,
  location: r.location,
  status: r.status,
  downTime: r.down_time || r.downTime,
  estimatedReturnTime: r.estimated_return_time || r.estimatedReturnTime,
  actualReturnTime: r.actual_return_time || r.actualReturnTime,
  date: r.date,
  createdAt: r.created_at || r.createdAt,
  updatedAt: r.updated_at || r.updatedAt
});

const mapAppReportToSupabase = (r) => ({
  id: r.id,
  truck_id: r.truckId,
  mine: r.mine,
  shift: r.shift || 'Diurno',
  operator: r.operator || '',
  system: r.system || '',
  detail: r.detail || '',
  location: r.location || '',
  status: r.status || 'DOWN',
  down_time: r.downTime || '',
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

  // Cargar Reportes y Operadores desde Supabase y activar Realtime
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Cargar Reportes
        const { data: dbReports, error: repErr } = await supabase.from('truck_reports').select('*').order('created_at', { ascending: false });
        if (!repErr && dbReports && dbReports.length > 0) {
          const mappedReps = dbReports.map(mapSupabaseReport);
          setReports(mappedReps);
          localStorage.setItem('camiones_reports', JSON.stringify(mappedReps));
        }

        // Cargar Operadores
        const { data: dbOps, error: opErr } = await supabase.from('operators').select('*');
        if (!opErr && dbOps && dbOps.length > 0) {
          const mappedOps = dbOps.map(mapSupabaseOperator);
          setOperators(mappedOps);
          localStorage.setItem('camiones_operators', JSON.stringify(mappedOps));
        }
      } catch (err) {
        console.warn('Excepción cargando datos desde Supabase:', err);
      }
    }

    loadInitialData();

    // Suscripción Realtime para Reportes
    const reportsChannel = supabase
      .channel('truck_reports_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_reports' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const updatedRep = mapSupabaseReport(payload.new);
          setReports(prev => {
            const exists = prev.some(r => r.id === updatedRep.id);
            const newReps = exists ? prev.map(r => (r.id === updatedRep.id ? updatedRep : r)) : [updatedRep, ...prev];
            localStorage.setItem('camiones_reports', JSON.stringify(newReps));
            return newReps;
          });
        } else if (payload.eventType === 'DELETE') {
          setReports(prev => {
            const newReps = prev.filter(r => r.id !== payload.old.id);
            localStorage.setItem('camiones_reports', JSON.stringify(newReps));
            return newReps;
          });
        }
      })
      .subscribe();

    // Suscripción Realtime para Operadores
    const operatorsChannel = supabase
      .channel('operators_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operators' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const updatedOp = mapSupabaseOperator(payload.new);
          setOperators(prev => {
            const exists = prev.some(op => op.id === updatedOp.id);
            const newOps = exists ? prev.map(op => (op.id === updatedOp.id ? updatedOp : op)) : [...prev, updatedOp];
            localStorage.setItem('camiones_operators', JSON.stringify(newOps));
            return newOps;
          });
        } else if (payload.eventType === 'DELETE') {
          setOperators(prev => {
            const newOps = prev.filter(op => op.id !== payload.old.id);
            localStorage.setItem('camiones_operators', JSON.stringify(newOps));
            return newOps;
          });
        }
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
      await supabase.from('truck_reports').insert([mapAppReportToSupabase(newReport)]);
    } catch (e) {
      console.warn('Error insertando reporte en Supabase:', e);
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
        await supabase.from('truck_reports').update({
          status: updatedTarget.status,
          actual_return_time: updatedTarget.actualReturnTime,
          updated_at: updatedTarget.updatedAt
        }).eq('id', id);
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
        await supabase.from('truck_reports').update(mapAppReportToSupabase(updatedTarget)).eq('id', id);
      } catch (e) {
        console.warn('Error editando reporte en Supabase:', e);
      }
    }
  };

  const deleteReport = async (id) => {
    setReports(prev => prev.filter(rep => rep.id !== id));
    try {
      await supabase.from('truck_reports').delete().eq('id', id);
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
      await supabase.from('operators').insert([mapAppOperatorToSupabase(newOp)]);
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
        await supabase.from('operators').update(mapAppOperatorToSupabase(updatedTarget)).eq('id', id);
      } catch (e) {
        console.warn('Error editando operador en Supabase:', e);
      }
    }
  };

  const deleteOperator = async (id) => {
    setOperators(prev => prev.filter(op => op.id !== id));
    try {
      await supabase.from('operators').delete().eq('id', id);
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
      deleteOperator
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReports() {
  return useContext(ReportContext);
}
