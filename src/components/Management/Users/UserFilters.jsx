import React from 'react';
import AnimatedSearchInput from '../../Common/AnimatedSearchInput';

export default function UserFilters({
  searchTerm,
  onSearchChange,
  mineFilter,
  onMineFilterChange,
  groupFilter,
  onGroupFilterChange,
  roleFilter,
  onRoleFilterChange,
  isAdmin
}) {
  return (
    <div className="user-filters-container">
      <div className="user-filters-search">
        <AnimatedSearchInput
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholderText="📢 Buscar por nombre de usuario, cédula o grupo asignado..."
        />
      </div>

      <div className="user-filters-selects">
        {/* Filtro Sede */}
        <select
          className="glass-input"
          value={mineFilter}
          disabled={!isAdmin}
          onChange={(e) => onMineFilterChange(e.target.value)}
          style={{
            height: '40px',
            fontSize: '0.85rem',
            opacity: !isAdmin ? 0.7 : 1,
            cursor: !isAdmin ? 'not-allowed' : 'pointer'
          }}
        >
          {isAdmin && <option value="ALL">Sedes</option>}
          <option value="Pribbenow">PB (Pribbenow)</option>
          <option value="El Descanso">ED (El Descanso)</option>
        </select>

        {/* Filtro Grupo */}
        <select
          className="glass-input"
          value={groupFilter}
          onChange={(e) => onGroupFilterChange(e.target.value)}
          style={{ height: '40px', fontSize: '0.85rem' }}
        >
          <option value="ALL">Grupos</option>
          <option value="Grupo 1">G1</option>
          <option value="Grupo 2">G2</option>
          <option value="Grupo 3">G3</option>
        </select>

        {/* Filtro Rol */}
        <select
          className="glass-input"
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          style={{ height: '40px', fontSize: '0.85rem' }}
        >
          <option value="ALL">Roles</option>
          <option value="Administrador">Admin</option>
          <option value="Encargado">Encargado</option>
          <option value="Digitador">Digitador</option>
        </select>
      </div>
    </div>
  );
}
