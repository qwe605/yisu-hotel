// 前端类型定义（由于 CRA 限制不能导入 src 之外的文件，这里复制共享类型）

export interface HotelListItem {
  id: number;
  name_zh: string;
  name_en: string;
  address: string;
  star_rating: number;
  min_price: number | null;
  primary_image?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  amenities?: string[];
}

export interface HotelSearchQuery {
  keyword?: string;
  check_in?: string;
  check_out?: string;
  minPrice?: number;
  maxPrice?: number;
  stars?: number;
  rooms?: number;
  sort?: 'priceAsc' | 'priceDesc' | 'starDesc' | 'distanceAsc';
  page?: number;
  pageSize?: number;
  guests?: number;
  userLat?: number;
  userLng?: number;
  maxDistanceKm?: number;
  amenities?: string;
}

export interface HotelSearchResult {
  items: HotelListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HotelDetail {
  id: number;
  name_zh: string;
  name_en: string;
  address: string;
  star_rating: number;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  min_price: number | null;
  room_type_count: number;
}
