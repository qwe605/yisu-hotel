// 酒店相关控制器
// 作用：处理酒店搜索与列表查询的业务逻辑
const hotelModel = require('../models/hotelModel');

// 构建排序 SQL 片段
function buildOrderBy(sort) {
  // 根据传入的排序值返回对应的 SQL
  switch (sort) {
    case 'priceAsc':
      return 'ORDER BY min_price ASC';
    case 'priceDesc':
      return 'ORDER BY min_price DESC';
    case 'starDesc':
      return 'ORDER BY h.star_rating DESC';
    case 'distanceAsc':
      return 'ORDER BY distance_km ASC';
    default:
      return 'ORDER BY h.id DESC';
  }
}

function tokenizeKeyword(input) {
  const str = String(input || '').trim();
  if (!str) return [];
  let t = str.replace(/[，。,.\s\-_/]+/g, ' ');
  t = t.replace(/省|市|自治区|自治州|特别行政区|市辖区|地区|盟|州|区|县|镇|乡|街道|大道|路|巷|弄|号/g, ' ');
  const parts = t.split(/\s+/).filter(x => x && x.length >= 2);
  const set = new Set();
  const out = [];
  for (const p of parts) {
    if (!set.has(p)) { set.add(p); out.push(p); }
  }
  return out;
}

