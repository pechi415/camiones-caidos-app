import React, { useState } from 'react';
import useModalScrollLock from '../../hooks/useModalScrollLock';
import { useReports } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserCheck, UserPlus } from '@phosphor-icons/react';
import { autoCapitalizeName } from '../../utils/aiCorrector';
import OperatorDeleteModal from './Operators/OperatorDeleteModal';
import OperatorAddForm from './Operators/OperatorAddForm';
import OperatorEditModal from './Operators/OperatorEditModal';
import OperatorDirectory from './Operators/OperatorDirectory';
import { supabase } from '../../lib/supabase';

export default function OperatorManager() {
  const { operators, addOperator, editOperator, deleteOperator } = useReports();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOp, setEditingOp] = useState(null);
  const [deleteConfirmOp, setDeleteConfirmOp] = useState(null);

  useModalScrollLock(Boolean(editingOp || deleteConfirmOp));

  const handleAddSubmit = async (opData) => {
    if (!opData?.name?.trim()) return;
    const cleanName = autoCapitalizeName(opData.name);
    const opId = `OP-${Math.floor(500 + Math.random() * 400)}-${Date.now().toString().slice(-4)}`;
    const opPayload = {
      id: opId,
      name: cleanName,
      mine: opData.mine,
      group: opData.group || 'Grupo 1',
      status: 'Activo'
    };

    try {
      const { error } = await supabase.from('operators').upsert([{
        id: opId,
        name: cleanName,
        mine: opPayload.mine,
        group_name: opPayload.group,
        status: 'Activo'
      }]);

      if (error) {
        console.error('Error persistiendo operador en Supabase:', error);
        toast.error('No fue posible registrar el operador.');
        return;
      }

      addOperator(opPayload);
      setShowAddForm(false);
      toast.success(`Operador ${cleanName} registrado correctamente.`);
    } catch (err) {
      console.error('Error al registrar operador:', err);
      toast.error('Error inesperado al registrar el operador.');
    }
  };

  const handleEditSave = async (updatedData) => {
    if (!updatedData || !updatedData.name?.trim()) return;
    const cleanName = autoCapitalizeName(updatedData.name);

    try {
      const { error } = await supabase.from('operators').upsert([{
        id: updatedData.id,
        name: cleanName,
        mine: updatedData.mine,
        group_name: updatedData.group || 'Grupo 1',
        status: editingOp?.status || 'Activo'
      }]);

      if (error) {
        console.error('Error al actualizar operador en Supabase:', error);
        toast.error('No fue posible actualizar el operador.');
        return;
      }

      editOperator(updatedData.id, {
        name: cleanName,
        mine: updatedData.mine,
        group: updatedData.group || 'Grupo 1'
      });
      setEditingOp(null);
      toast.success(`Operador ${cleanName} actualizado correctamente.`);
    } catch (err) {
      console.error('Excepción al actualizar operador en Supabase:', err);
      toast.error('Error inesperado al actualizar el operador.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmOp) return;
    const opName = deleteConfirmOp.name;
    try {
      await deleteOperator(deleteConfirmOp.id);
      setDeleteConfirmOp(null);
      toast.success(`Operador ${opName} eliminado correctamente.`);
    } catch (err) {
      console.error('Error al eliminar operador:', err);
      setDeleteConfirmOp(null);
      toast.error('No fue posible eliminar el operador.');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header */}
      <div className="management-header-container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck color="var(--brand-red)" size={24} weight="duotone" /> Gestión de Operadores
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            Listado general de operadores de transporte de acarreo en minas Pribbenow y El Descanso
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingOp(null);
          }}
          className="btn-primary management-header-btn"
          style={{ fontSize: '0.85rem' }}
        >
          <UserPlus size={16} weight="duotone" /> {showAddForm ? 'Cancelar' : 'Registrar Nuevo Operador'}
        </button>
      </div>

      {/* Formulario Agregar Nuevo Operador */}
      {showAddForm && (
        <OperatorAddForm
          onAddOperator={handleAddSubmit}
          defaultMine={user?.mine || 'Pribbenow'}
        />
      )}

      {/* Directorio de Operadores: Filtros, Vista Móvil y Tabla Escritorio */}
      <OperatorDirectory
        operators={operators}
        onEdit={setEditingOp}
        onDelete={setDeleteConfirmOp}
        isAdmin={isAdmin}
        userMine={user?.mine}
      />

      {/* Modal Editar Operador */}
      <OperatorEditModal
        operator={editingOp}
        onClose={() => setEditingOp(null)}
        onSave={handleEditSave}
      />

      {/* Modal Confirmación de Eliminación de Operador */}
      <OperatorDeleteModal
        operator={deleteConfirmOp}
        onClose={() => setDeleteConfirmOp(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
