import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function AnimatedSearchInput({
  value,
  onChange,
  placeholderText = "📢 Ingrese criterio de búsqueda...",
  style = {},
  inputStyle = {}
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '10px', ...style }}>
      <Search size={16} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
      <input
        type="text"
        className="glass-input"
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ paddingLeft: '36px', height: '40px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', ...inputStyle }}
      />

      {!value && !isFocused && (
        <div className="marquee-container" style={{ position: 'absolute', left: '36px', right: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }}>
          <span className="marquee-content" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            {placeholderText}
          </span>
        </div>
      )}
    </div>
  );
}
