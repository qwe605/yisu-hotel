import { apiClient } from './api';

export async function createReservation(payload: {
  room_type_id: number;
  user_id: number;
  total_price?: number;
  check_in?: string | null;
  check_out?: string | null;
  status?: string;
}): Promise<{ reservation_id: number }> {
  const resp = await apiClient.post('/api/reservations', payload);
  return resp.data;
}

export async function cancelReservation(id: number): Promise<{ ok: boolean }> {
  const resp = await apiClient.delete(`/api/reservations/${id}`);
  return resp.data;
}
