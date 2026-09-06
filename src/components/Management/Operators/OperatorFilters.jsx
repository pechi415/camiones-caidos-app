import React from 'react';
import AnimatedSearchInput from '../../Common/AnimatedSearchInput';

export default function OperatorFilters({
  searchTerm,
  onSearchChange,
  mineFilter,
  onMineFilterChange,
  groupFilter,
  onGroupFilterChange,
  isAdmin
}) {
  return (
    <div className="user-filters-container">
      <div className="user-filters-search">
        <AnimatedSearchInput
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholderText="📢 Buscar por nombre del operador, sede o grupo asignado..."
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
          {isAdmin && <option value="ALL">Todas las Sedes</option>}
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
          <option value="ALL">Todos los Grupos</option>
          <option value="Grupo 1">G1</option>
          <option value="Grupo 2">G2</option>
          <option value="Grupo 3">G3</option>
        </select>
      </div>
    </div>
  );
}
