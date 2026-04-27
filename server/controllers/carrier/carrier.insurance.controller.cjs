// server/controllers/carrier/carrier.insurance.controller.cjs
// Endpoints for the carrier portal /documents page (COI upload + metadata).
//
// Storage model: the COI file is a Document row (type='insurance',
// userId=<carrier>) and policy/insurer/expiration/reminder settings hang
// off Document.metadata. The "current" insurance is the most recent
// insurance Document for that user — older rows are kept for history but
// are never returned by GET.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const prisma = require('../../db.cjs');

const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../../uploads', 'documents');
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LOCAL_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const stamp = Date.now();
    const rand = crypto.randomBytes(6).toString('hex');
    cb(null, `insurance-${stamp}-${rand}${path.extname(file.originalname || '')}`);
  },
});

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG'));
  },
});

const getUserId = (req) => req.user?.id || req.user?.userId || req.userId || null;

const parseRemindersField = (raw) => {
  const fallback = { d30: false, d14: false, d7: false };
  if (!raw) return fallback;
  if (typeof raw === 'object') return { ...fallback, ...raw };
  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
};

const shapeInsurance = (doc, user) => {
  if (!doc) return null;
  const meta = doc.metadata || {};
  return {
    id: doc.id,
    fileUrl: doc.fileUrl,
    fileName: doc.originalName || doc.fileName,
    fileSize: doc.fileSize || null,
    mimeType: doc.mimeType || null,
    policyNumber: meta.policyNumber || '',
    insurer: meta.insurer || '',
    expirationDate: meta.expirationDate || '',
    enableReminders: !!meta.enableReminders,
    reminders: parseRemindersField(meta.reminders),
    uploadedAt: doc.createdAt,
    uploadedBy: user?.email || null,
  };
};

async function getCarrierInsurance(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const [doc, user] = await Promise.all([
      prisma.document.findFirst({
        where: { userId, type: 'insurance' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, dotNumber: true, mcNumber: true },
      }),
    ]);

    res.json({
      success: true,
      hasInsurance: !!doc,
      insurance: shapeInsurance(doc, user),
      user: {
        dotNumber: user?.dotNumber || '',
        mcNumber: user?.mcNumber || '',
      },
    });
  } catch (err) {
    console.error('[carrier.insurance] getCarrierInsurance failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load insurance', message: err.message });
  }
}

async function saveCarrierInsurance(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { policyNumber, insurer, expirationDate, enableReminders } = req.body || {};
    const reminders = parseRemindersField(req.body?.reminders);

    const existing = await prisma.document.findFirst({
      where: { userId, type: 'insurance' },
      orderBy: { createdAt: 'desc' },
    });

    let doc;

    if (req.file) {
      doc = await prisma.document.create({
        data: {
          userId,
          type: 'insurance',
          fileName: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: `/uploads/documents/${req.file.filename}`,
          filePath: req.file.path,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          storageType: 'local',
          metadata: {
            policyNumber: policyNumber || '',
            insurer: insurer || '',
            expirationDate: expirationDate || '',
            enableReminders: enableReminders === 'true' || enableReminders === true,
            reminders,
          },
        },
      });
    } else if (existing) {
      doc = await prisma.document.update({
        where: { id: existing.id },
        data: {
          metadata: {
            policyNumber: policyNumber || '',
            insurer: insurer || '',
            expirationDate: expirationDate || '',
            enableReminders: enableReminders === 'true' || enableReminders === true,
            reminders,
          },
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Upload a COI file before saving insurance details.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    res.json({ success: true, insurance: shapeInsurance(doc, user) });
  } catch (err) {
    console.error('[carrier.insurance] saveCarrierInsurance failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to save insurance' });
  }
}

async function deleteCarrierInsurance(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const existing = await prisma.document.findFirst({
      where: { userId, type: 'insurance' },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      return res.json({ success: true, deleted: false });
    }

    await prisma.document.delete({ where: { id: existing.id } });

    if (existing.storageType === 'local' && existing.filePath) {
      try { fs.unlinkSync(existing.filePath); } catch (_) { /* file may already be gone */ }
    }

    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error('[carrier.insurance] deleteCarrierInsurance failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete insurance' });
  }
}

module.exports = {
  upload: upload.single('file'),
  getCarrierInsurance,
  saveCarrierInsurance,
  deleteCarrierInsurance,
};
