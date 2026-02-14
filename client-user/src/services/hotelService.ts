// 酒店服务封装
// 作用：提供酒店相关的 API 调用函数
import { apiClient } from './api';
import { HotelSearchQuery, HotelSearchResult, HotelDetail } from '../types';

// 搜索酒店列表
export async function searchHotels(query: HotelSearchQuery): Promise<HotelSearchResult> {
  // 发起 GET 请求到后端搜索接口
  const resp = await apiClient.get('/api/hotels/search', {
    params: query
  });
  return resp.data as HotelSearchResult;
}

// 获取酒店详情（包含房间类型、特征、图片、促销信息）,再server/controllers/hotelController.js里改完之后，要在这里添加
export async function getHotelDetail(id: number): Promise<{ hotel: HotelDetail; rooms: any[]; features: any[]; images: any[]; promotions: any[]; bookings: any[] }> {
  const resp = await apiClient.get(`/api/hotels/${id}`);
  return resp.data;
}

// 调整房型可用容量（delta 可为正/负，返回最新 capacity）
export async function updateRoomCapacity(roomTypeId: number, delta: number): Promise<{ id: number; capacity: number }> {
  const resp = await apiClient.post(`/api/hotels/room-types/${roomTypeId}/capacity`, { delta });
  return resp.data;
}

export async function fetchAmenities(): Promise<{ amenities: string[] }> {
  const resp = await apiClient.get('/api/hotels/amenities');
  return resp.data;
}

// 获取全部促销活动（promotions 全表）
export async function fetchAllPromotions(): Promise<{ promotions: Array<{ id: number; hotel_id: number; name: string; discount_type: string; discount_value: number; start_date: string; end_date: string; description?: string; created_at?: string }> }> {
  const resp = await apiClient.get('/api/hotels/promotions');
  return resp.data;
}

// 顶部 Tab 使用的列表接口（规范要求路径：/api/hotel/list）
export async function fetchHotelListByFilter(params: {
  city: string;
  filter: string;
  checkIn?: string;
  checkOut?: string;
  page?: number;
  pageSize?: number;
}): Promise<HotelSearchResult> {
  const resp = await apiClient.get('/api/hotel/list', {
    params
  });
  return resp.data as HotelSearchResult;
}
