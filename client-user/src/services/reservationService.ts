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

export async function listMyReservations(scope: 'upcoming' | 'past' = 'upcoming', page = 1, pageSize = 10): Promise<{
  items: Array<{
    id: number;
    room_type_id: number;
    user_id: number;
    check_in: string;
    check_out: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';
    room_name: string;
    base_price: number;
    hotel_id: number;
    hotel_name: string;
    star_rating: number;
    address: string;
  }>;
  page: number;
  pageSize: number;
}> {
  const resp = await apiClient.get('/api/reservations/my', { params: { scope, page, pageSize } });
  return resp.data;
}
