import React from 'react';
import { Search } from 'lucide-react';
import AnimatedInput from './AnimatedInput';

export default function AnimatedSearchInput({
  placeholderText = "📢 Ingrese criterio de búsqueda...",
  ...props
}) {
  return (
    <AnimatedInput
      icon={Search}
      placeholderText={placeholderText}
      {...props}
    />
  );
}
