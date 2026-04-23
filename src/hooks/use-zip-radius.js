// src/hooks/use-zip-radius.js
import { useState, useEffect } from 'react';
import { getZipCoordinates, calculateDistance } from '../utils/geo';

export const useZipRadius = (centerZip, radiusMiles = 100) => {
  const [nearbyZips, setNearbyZips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!centerZip || centerZip.length !== 5) {
      setNearbyZips([]);
      return;
    }

    const fetchNearbyZips = async () => {
      setLoading(true);
      setError(null);

      try {
        const centerCoords = await getZipCoordinates(centerZip);
        
        // In a real app, this would call an API to get nearby zips
        // For now, we'll return a mock list
        const mockNearbyZips = [
          { zip: '60601', city: 'Chicago', state: 'IL', distance: 0 },
          { zip: '60602', city: 'Chicago', state: 'IL', distance: 2 },
          { zip: '60290', city: 'Schaumburg', state: 'IL', distance: 28 },
          { zip: '46204', city: 'Indianapolis', state: 'IN', distance: 165 },
          { zip: '53202', city: 'Milwaukee', state: 'WI', distance: 92 }
        ].filter(z => z.distance <= radiusMiles);

        setNearbyZips(mockNearbyZips);
      } catch (err) {
        setError(err.message);
        setNearbyZips([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyZips();
  }, [centerZip, radiusMiles]);

  return { nearbyZips, loading, error };
};