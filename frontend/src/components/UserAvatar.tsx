import React, { useState, useEffect, useMemo } from 'react';
import defaultAvatarSvg from '../assets/default-avatar.svg';
import { API_BASE_URL } from '../api/client';

export interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  title?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-3xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl font-bold',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  name,
  email,
  size = 'md',
  className = '',
  showBorder = true,
  title,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the photoUrl changes
  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const resolvedUrl = useMemo(() => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('/') && !photoUrl.startsWith('//')) {
      return `${API_BASE_URL}${photoUrl}`;
    }
    return photoUrl;
  }, [photoUrl]);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const borderClass = showBorder ? 'border border-slate-700/80 shadow-sm' : '';
  const tooltip = title || name || email || 'User Avatar';

  const initial = (name?.trim() || email?.trim() || '')
    .charAt(0)
    .toUpperCase();

  const showImage = Boolean(resolvedUrl && !hasError);

  return (
    <div
      className={`relative rounded-full bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 select-none ${sizeClass} ${borderClass} ${className}`}
      title={tooltip}
    >
      {showImage ? (
        <img
          src={resolvedUrl!}
          alt={name || 'User avatar'}
          className="w-full h-full object-cover rounded-full"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : initial ? (
        <span className="font-extrabold text-primary font-heading tracking-wide">
          {initial}
        </span>
      ) : (
        <img
          src={defaultAvatarSvg}
          alt="Default avatar"
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
};

export default UserAvatar;
