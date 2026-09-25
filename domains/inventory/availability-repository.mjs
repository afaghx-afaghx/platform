export function createAvailabilityRepository(pool) {
  if (!pool) throw new Error('pool_required');
  return Object.freeze({
    async findByOfferId(offerId) {
      const sql = 'SELECT offer_id AS "offerId", tenant_id AS "tenantId", state AS status, available_quantity AS "availableQuantity", updated_at AS "updatedAt" FROM domain_inventory WHERE offer_id=$1 ORDER BY updated_at DESC LIMIT 1';
      const { rows } = await pool.query(sql, [offerId]);
      if (!rows[0]) return null;
      return { ...rows[0], availableQuantity: Number(rows[0].availableQuantity), updatedAt: new Date(rows[0].updatedAt).toISOString() };
    }
  });
}