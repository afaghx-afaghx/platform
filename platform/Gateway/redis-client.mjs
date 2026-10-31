import net from 'node:net';
import tls from 'node:tls';

function parseResp(buffer, offset = 0) {
  if (offset >= buffer.length) return null;
  const type = buffer[offset];
  const lineEnd = buffer.indexOf('\r\n', offset);
  if (lineEnd < 0) return null;
  const line = buffer.toString('utf8', offset + 1, lineEnd);

  if (type === 43) return { value: line, next: lineEnd + 2 };
  if (type === 45) return { value: Object.assign(new Error(line), { code: 'REDIS_COMMAND_ERROR' }), next: lineEnd + 2 };
  if (type === 58) {
    const value = Number(line);
    if (!Number.isSafeInteger(value)) throw new Error('redis_integer_response_invalid');
    return { value, next: lineEnd + 2 };
  }
  if (type === 36) {
    const length = Number(line);
    if (length === -1) return { value: null, next: lineEnd + 2 };
    if (!Number.isSafeInteger(length) || length < 0) throw new Error('redis_bulk_length_invalid');
    const start = lineEnd + 2;
    const end = start + length;
    if (end + 2 > buffer.length) return null;
    if (buffer[end] !== 13 || buffer[end + 1] !== 10) throw new Error('redis_bulk_terminator_invalid');
    return { value: buffer.toString('utf8', start, end), next: end + 2 };
  }
  if (type === 42) {
    const count = Number(line);
    if (count === -1) return { value: null, next: lineEnd + 2 };
    if (!Number.isSafeInteger(count) || count < 0 || count > 100000) throw new Error('redis_array_length_invalid');
    let cursor = lineEnd + 2;
    const values = [];
    for (let i = 0; i < count; i += 1) {
      const item = parseResp(buffer, cursor);
      if (!item) return null;
      values.push(item.value);
      cursor = item.next;
    }
    return { value: values, next: cursor };
  }
  throw new Error('redis_response_type_unsupported');
}

function encodeCommand(args) {
  const values = args.map(value => Buffer.from(String(value), 'utf8'));
  const parts = [Buffer.from(`*${values.length}\r\n`)];
  for (const value of values) {
    parts.push(Buffer.from(`$${value.length}\r\n`), value, Buffer.from('\r\n'));
  }
  return Buffer.concat(parts);
}

class RedisConnection {
  constructor(url, { timeoutMs = 1500, maxPending = 2048 } = {}) {
    this.url = url;
    this.timeoutMs = timeoutMs;
    this.maxPending = maxPending;
    this.socket = null;
    this.connecting = null;
    this.ready = false;
    this.buffer = Buffer.alloc(0);
    this.pending = [];
  }

  async connect() {
    if (this.ready && this.socket && !this.socket.destroyed) return;
    if (this.connecting) return this.connecting;

    this.connecting = new Promise((resolve, reject) => {
      const secure = this.url.protocol === 'rediss:';
      const port = Number(this.url.port || 6379);
      const options = { host: this.url.hostname, port };
      const socket = secure
        ? tls.connect({ ...options, servername: this.url.hostname, rejectUnauthorized: true })
        : net.connect(options);
      this.socket = socket;
      let connected = false;
      let settled = false;

      const rejectConnect = error => {
        if (!settled) { settled = true; reject(error); }
        this.reset(error, socket);
      };
      const timer = setTimeout(() => rejectConnect(new Error('redis_connect_timeout')), this.timeoutMs);
      timer.unref?.();

      socket.setNoDelay(true);
      socket.setKeepAlive(true, 30_000);
      socket.on('data', chunk => this.onData(chunk));
      socket.on('error', error => {
        if (!connected) rejectConnect(error);
        else this.reset(error, socket);
      });
      socket.on('close', () => {
        if (!connected) rejectConnect(new Error('redis_connection_closed'));
        else this.reset(new Error('redis_connection_closed'), socket);
      });

      socket.once(secure ? 'secureConnect' : 'connect', async () => {
        connected = true;
        try {
          if (this.url.password) {
            const username = decodeURIComponent(this.url.username || 'default');
            const password = decodeURIComponent(this.url.password);
            if (this.url.username) await this.sendRaw(['AUTH', username, password]);
            else await this.sendRaw(['AUTH', password]);
          }
          const database = this.url.pathname && this.url.pathname !== '/' ? Number(this.url.pathname.slice(1)) : 0;
          if (!Number.isSafeInteger(database) || database < 0) throw new Error('redis_database_invalid');
          if (database > 0) await this.sendRaw(['SELECT', database]);
          this.ready = true;
          settled = true;
          clearTimeout(timer);
          resolve();
        } catch (error) {
          clearTimeout(timer);
          rejectConnect(error);
        }
      });
    }).finally(() => { this.connecting = null; });
    return this.connecting;
  }

