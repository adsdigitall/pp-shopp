const userCoupons = new Map();

export function createCouponHandlers({ sendJson, readJsonBody }) {
  async function handleGetCoupons(req, res) {
    try {
      const userId = 'default_user';
      let coupons = userCoupons.get(userId);
      if (!coupons) {
        coupons = [];
        userCoupons.set(userId, coupons);
      }
      sendJson(res, 200, { coupons });
    } catch {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar cupons.' } });
    }
  }

  async function handleCreateCoupon(req, res) {
    try {
      const userId = 'default_user';
      const body = await readJsonBody(req);
      const { platform, code, description } = body;
      if (!platform || !code) {
        sendJson(res, 400, { error: { code: 'MISSING_PARAMS', message: 'Plataforma e código são obrigatórios.' } });
        return;
      }
      let coupons = userCoupons.get(userId) || [];
      const coupon = { id: `coupon-${Date.now()}`, platform, code, description, expiresAt: null, isActive: true };
      coupons.push(coupon);
      userCoupons.set(userId, coupons);
      sendJson(res, 201, { coupon });
    } catch {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar cupom.' } });
    }
  }

  async function handleDeleteCoupon(req, res, pathOnly) {
    try {
      const userId = 'default_user';
      const couponId = pathOnly.replace('/api/coupons/', '');
      let coupons = userCoupons.get(userId) || [];
      coupons = coupons.filter((coupon) => coupon.id !== couponId);
      userCoupons.set(userId, coupons);
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover cupom.' } });
    }
  }

  return { handleGetCoupons, handleCreateCoupon, handleDeleteCoupon };
}
