import { useState, useEffect } from 'react';
import { HealthStatus } from '../types';
import { apiClient } from '../services/apiClient';

export function useHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err?.message || 'Could not reach backend API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return { health, isLoading, error, refetch: checkHealth };
}
