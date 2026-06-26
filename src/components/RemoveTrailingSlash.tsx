import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RemoveTrailingSlash() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (path.length > 1 && path.endsWith('/')) {
      const newPath = path.slice(0, -1);
      window.history.replaceState({}, '', newPath);
    }
  }, [location]);

  return null;
}
