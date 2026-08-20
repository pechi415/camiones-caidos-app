import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, PlusCircle, Users, UserCheck, FileSpreadsheet, LogOut, Truck, History } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenNewReport, onOpenExport }) {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Equipos', icon: LayoutDashboard },
    { id: 'history', label: 'Historial General', icon: History },
    { id: 'operators', label: 'Gestión de Operadores', icon: UserCheck, adminOnly: true },
    { id: 'users', label: 'Gestión de Usuarios', icon: Users, adminOnly: true },
  ];

  return (
    <aside className="glass-panel hidden-mobile" style={{
      width: '260px',
      margin: '16px 0 16px 16px',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: 'calc(100vh - 100px)',
      position: 'sticky',
      top: '90px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Action Button: Registrar Camión Caído */}
        <button
          onClick={onOpenNewReport}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '14px',
            marginBottom: '16px',
            fontSize: '0.95rem'
          }}
        >
          <PlusCircle size={18} /> Registrar Camión Caído
        </button>

        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', paddingLeft: '10px', marginBottom: '4px' }}>
          Menú Principal
        </div>

        {navItems.map(item => {
          if (item.adminOnly && user.role !== 'Administrador') return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: isActive ? '1px solid rgba(229, 46, 46, 0.4)' : '1px solid transparent',
                background: isActive ? 'rgba(229, 46, 46, 0.18)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={18} color={isActive ? '#E52E2E' : 'rgba(255, 255, 255, 0.7)'} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Export Section & Footer */}
      <div>
        <button
          onClick={onOpenExport}
          className="btn-beige"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px',
            marginBottom: '12px'
          }}
        >
          <FileSpreadsheet size={18} /> Cierre de Turno / PDF
        </button>

        <div style={{
          padding: '12px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: 'var(--glass-border)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--brand-beige)', fontWeight: 600 }}>
            Mina {user.mine}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
            Servidor Local & PWA Sync OK
          </div>
        </div>
      </div>
    </aside>
  );
}
