import { assertDomain } from './domain-runtime.mjs';

function requireTenantId(tenantId) {
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new Error('tenant_context_required');
  }
  return tenantId;
}

function columns(domain, record) {
  const data = record.data ?? {};
  const tenantId = requireTenantId(data.tenantId);
  switch (domain) {
    case 'order': return ['id','tenant_id','state','customer_id','payload','created_at','updated_at', [record.id,tenantId,record.state,data.customerId,JSON.stringify(data),record.createdAt,record.updatedAt]];
    case 'logistics': return ['id','tenant_id','state','order_id','payload','created_at','updated_at', [record.id,tenantId,record.state,data.orderId,JSON.stringify(data),record.createdAt,record.updatedAt]];
    case 'payment': return ['id','tenant_id','state','amount','currency','payload','created_at','updated_at', [record.id,tenantId,record.state,Number(data.amount),data.currency,JSON.stringify(data),record.createdAt,record.updatedAt]];
    default: return ['id','tenant_id','state','name','payload','created_at','updated_at', [record.id,tenantId,record.state,data.name,JSON.stringify(data),record.createdAt,record.updatedAt]];
  }
}

export function createPostgresDomainAdapter(pool, domain) {
  const definition = assertDomain(domain);
  const table = definition.table;
  if (!pool || typeof pool.query !== 'function') throw new Error('postgres_queryable_required');

  return Object.freeze({
    async insert(_table, record, queryable = pool) {
      const c = columns(domain, record);
      const fields = c.slice(0, -1);
      const values = c.at(-1);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
      await queryable.query(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${placeholders})`, values);
    },

    async findById(_table, id, tenantId) {
      const scopedTenantId = requireTenantId(tenantId);
      const { rows } = await pool.query(
        `SELECT * FROM ${table} WHERE tenant_id=$1 AND id=$2`,
        [scopedTenantId, id]
      );
      const row = rows[0];
      if (!row) return null;
      const data = row.payload ?? {};
      if (row.name !== undefined) data.name = row.name;
      if (row.customer_id !== undefined) data.customerId = row.customer_id;
      if (row.order_id !== undefined) data.orderId = row.order_id;
      if (row.amount !== undefined) data.amount = Number(row.amount);
      if (row.currency !== undefined) data.currency = String(row.currency).trim();
      return {
        id: row.id,
        domain,
        state: row.state,
        data: { ...data, tenantId: row.tenant_id },
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString()
      };
    },

    async updateState(_table, id, state, updatedAt, tenantId, expectedState) {
      const scopedTenantId = requireTenantId(tenantId);
      const values = [state, updatedAt, id, scopedTenantId];
      let expectedClause = '';
      if (expectedState !== undefined) {
        values.push(expectedState);
        expectedClause = ` AND state=$${values.length}`;
      }
      const result = await pool.query(
        `UPDATE ${table} SET state=$1,updated_at=$2 WHERE id=$3 AND tenant_id=$4${expectedClause}`,
        values
      );
      if (result.rowCount !== 1) throw new Error('domain_record_changed_or_not_found');
    }
  });
}
