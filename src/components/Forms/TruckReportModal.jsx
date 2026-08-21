import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../context/ReportContext';
import { X, Truck, Save } from 'lucide-react';
import AnimatedInput from '../Common/AnimatedInput';
import { correctTextWithAI } from '../../utils/aiCorrector';
import { getCurrentShiftByTime } from '../../utils/truckUtils';

const SYSTEM_CATEGORIES = [
  'Aire Acondicionado',
  'Compresor de aire',
  'Controles Electricos',
  'Diferencial',
  'Estructura Chasis',
  'Frenos',
  'Llantas',
  'Mando Final',
  'Motor',
  'PTO',
  'PTX "Sistema"',
  'Servicio',
  'Sin Combustible',
  'Sistema de Dirección',
  'Sistema de Enfriamiento',
  'Sistema Hidraulico',
  'Suspension',
  'Tolva',
  'Transmision',
  'VHF "Radio"'
];

// Helper para convertir formato 12h (Ej: "07:30 AM", "02:15 p. m.") o 24h a "HH:mm" para input type="time"
const formatTimeTo24H = (timeStr) => {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  if (/^\d{2}:\d{2}$/.test(str)) return str;

  const cleaned = str.toLowerCase().replace(/\./g, '').trim();
  const isPM = cleaned.includes('pm') || cleaned.includes('p m');
  const isAM = cleaned.includes('am') || cleaned.includes('a m');

  const match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  return '';
};

// Helper para convertir "HH:mm" (Ej: "14:30") a "02:30 PM" para guardar en el estado
const formatTime12H = (time24) => {
  if (!time24) return '';
  const match = time24.match(/^(\d{2}):(\d{2})$/);
  if (!match) return time24;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
};

