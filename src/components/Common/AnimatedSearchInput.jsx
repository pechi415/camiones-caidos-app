import React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import AnimatedInput from './AnimatedInput';

export default function AnimatedSearchInput({
  placeholderText = "📢 Ingrese criterio de búsqueda...",
  icon: IconProp,
  ...props
}) {
  const SearchIcon = IconProp || ((iconProps) => <MagnifyingGlass weight="duotone" {...iconProps} />);

  return (
    <AnimatedInput
      icon={SearchIcon}
      placeholderText={placeholderText}
      {...props}
    />
  );
}
