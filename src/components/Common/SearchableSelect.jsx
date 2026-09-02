import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Seleccione un operador...',
  searchPlaceholder = 'Buscar por nombre...',
  disabled = false,
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Enfocar el input de búsqueda automáticamente al abrir
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Buscar operador seleccionado actual
  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  // Normalizador para búsqueda insensible a mayúsculas y tildes
  const normalize = (str) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = normalize(searchTerm);
    return normalize(opt.name).includes(term);
  });

  const handleSelect = (optionId) => {
    if (onChange) {
      onChange(optionId);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        ...style
      }}
      className={className}
    >
      {/* Botón selector principal */}
      <div
        onClick={() => {
          if (!disabled && options.length > 0) {
            setIsOpen(!isOpen);
          }
        }}
        className="glass-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled || options.length === 0 ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          padding: '0 12px',
          height: '42px',
          boxSizing: 'border-box',
          userSelect: 'none',
          borderColor: isOpen ? 'var(--brand-red)' : undefined,
          boxShadow: isOpen ? '0 0 0 2px rgba(229, 46, 46, 0.25)' : undefined,
          transition: 'border-color 0.2s, box-shadow 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <User size={15} color={selectedOption ? 'var(--brand-beige)' : 'rgba(255,255,255,0.4)'} />
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: selectedOption ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
              fontSize: '0.85rem',
              fontWeight: selectedOption ? 600 : 400
            }}
          >
            {selectedOption ? selectedOption.name : options.length === 0 ? 'No hay operadores registrados' : placeholder}
          </span>
        </div>

        <ChevronDown
          size={16}
          color="rgba(255,255,255,0.6)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            marginLeft: '6px'
          }}
        />
      </div>

      {/* Menú flotante desplegable */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'rgba(15, 20, 30, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
            padding: '8px',
            boxSizing: 'border-box',
            animation: 'fadeInDown 0.18s ease-out'
          }}
        >
          {/* Barra de Búsqueda */}
          <div
            style={{
              position: 'relative',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search
              size={15}
              color="rgba(255,255,255,0.5)"
              style={{
                position: 'absolute',
                left: '10px',
                pointerEvents: 'none'
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                height: '36px',
                paddingLeft: '32px',
                paddingRight: searchTerm ? '30px' : '10px',
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--brand-red)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lista de Opciones */}
          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.id) === String(value);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected
                        ? 'rgba(229, 46, 46, 0.2)'
                        : 'transparent',
                      color: isSelected ? 'var(--brand-beige)' : '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span>{opt.name}</span>

                    {isSelected && <Check size={14} color="var(--brand-red)" />}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '16px 8px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.45)'
                }}
              >
                No se encontraron operadores para "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