export default function TruckReportModal({ isOpen, onClose, editingReport, onSuccess }) {
  const { user, activeMine, setActiveMine, setActiveShift, setSelectedDate, getTodayISO } = useAuth();
  const { addReport, editReport, operators } = useReports();

  const [formData, setFormData] = useState({
    truckId: '',
    operatorId: '',
    operatorName: '',
    mine: activeMine,
    shift: getCurrentShiftByTime(),
    reportTime: '',
    actualReturnTime: '',
    systemCategory: SYSTEM_CATEGORIES[0],
    failureDescription: '',
    bayLocation: '',
    status: 'DOWN'
  });

  const [errorMsg, setErrorMsg] = useState('');

  // Operadores filtrados por la mina y el grupo del usuario logeado
  const filteredOperators = operators.filter(op => {
    const targetMine = formData.mine || activeMine;
    const matchMine = !targetMine || op.mine === targetMine;
    const matchGroup = !user?.group || op.group === user?.group;
    return matchMine && matchGroup;
  });

  useEffect(() => {
    if (!isOpen) return;

    if (editingReport) {
      setFormData({
        truckId: editingReport.truckId || '',
        operatorId: editingReport.operatorId || '',
        operatorName: editingReport.operatorName || editingReport.operator || '',
        mine: editingReport.mine || activeMine,
        shift: editingReport.shift || getCurrentShiftByTime(),
        reportTime: editingReport.reportTime || editingReport.downTime || '',
        actualReturnTime: editingReport.actualReturnTime || '',
        systemCategory: editingReport.systemCategory || editingReport.system || SYSTEM_CATEGORIES[0],
        failureDescription: editingReport.failureDescription || editingReport.detail || '',
        bayLocation: editingReport.bayLocation || editingReport.location || '',
        status: editingReport.status || 'DOWN'
      });
      setErrorMsg('');
    } else {
      const now24 = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const nowFormatted = formatTime12H(now24);
      const targetMine = activeMine || user?.mine || 'Pribbenow';
      const calculatedShift = getCurrentShiftByTime();
      const availableOps = operators.filter(op => {
        const matchMine = !targetMine || op.mine === targetMine;
        const matchGroup = !user?.group || op.group === user?.group;
        return matchMine && matchGroup;
      });
      const defaultOp = availableOps[0] || operators[0];

      setFormData({
        truckId: '',
        operatorId: defaultOp?.id || '',
        operatorName: defaultOp?.name || '',
        mine: targetMine,
        shift: calculatedShift,
        reportTime: nowFormatted,
        actualReturnTime: '',
        systemCategory: SYSTEM_CATEGORIES[0],
        failureDescription: '',
        bayLocation: '',
        status: 'DOWN'
      });
      setErrorMsg('');
    }
  }, [editingReport, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOperatorChange = (opId) => {
    const selectedOp = operators.find(op => op.id === opId);
    setFormData(prev => ({
      ...prev,
      operatorId: opId,
      operatorName: selectedOp ? selectedOp.name : ''
    }));
  };

  const handleMineChange = (newMine) => {
    const availableOps = operators.filter(op => {
      const matchMine = op.mine === newMine;
      const matchGroup = !user?.group || op.group === user?.group;
      return matchMine && matchGroup;
    });
    const firstOp = availableOps[0];

    setFormData(prev => ({
      ...prev,
      mine: newMine,
      operatorId: firstOp ? firstOp.id : '',
      operatorName: firstOp ? firstOp.name : ''
    }));
  };

  const handleTruckIdChange = (val) => {
    // Solo permitir números
    const numeric = val.replace(/\D/g, '').slice(0, 4);
    setFormData(prev => ({ ...prev, truckId: numeric }));
    if (numeric && !numeric.startsWith('2')) {
      setErrorMsg('El número del camión debe comenzar con 2 (Ej: 2014, 2305)');
    } else if (numeric && numeric.length < 4) {
      setErrorMsg('El número debe tener exactamente 4 dígitos');
    } else {
      setErrorMsg('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.truckId || formData.truckId.length !== 4 || !formData.truckId.startsWith('2')) {
      setErrorMsg('El número del camión es obligatorio, de 4 dígitos y debe comenzar con 2 (Ej: 2014)');
      return;
    }
    if (!formData.bayLocation || !formData.bayLocation.trim()) {
      setErrorMsg('La ubicación es un campo obligatorio. Indique si está en campo o taller.');
      return;
    }
    if (!formData.failureDescription || !formData.failureDescription.trim()) {
      setErrorMsg('Por favor ingrese la descripción de la falla.');
      return;
    }

    const cleanedData = {
      ...formData,
      failureDescription: correctTextWithAI(formData.failureDescription),
      bayLocation: correctTextWithAI(formData.bayLocation)
    };

    if (editingReport) {
      editReport(editingReport.id, cleanedData);
    } else {
      addReport({
        ...cleanedData,
        reportedBy: user?.name || 'Usuario'
      });
    }

    // Sincronizar la vista activa para que el registro recién creado aparezca de inmediato en pantalla
    if (cleanedData.mine) setActiveMine(cleanedData.mine);
    if (cleanedData.shift) setActiveShift(cleanedData.shift);
    if (setSelectedDate && getTodayISO) setSelectedDate(getTodayISO());
    if (onSuccess) onSuccess();

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: 'var(--glass-border)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--brand-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                {editingReport ? 'Editar Registro de Camión' : 'Registrar Camión Caído'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                Novedad de flota en {formData.mine} - Turno {formData.shift}
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#F87171',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            fontWeight: 600
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Fila 1: Número del Camión y Operador */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Número del Camión *
              </label>
              <AnimatedInput
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                value={formData.truckId}
                onChange={(e) => handleTruckIdChange(e.target.value)}
                placeholderText="📢 Ingrese número de 4 dígitos (Ej: 2014, 2305)..."
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Operador Asignado
              </label>
              <select
                className="glass-input"
                value={formData.operatorId}
                onChange={(e) => handleOperatorChange(e.target.value)}
              >
                {filteredOperators.length > 0 ? (
                  filteredOperators.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))
                ) : (
                  <option value="">No hay operadores registrados</option>
                )}
              </select>
            </div>
          </div>

          {/* Fila 2: Mina y Turno */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Mina {user?.role !== 'Administrador' && '(Asignada por Rol)'}
              </label>
              <select
                className="glass-input"
                value={formData.mine}
                disabled={user?.role !== 'Administrador'}
                onChange={(e) => handleMineChange(e.target.value)}
                style={{
                  opacity: user?.role !== 'Administrador' ? 0.7 : 1,
                  cursor: user?.role !== 'Administrador' ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="Pribbenow">Pribbenow</option>
                <option value="El Descanso">El Descanso</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Turno *
              </label>
              <select
                className="glass-input"
                value={formData.shift}
                disabled={user?.role !== 'Administrador'}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                style={{
                  opacity: user?.role !== 'Administrador' ? 0.75 : 1,
                  cursor: user?.role !== 'Administrador' ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  color: '#FFFFFF'
                }}
              >
                <option value="Diurno">Diurno</option>
                <option value="Nocturno">Nocturno</option>
              </select>
            </div>
          </div>

          {/* Fila 3: Sistema Afectado y Ubicación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Sistema Afectado
              </label>
              <select
                className="glass-input"
                value={formData.systemCategory}
                onChange={(e) => setFormData({ ...formData, systemCategory: e.target.value })}
              >
                {SYSTEM_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Ubicación *
              </label>
              <AnimatedInput
                required
                value={formData.bayLocation}
                onChange={(e) => setFormData({ ...formData, bayLocation: e.target.value })}
                onBlur={(e) => setFormData({ ...formData, bayLocation: correctTextWithAI(e.target.value) })}
                placeholderText="📢 Indique ubicación (Ej: Frente 4, Taller Central, Bahía 3)..."
              />
            </div>
          </div>

          {/* Fila 4: Estado del Equipo y Hora de Reporte */}
          <div style={{ display: 'grid', gridTemplateColumns: formData.status === 'OPERATIVO' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Estado del Equipo
              </label>
              <select
                className="glass-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  color: formData.status === 'DOWN' ? 'var(--status-down)' : 'var(--status-operativo)',
                  fontWeight: 700
                }}
              >
                <option value="DOWN">🔴 DOWN (Fuera de Servicio)</option>
                <option value="OPERATIVO">🟢 OPERATIVO (Recuperado)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Hora de Reporte de Falla *
              </label>
              <input
                type="time"
                className="glass-input"
                required
                value={formatTimeTo24H(formData.reportTime)}
                onChange={(e) => setFormData({ ...formData, reportTime: formatTime12H(e.target.value) })}
              />
            </div>

            {formData.status === 'OPERATIVO' && (
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--status-operativo)', marginBottom: '6px', display: 'block' }}>
                  Hora de Salida *
                </label>
                <input
                  type="time"
                  className="glass-input"
                  required
                  value={formatTimeTo24H(formData.actualReturnTime || formData.reportTime)}
                  onChange={(e) => setFormData({ ...formData, actualReturnTime: formatTime12H(e.target.value) })}
                />
              </div>
            )}
          </div>

          {/* Fila 5: Descripción de la Falla & Observaciones con Corrector IA Automático */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Descripción de la Falla & Observaciones *
            </label>

            <textarea
              className="glass-input"
              rows={3}
              placeholder="Detalle la falla reportada y observaciones relevantes..."
              value={formData.failureDescription}
              onChange={(e) => setFormData({ ...formData, failureDescription: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, failureDescription: correctTextWithAI(e.target.value) })}
              required
              style={{ resize: 'vertical' }}
            />
          </div>


          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn-glass">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} /> {editingReport ? 'Guardar Cambios' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
