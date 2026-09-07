import React, { useState } from 'react';
import UserFilters from './UserFilters';
import UserCardList from './UserCardList';
import UserTable from './UserTable';

export default function UserDirectory({
  users = [],
  onEdit,
  onResetPassword,
  onDelete,
  onAvatarChange,
  isAdmin,
  userMine
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mineFilter, setMineFilter] = useState(() => (!isAdmin && userMine ? userMine : 'ALL'));
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.nationalId && u.nationalId.includes(searchTerm)) ||
                        (u.group && u.group.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchMine = mineFilter === 'ALL' || u.mine === mineFilter;
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchGroup = groupFilter === 'ALL' || u.group === groupFilter;

    return matchSearch && matchMine && matchRole && matchGroup;
  });

  return (
    <>
      {/* Controles de Búsqueda y Filtros Responsivos */}
      <UserFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        mineFilter={mineFilter}
        onMineFilterChange={setMineFilter}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        isAdmin={isAdmin}
      />

      {/* Vista Móvil: Tarjetas Compactas Abreviadas */}
      <UserCardList
        users={filteredUsers}
        onEdit={onEdit}
        onResetPassword={onResetPassword}
        onDelete={onDelete}
        onAvatarChange={onAvatarChange}
      />

      {/* Vista Escritorio: Tabla Completa */}
      <UserTable
        users={filteredUsers}
        onEdit={onEdit}
        onResetPassword={onResetPassword}
        onDelete={onDelete}
        onAvatarChange={onAvatarChange}
      />
    </>
  );
}
