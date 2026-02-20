import { apiClient } from './api';

export type UserProfile = {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  role?: string;
  collect?: string | null;
};

export async function getMyProfile(): Promise<UserProfile> {
  const resp = await apiClient.get('/api/users/me');
  return resp.data as UserProfile;
}

export async function updateMyCollect(collect: string): Promise<{ ok: boolean; collect: string }> {
  const resp = await apiClient.put('/api/users/me/collect', { collect });
  return resp.data as { ok: boolean; collect: string };
}
