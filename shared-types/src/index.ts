// 共享类型定义 - 提供给前端与后端复用
// 说明：本文件声明酒店相关的核心数据结构，便于两端约束字段一致

// 酒店列表项类型（用于列表展示与搜索结果）
export interface HotelFeature {
  // 景点/地标名
  name: string;
  // 类型（如：景点、地铁站、商圈等）
  type?: string;
  // 距离（单位：km 或 m，按约定）
  distance?: number | null;
  // 描述
  description?: string | null;
}

export interface HotelListItem {
  // 酒店主键ID
  id: number;
  // 酒店中文名
  name_zh: string;
  // 酒店英文名
  name_en: string;
  // 酒店地址
  address: string;
  // 酒店星级（1-5，支持小数）
  star_rating: number;
  // 最低房价（来自房型表的最小基础价）
  min_price: number | null;
  // 主图（来自酒店图片表，可能为空）
  primary_image?: string | null;
  // 多个景点信息（后端 JSON 聚合后解析为数组）
  features?: HotelFeature[];
}

// 搜索查询参数类型（用于前端与后端约定）
export interface HotelSearchQuery {
  // 城市或关键词，模糊匹配酒店名/地址
  keyword?: string;
  // 入住日期（可选）
  check_in?: string;
  // 退房日期（可选）
  check_out?: string;
  // 最低价格（可选）
  minPrice?: number;
  // 最高价格（可选）
  maxPrice?: number;
  // 星级下限（星级≥当前选择）
  stars?: number;
  // 房间数下限（room≥当前值）
  rooms?: number;
  // 排序字段（priceAsc、priceDesc、starDesc）
  sort?: 'priceAsc' | 'priceDesc' | 'starDesc';
  // 分页页码（从1开始）
  page?: number;
  // 每页数量
  pageSize?: number;
  // 人数下限（guests≥当前输入）
  guests?: number;
}

// 搜索结果返回结构
export interface HotelSearchResult {
  // 当前页数据
  items: HotelListItem[];
  // 总条数
  total: number;
  // 当前页码
  page: number;
  // 每页数量
  pageSize: number;
}
