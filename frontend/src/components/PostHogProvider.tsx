import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from '../services/analytics';

export function PostHogPageviewTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageview();
  }, [location.pathname, location.search]);

  return null;
}
