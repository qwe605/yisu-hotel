// 简易埋点控制器：接收事件并打印，后续可扩展为写库或消息队列
async function trackEvent(req, res) {
  try {
    const { event, page, timestamp, payload } = req.body || {};
    const userId = req.user?.id || null;
    console.log('[analytics]', JSON.stringify({ event, page, timestamp, userId, payload }));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false });
  }
}

module.exports = { trackEvent };
