import { apiClient } from './api';

export async function trackEvent(event: string, payload: Record<string, any> = {}) {
  try {
    const body = {
      event,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      payload
    };
    await apiClient.post('/api/analytics/track', body);
  } catch (err) {
    console.error('Analytics Error:', err);
  }
}
