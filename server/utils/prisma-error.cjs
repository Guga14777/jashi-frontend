// Classify Prisma / DB errors into human-readable reasons.
// Safe to send to the client — no query fragments, no stack, no secrets.

function classifyPrismaError(err) {
  if (!err) return { reason: 'unknown', detail: 'no error object' };

  const code = err.code || null;
  const name = err.name || null;
  const msg = err.message || String(err);

  if (name === 'PrismaClientInitializationError') {
    return {
      reason: 'db_initialization_failed',
      detail: 'Prisma could not initialize — usually missing/invalid DATABASE_URL or DB unreachable at boot.',
      code,
      name,
    };
  }
  if (name === 'PrismaClientRustPanicError') {
    return { reason: 'prisma_panic', detail: 'Prisma engine crashed.', code, name };
  }

  switch (code) {
    case 'P1000':
      return { reason: 'db_auth_failed', detail: 'Database auth failed — wrong user or password in DATABASE_URL.', code, name };
    case 'P1001':
      return { reason: 'db_unreachable', detail: 'Cannot reach database server — host unreachable or wrong host in DATABASE_URL.', code, name };
    case 'P1002':
      return { reason: 'db_timeout', detail: 'Database server reached but timed out.', code, name };
    case 'P1003':
      return { reason: 'db_not_found', detail: 'Database does not exist at the connection URL.', code, name };
    case 'P1008':
      return { reason: 'db_op_timeout', detail: 'Database operation timed out.', code, name };
    case 'P1017':
      return { reason: 'db_connection_closed', detail: 'Database closed the connection.', code, name };
    case 'P2021':
      return { reason: 'table_missing', detail: 'A required table does not exist — run `prisma migrate deploy` on production.', code, name };
    case 'P2022':
      return { reason: 'column_missing', detail: 'A required column does not exist — schema on DB is out of date, run `prisma migrate deploy`.', code, name };
    case 'P2024':
      return { reason: 'pool_exhausted', detail: 'Prisma connection pool timed out — DB is overloaded or pool size too small.', code, name };
    case 'P2025':
      return { reason: 'record_not_found', detail: msg, code, name };
    case 'P2002':
      return { reason: 'unique_violation', detail: `Unique constraint on ${err.meta?.target?.join?.(', ') || 'field'}`, code, name };
    default:
      break;
  }

  // Heuristic fallbacks when Prisma doesn't set a code (e.g. pg driver error).
  if (/ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    return { reason: 'dns_failed', detail: 'Cannot resolve DB host — check DATABASE_URL hostname.', code, name };
  }
  if (/ECONNREFUSED/i.test(msg)) {
    return { reason: 'db_refused', detail: 'DB refused the connection — wrong port or server down.', code, name };
  }
  if (/self.signed certificate|SSL|TLS/i.test(msg)) {
    return { reason: 'ssl_error', detail: 'SSL/TLS error connecting to DB — check ?sslmode= on DATABASE_URL.', code, name };
  }
  if (/password authentication failed/i.test(msg)) {
    return { reason: 'db_auth_failed', detail: 'Database auth failed — wrong user/password in DATABASE_URL.', code, name };
  }

  return { reason: 'unclassified', detail: msg, code, name };
}

module.exports = { classifyPrismaError };
