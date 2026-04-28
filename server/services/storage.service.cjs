// server/services/storage.service.cjs
//
// Single entry point for cloud document storage. All upload, signed-URL,
// and delete operations for shipment documents (gate pass, BOL, COI,
// proofs, etc.) go through here so the project has exactly one place
// that knows about the Supabase bucket layout.
//
// Storage backend is Supabase only — Railway's container filesystem is
// ephemeral and uploads written there vanish on every redeploy. If
// SUPABASE_URL + a service role key are not configured, every operation
// throws so the failure is loud and the broken state cannot be reached
// silently in production.

const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
// Accept both names because the codebase has historically used both:
// `SUPABASE_SERVICE_ROLE_KEY` (canonical, used by server/supabase.cjs and
// bol.service.cjs) and `SUPABASE_KEY` (legacy, used by the original
// documents.controller init). Either works.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || 'documents';

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isConfigured() {
  return !!supabase;
}

function requireClient() {
  if (!supabase) {
    const err = new Error(
      'Supabase storage is not configured. Set SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) on the server.'
    );
    err.code = 'STORAGE_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }
  return supabase;
}

// Build a deterministic-ish, URL-safe storage key. Keeping a stable shape
// (`<prefix>/<timestamp>-<rand>.<ext>`) makes the bucket easy to browse
// and means we never collide on user-supplied filenames.
function buildStorageKey({ prefix = 'documents', originalName }) {
  const ext = (path.extname(originalName || '') || '').toLowerCase();
  const stamp = Date.now();
  const rand = crypto.randomBytes(8).toString('hex');
  return `${prefix}/${stamp}-${rand}${ext}`;
}

// Upload a Buffer (from multer.memoryStorage) to Supabase. Returns the
// shape that Document rows store: a public URL for convenience plus the
// bucket key (`filePath`) used by signed-URL / delete operations later.
async function uploadBuffer({ buffer, originalName, mimeType, prefix }) {
  const client = requireClient();
  if (!buffer || !buffer.length) {
    throw new Error('uploadBuffer: empty buffer');
  }

  const storageKey = buildStorageKey({ prefix, originalName });

  const { error: uploadError } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(storageKey, buffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  // Public URL is convenient as a stable display reference, but it only
  // resolves if the bucket itself is public. Read endpoints always use
  // createSignedUrl below so private buckets work too.
  const { data: publicData } = client.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storageKey);

  return {
    fileUrl: publicData?.publicUrl || null,
    filePath: storageKey,
    storageType: 'supabase',
  };
}

// Generate a short-lived signed URL. Pass `downloadAs` to set a
// Content-Disposition: attachment with the given filename — that is what
// preserves a friendly original name when the user clicks Download.
// Without `downloadAs`, the URL opens inline (browser's default for the
// content-type), which is what the modal "view" link wants.
async function createSignedUrl({ filePath, expiresIn = 3600, downloadAs }) {
  const client = requireClient();
  if (!filePath) throw new Error('createSignedUrl: filePath is required');

  const options = {};
  if (downloadAs) {
    options.download = downloadAs;
  }

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresIn, options);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
  return data.signedUrl;
}

async function removeObject(filePath) {
  const client = requireClient();
  if (!filePath) return;
  const { error } = await client.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (error) {
    // Caller usually treats delete-failure as non-fatal; surface the
    // message but don't throw a hard error here.
    console.warn(`[storage.service] removeObject ${filePath}:`, error.message);
  }
}

module.exports = {
  isConfigured,
  uploadBuffer,
  createSignedUrl,
  removeObject,
  STORAGE_BUCKET,
};