  reset(error, socket) {
    if (socket && this.socket !== socket) return;
    const active = this.socket;
    this.socket = null;
    this.ready = false;
    this.buffer = Buffer.alloc(0);
    if (active && !active.destroyed) active.destroy();
    const failure = error instanceof Error ? error : new Error('redis_connection_failed');
    for (const pending of this.pending.splice(0)) {
      clearTimeout(pending.timer);
      pending.reject(failure);
    }
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length) {
      let parsed;
      try { parsed = parseResp(this.buffer); }
      catch (error) { this.reset(error, this.socket); return; }
      if (!parsed) return;
      this.buffer = this.buffer.subarray(parsed.next);
      const pending = this.pending.shift();
      if (!pending) { this.reset(new Error('redis_unsolicited_response'), this.socket); return; }
      clearTimeout(pending.timer);
      if (parsed.value instanceof Error) pending.reject(parsed.value);
      else pending.resolve(parsed.value);
    }
  }

  sendRaw(args) {
    if (!this.socket || this.socket.destroyed) return Promise.reject(new Error('redis_not_connected'));
    if (this.pending.length >= this.maxPending) return Promise.reject(new Error('redis_pending_limit_exceeded'));
    return new Promise((resolve, reject) => {
      const pending = { resolve, reject, timer: null };
      pending.timer = setTimeout(() => this.reset(new Error('redis_command_timeout'), this.socket), this.timeoutMs);
      pending.timer.unref?.();
      this.pending.push(pending);
      try { this.socket.write(encodeCommand(args)); }
      catch (error) { this.reset(error, this.socket); }
    });
  }

  async command(...args) {
    if (!args.length) throw new Error('redis_command_required');
    await this.connect();
    return this.sendRaw(args);
  }

  close() { this.reset(new Error('redis_client_closed'), this.socket); }
}

function parseRedisUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('redis_url_required');
  const url = new URL(value);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('redis_url_invalid');
  if (!url.hostname) throw new Error('redis_host_required');
  return url;
}

export function createRedisClient({
  url = process.env.REDIS_URL,
  poolSize = Number(process.env.REDIS_POOL_SIZE || 4),
  timeoutMs = 1500,
  maxPendingPerConnection = 2048
} = {}) {
  const parsed = parseRedisUrl(url);
  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 32) throw new Error('redis_pool_size_invalid');
  const connections = Array.from({ length: poolSize }, () =>
    new RedisConnection(parsed, { timeoutMs, maxPending: maxPendingPerConnection })
  );
  let cursor = 0;
  let closed = false;

  return Object.freeze({
    command(...args) {
      if (closed) return Promise.reject(new Error('redis_client_closed'));
      const connection = connections[cursor++ % connections.length];
      return connection.command(...args);
    },
    ping() { return this.command('PING'); },
    close() {
      if (closed) return;
      closed = true;
      for (const connection of connections) connection.close();
    }
  });
}
