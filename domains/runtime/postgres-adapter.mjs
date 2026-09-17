import { assertDomain } from './domain-runtime.mjs';

function columns(domain, record) {
  const data = record.data ?? {};
  switch (domain) {
    case 'order': return ['id','state','customer_id','payload', 'created_at','updated_at', [record.id,record.state,data.customerId,JSON.stringify(data),record.createdAt,record.updatedAt]];
    case 'logistics': return ['id','state','order_id','payload', 'created_at','updated_at', [record.id,record.state,data.orderId,JSON.stringify(data),record.createdAt,record.updatedAt]];
    case 'payment': return ['id','state','amount','currency','payload','created_at','updated_at', [record.id,record.state,Number(data.amount),data.currency,JSON.stringify(data),record.createdAt,record.updatedAt]];
    default: return ['id','state','name','payload','created_at','updated_at', [record.id,record.state,data.name,JSON.stringify(data),record.createdAt,record.updatedAt]];
  }
}

export function createPostgresDomainAdapter(pool, domain) {
  const definition = assertDomain(domain);
  const table = definition.table;
  return {
    async insert(_table, record) {
      const c = columns(domain, record);
      const fields = c.slice(0, -1);
      const values = c.at(-1);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${placeholders})`, values);
    },
    async findById(_table, id) {
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [id]);
      const row = rows[0];
      if (!row) return null;
      const data = row.payload ?? {};
      if (row.name !== undefined) data.name = row.name;
      if (row.customer_id !== undefined) data.customerId = row.customer_id;
      if (row.order_id !== undefined) data.orderId = row.order_id;
      if (row.amount !== undefined) data.amount = Number(row.amount);
      if (row.currency !== undefined) data.currency = String(row.currency).trim();
      return { id: row.id, domain, state: row.state, data, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
    },
    async updateState(_table, id, state, updatedAt) {
      await pool.query(`UPDATE ${table} SET state=$1,updated_at=$2 WHERE id=$3`, [state, updatedAt, id]);
    }
  };
}
