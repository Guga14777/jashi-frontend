#!/usr/bin/env node
// scripts/migrate-local-uploads-to-supabase.mjs
//
// One-shot: take every Document row whose storageType is 'local' (or null),
// find the file on disk, upload it to Supabase Storage, and rewrite the
// row to point at the bucket key. Any rows whose file is no longer on
// disk (Railway wiped it on a previous deploy) are reported and left
// alone so the operator can decide whether to delete them.
//
// Usage:
//   node scripts/migrate-local-uploads-to-supabase.mjs            # dry run
//   node scripts/migrate-local-uploads-to-supabase.mjs --commit   # apply
//
// Env required when --commit is passed: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY), SUPABASE_BUCKET,
// DATABASE_URL.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const COMMIT = process.argv.includes('--commit');
const LOCAL_UPLOAD_DIR = path.join(repoRoot, 'uploads');

const candidatePathsFor = (doc) => {
  const out = [];
  if (doc.filePath) {
    out.push(
      path.isAbsolute(doc.filePath)
        ? doc.filePath
        : path.join(LOCAL_UPLOAD_DIR, doc.filePath.replace(/^\/+/, ''))
    );
    out.push(path.join(LOCAL_UPLOAD_DIR, path.basename(doc.filePath)));
  }
  if (doc.fileName) {
    out.push(path.join(LOCAL_UPLOAD_DIR, 'documents', doc.fileName));
    out.push(path.join(LOCAL_UPLOAD_DIR, doc.fileName));
  }
  return out;
};

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const rows = await prisma.document.findMany({
    where: { OR: [{ storageType: 'local' }, { storageType: null }] },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${rows.length} candidate Document rows.`);

  let storageService = null;
  if (COMMIT) {
    storageService = await import('../server/services/storage.service.cjs').then(
      (m) => m.default || m
    );
    if (!storageService.isConfigured()) {
      console.error(
        'Supabase env vars not configured — cannot --commit. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      );
      process.exit(1);
    }
  }

  const ghosts = [];
  let migrated = 0;
  let skipped = 0;

  for (const doc of rows) {
    const candidates = candidatePathsFor(doc);
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      ghosts.push({ id: doc.id, fileName: doc.fileName, type: doc.type });
      continue;
    }

    if (!COMMIT) {
      console.log(`[dry] would migrate ${doc.id}  ${found}`);
      skipped += 1;
      continue;
    }

    try {
      const buffer = fs.readFileSync(found);
      const stored = await storageService.uploadBuffer({
        buffer,
        originalName: doc.originalName || doc.fileName || 'file',
        mimeType: doc.mimeType || 'application/octet-stream',
        prefix: doc.type === 'insurance' ? 'insurance' : 'documents',
      });
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          fileUrl: stored.fileUrl,
          filePath: stored.filePath,
          storageType: stored.storageType,
        },
      });
      migrated += 1;
      console.log(`[ok ] ${doc.id} -> ${stored.filePath}`);
    } catch (err) {
      console.error(`[err] ${doc.id}: ${err.message}`);
    }
  }

  console.log('\nSummary');
  console.log(`  on-disk + ${COMMIT ? 'migrated' : 'would migrate'}: ${COMMIT ? migrated : skipped}`);
  console.log(`  no longer on disk (likely Railway-wiped): ${ghosts.length}`);
  if (ghosts.length) {
    console.log('  ids:', ghosts.map((g) => g.id).join(','));
  }
  if (!COMMIT) {
    console.log('\nDry run only. Re-run with --commit to apply.');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
