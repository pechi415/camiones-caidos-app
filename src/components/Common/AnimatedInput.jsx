import React, { useState } from 'react';

export default function AnimatedInput({
  type = 'text',
  inputMode = 'text',
  value,
  onChange,
  onBlur,
  placeholderText,
  icon: Icon,
  maxLength,
  required,
  pattern,
  className = "glass-input",
  style = {},
  inputStyle = {}
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '10px', ...style }}>
      {Icon && <Icon size={16} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />}
      <input
        type={type}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        required={required}
        className={className}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          setIsFocused(false);
          if (onBlur) onBlur(e);
        }}
        style={{
          paddingLeft: Icon ? '36px' : '12px',
          height: '40px',
          fontSize: '0.85rem',
          width: '100%',
          boxSizing: 'border-box',
          ...inputStyle
        }}
      />

      {!value && !isFocused && (
        <div className="marquee-container" style={{ position: 'absolute', left: Icon ? '36px' : '12px', right: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }}>
          <span className="marquee-content" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            {placeholderText}
          </span>
        </div>
      )}
    </div>
  );
}
