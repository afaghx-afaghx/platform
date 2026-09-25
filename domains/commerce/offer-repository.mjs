export function createOfferRepository(pool) {
  if (!pool) throw new Error('pool_required');
  return Object.freeze({
    async findActiveByProduct(productId) {
      const sql = 'SELECT id, product_id AS "productId", organization_id AS "organizationId", state AS status, currency, price::text AS price, minimum_order_quantity AS "minimumOrderQuantity", lead_time_days AS "leadTimeDays", availability_policy AS "availabilityPolicy", trade_terms AS "tradeTerms", valid_from AS "validFrom", valid_until AS "validUntil" FROM domain_offer WHERE product_id=$1 AND state=\'active\' ORDER BY created_at ASC, id ASC';
      const { rows } = await pool.query(sql, [productId]);
      return rows.map(row => ({
        ...row,
        price: Number(row.price),
        minimumOrderQuantity: row.minimumOrderQuantity === null ? null : Number(row.minimumOrderQuantity),
        leadTimeDays: row.leadTimeDays === null ? null : Number(row.leadTimeDays),
        validFrom: row.validFrom ? new Date(row.validFrom).toISOString() : null,
        validUntil: row.validUntil ? new Date(row.validUntil).toISOString() : null
      }));
    }
  });
}