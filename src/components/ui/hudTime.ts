export const getDefaultPanelOpen = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return !window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  } catch (error) {
    console.warn('Error determining default panel state:', error);
    return true;
  }
};

export const formatTimeAgo = (date: Date | null): string => {
  if (!date) return 'Never';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};