// 搜索酒店（支持关键词、价格、星级、分页、排序）
async function searchHotels(req, res) {
  // 从查询参数读取筛选条件（均来自 URL 查询字符串），必要时在下方做类型与边界处理
  const {
    keyword = '',          // 关键词：匹配中文名/英文名/地址（模糊）
    minPrice,              // 最低价（作用于聚合后的 MIN(rt.base_price)，用 HAVING）
    maxPrice,              // 最高价（同上）
    stars,                 // 星级下限（作用于原表字段 h.star_rating，走 WHERE）
    rooms,                 // 房型数量下限（作用于聚合 COUNT(DISTINCT rt.id)，走 HAVING）
    guests,                // 人数下限（作用于房型容量 rt.capacity，走 WHERE）
    amenities,             // 标签（以逗号分隔），匹配 room_types.amenities
    userLat,               // 用户纬度（用于距离计算）
    userLng,               // 用户经度（用于距离计算）
    maxDistanceKm,         // 最大距离（公里，走 HAVING）
    sort = 'priceAsc',     // 排序（priceAsc/priceDesc/starDesc），见 buildOrderBy
    page = 1,              // 页码（从1开始）
    pageSize = 10          // 每页数量
  } = req.query;


  // 分页计算：确保 limit ≥1；offset 基于 (page-1)*limit 且不为负
  const limit = Math.max(parseInt(pageSize, 10) || 10, 1);
  const offset = Math.max((parseInt(page, 10) || 1) - 1, 0) * limit;

  // 预备 WHERE/HAVING 片段与参数数组（统一使用参数化，防止 SQL 注入）
  const whereClauses = ['h.status = "approved"']; // 仅查询审核通过的酒店
  const params = [];           // 对应 WHERE 的参数
  const havingClauses = [];    // 聚合后的过滤（MIN/COUNT 等）
  const havingParams = [];     // 对应 HAVING 的参数
  const latNum = Number(userLat);
  const lngNum = Number(userLng);
  const hasGeo = Number.isFinite(latNum) && Number.isFinite(lngNum);
  if (hasGeo) {
    whereClauses.push('h.latitude IS NOT NULL AND h.longitude IS NOT NULL');
  }

  // 关键词匹配中文名/英文名/地址（模糊匹配，走 WHERE）
  const tokens = tokenizeKeyword(keyword);
  if (tokens.length > 0) {
    const ors = tokens.map(() => '(h.name_zh LIKE ? OR h.name_en LIKE ? OR h.address LIKE ?)').join(' OR ');
    whereClauses.push(`(${ors})`);
    for (const tk of tokens) {
      const like = `%${tk}%`;
      params.push(like, like, like);
    }
  } else if (keyword) {
    const like = `%${keyword}%`;
    whereClauses.push('(h.name_zh LIKE ? OR h.name_en LIKE ? OR h.address LIKE ?)');
    params.push(like, like, like);
  }

  // 星级下限（原表字段，走 WHERE）
  if (stars) {
    whereClauses.push('h.star_rating >= ?');
    params.push(Number(stars));
  }

  // 价格区间（聚合最小房价，走 HAVING）
  if (minPrice) {
    havingClauses.push('MIN(rt.base_price) >= ?');
    havingParams.push(Number(minPrice));
  }
  if (maxPrice) {
    havingClauses.push('MIN(rt.base_price) <= ?');
    havingParams.push(Number(maxPrice));
  }

  // 人数下限（房型容量，走 WHERE；0 或未传入不加条件）
  if (guests && Number(guests) > 0) {
    whereClauses.push('rt.capacity >= ?');
    params.push(Math.max(0, Number(guests)));
  }
  if (amenities) {
    const tags = String(amenities).split(',').map(s => s.trim()).filter(Boolean);
    for (const t of tags) {
      const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      whereClauses.push("REPLACE(rt.amenities, '，', ',') REGEXP ?");
      params.push(`(^|,)[[:space:]]*${esc}[[:space:]]*(,|$)`);
    }
  }

  // 拼接 WHERE 子句（无条件时为空串）
  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 排序片段：根据 sort 返回 ORDER BY（价格升降/星级降序）
  const orderBySQL = buildOrderBy(sort);

  // 距离筛选（必须在构建 SQL 之前加入 HAVING 条件）
  if (hasGeo && Number(maxDistanceKm) > 0) {
    havingClauses.push('distance_km <= ?');
    havingParams.push(Number(maxDistanceKm));
  }

  // 主查询：聚合最小房价与房型数量，并拿酒店主图（通过子查询聚合避免图片导致行倍增）
  const scoreExpr = tokens.length > 0
    ? tokens.map(() => '( (h.address LIKE ?) + (h.name_zh LIKE ?) + (h.name_en LIKE ?) )').join(' + ')
    : '0';
  const distanceExpr = hasGeo
    ? `( 6371.137 * acos(
          cos(radians(?)) * cos(radians(h.latitude)) * cos(radians(h.longitude) - radians(?)) +
          sin(radians(?)) * sin(radians(h.latitude))
        ) )`
    : 'NULL';
  const listSQL = `
    SELECT
      h.id,
      h.name_zh,
      h.name_en,
      h.address,
      h.star_rating,
      h.latitude,
      h.longitude,
      ${distanceExpr} AS distance_km,
      ${scoreExpr} AS match_score,
      MIN(rt.base_price) AS min_price,          -- 最小房价
      hi.primary_image AS primary_image,        -- 主图（子查询取第一张）
      COUNT(DISTINCT rt.id) AS room_type_count, -- 房型数量
      GROUP_CONCAT(rt.amenities) AS amenities_concat
    FROM hotels h
    LEFT JOIN room_types rt ON rt.hotel_id = h.id
    LEFT JOIN (
      SELECT hotel_id,
             SUBSTRING_INDEX(GROUP_CONCAT(image_url ORDER BY is_primary DESC, display_order ASC), ',', 1) AS primary_image
      FROM hotel_images
      GROUP BY hotel_id
    ) hi ON hi.hotel_id = h.id
    ${whereSQL}
    GROUP BY h.id, h.name_zh, h.name_en, h.address, h.star_rating, h.latitude, h.longitude
    ${[Number(rooms) > 0].filter(Boolean).length || havingClauses.length ? `HAVING ${[
      Number(rooms) > 0 ? 'COUNT(DISTINCT rt.id) >= ?' : null,
      ...havingClauses
    ].filter(Boolean).join(' AND ')}` : ''}
    ${tokens.length > 0 ? `ORDER BY match_score DESC, ${orderBySQL.replace('ORDER BY ', '')}` : orderBySQL}
    LIMIT ? OFFSET ?
  `;

  // 统计总数：将相同过滤逻辑放入子查询，再在外层做 COUNT(*)
  const countSubSQL = `
    SELECT
      h.id,
      ${distanceExpr} AS distance_km
    FROM hotels h
    LEFT JOIN room_types rt ON rt.hotel_id = h.id
    ${whereSQL}
    GROUP BY h.id, h.name_zh, h.name_en, h.address, h.star_rating
    ${[Number(rooms) > 0].filter(Boolean).length || havingClauses.length ? `HAVING ${[
      Number(rooms) > 0 ? 'COUNT(DISTINCT rt.id) >= ?' : null,
      ...havingClauses
    ].filter(Boolean).join(' AND ')}` : ''}
  `;
  const countSQL = `SELECT COUNT(*) AS total FROM (${countSubSQL}) AS t`;

  try {
    // 先查总数：rooms>0 时在 HAVING 里追加 rooms 参数；否则只传 where/havingParams
    const distanceParams = hasGeo ? [latNum, lngNum, latNum] : [];
    const countParams = Number(rooms) > 0
      ? [...distanceParams, ...params, Number(rooms), ...havingParams]
      : [...distanceParams, ...params, ...havingParams];
    const [countRows] = await hotelModel.execute(countSQL, countParams);
    const total = countRows?.[0]?.total || 0;

    // 再查当前页数据：在参数末尾追加分页 limit/offset
    const scoreParams = tokens.length > 0 ? tokens.flatMap(tk => [`%${tk}%`, `%${tk}%`, `%${tk}%`]) : [];
    const listDistanceParams = hasGeo ? [latNum, lngNum, latNum] : [];
    const listParams =
      Number(rooms) > 0
        ? [...listDistanceParams, ...scoreParams, ...params, Number(rooms), ...havingParams, limit, offset]
        : [...listDistanceParams, ...scoreParams, ...params, ...havingParams, limit, offset];
    const [rows] = await hotelModel.execute(listSQL, listParams);
    const items = (rows || []).map(r => {
      const concat = r.amenities_concat || '';
      const tags = Array.from(new Set(concat.split(',').map(s => s.trim()).filter(Boolean)));
      const { amenities_concat, ...rest } = r;
      return { ...rest, amenities: tags };
    });

    // 返回结构化数据（items/total/page/pageSize）
    res.json({
      items,
      total,
      page: Number(page) || 1,
      pageSize: limit
    });
  } catch (err) {
    // 特例处理：数据库鉴权错误时返回空列表以保证前端不崩溃（但打印警告）
    if (err && err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.warn('数据库鉴权错误', { code: err.code, keyword, minPrice, maxPrice, stars, rooms, guests, sort, page, pageSize });
      res.json({
        items: [],
        total: 0,
        page: Number(page) || 1,
        pageSize: limit
      });
      return;
    }
    // 其他错误：输出 SQL 与参数，返回 500
    console.error('searchHotels SQL error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    console.warn('查询失败参数:', { keyword, minPrice, maxPrice, stars, rooms, guests, sort, page, pageSize });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

async function getHotelDetail(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ message: '参数错误' });
    return;
  }
  try {
    const [rows] = await hotelModel.getHotelDetailById(id);
    const hotel = rows?.[0];
    if (!hotel) {
      res.status(404).json({ message: '未找到酒店' });
      return;
    }
    const [rooms] = await hotelModel.getRoomsByHotelId(id);
    const [features] = await hotelModel.getFeaturesByHotelId(id);
    const [images] = await hotelModel.getImagesByHotelId(id);
    const [promotions] = await hotelModel.getPromotionsByHotelId(id);
    const [bookings] = await hotelModel.getBookingsByHotelId(id);

    res.json({ hotel, rooms, features, images, promotions, bookings });
  } catch (err) {
    console.error('getHotelDetail SQL error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

async function updateRoomTypeCapacity(req, res) {
  try {
    const roomTypeId = Number(req.params.id);
    const { delta } = req.body || {};
    if (!roomTypeId || !Number.isFinite(Number(delta))) {
      res.status(400).json({ message: '参数错误' });
      return;
    }
    const current = await hotelModel.getRoomTypeCapacity(roomTypeId);
    if (current == null) {
      res.status(404).json({ message: '房型不存在' });
      return;
    }
    const next = Math.max(0, Number(current) + Number(delta));
    await hotelModel.updateRoomTypeCapacity(roomTypeId, next);
    res.json({ id: roomTypeId, capacity: next });
  } catch (err) {
    console.error('updateRoomTypeCapacity SQL error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

async function getAmenities(req, res) {
  try {
    const [rows] = await hotelModel.getAmenitiesGlobal();
    const s = rows?.[0]?.all_amenities || '';
    const set = new Set((s || '').split(',').map(x => (x || '').trim()).filter(Boolean));
    res.json({ amenities: Array.from(set) });
  } catch (err) {
    console.error('getAmenities SQL error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

// 获取所有促销活动（全表 promotions）
async function getPromotions(req, res) {
  try {
    const [rows] = await hotelModel.getPromotionsAll();
    res.json({ promotions: rows });
  } catch (err) {
    console.error('getPromotions SQL error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

module.exports = {
  searchHotels,
  getHotelDetail,
  updateRoomTypeCapacity,
  getAmenities,
  getPromotions
}
