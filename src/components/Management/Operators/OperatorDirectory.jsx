import React, { useState } from 'react';
import OperatorFilters from './OperatorFilters';
import OperatorCardList from './OperatorCardList';
import OperatorTable from './OperatorTable';

export default function OperatorDirectory({
  operators = [],
  onEdit,
  onDelete,
  isAdmin,
  userMine
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mineFilter, setMineFilter] = useState(() => (!isAdmin && userMine ? userMine : 'ALL'));
  const [groupFilter, setGroupFilter] = useState('ALL');

  const filteredOperators = operators.filter(op => {
    const matchSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (op.group && op.group.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        op.mine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMine = mineFilter === 'ALL' || op.mine === mineFilter;
    const matchGroup = groupFilter === 'ALL' || op.group === groupFilter;

    return matchSearch && matchMine && matchGroup;
  });

  return (
    <>
      {/* Controles de Búsqueda y Filtros Responsivos */}
      <OperatorFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        mineFilter={mineFilter}
        onMineFilterChange={setMineFilter}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        isAdmin={isAdmin}
      />

      {/* Vista Móvil: Tarjetas Compactas de Operadores */}
      <OperatorCardList
        operators={filteredOperators}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* Vista Escritorio: Tabla Completa */}
      <OperatorTable
        operators={filteredOperators}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}
