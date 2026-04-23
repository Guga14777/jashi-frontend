// server/controllers/admin/admin.notes.controller.cjs
// Admin-only notes attached to a booking. Soft-delete so history survives.

const prisma = require('../../db.cjs');

async function ensureBooking(id) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, orderNumber: true },
  });
  return booking;
}

function shapeNote(n) {
  return {
    id: n.id,
    bookingId: n.bookingId,
    body: n.body,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    author: n.author
      ? {
          id: n.author.id,
          name: [n.author.firstName, n.author.lastName].filter(Boolean).join(' ') || n.author.email,
          email: n.author.email,
        }
      : null,
  };
}

// GET /api/admin/orders/:id/notes
exports.listNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await ensureBooking(id);
    if (!booking) return res.status(404).json({ error: 'Order not found' });

    const notes = await prisma.adminNote.findMany({
      where: { bookingId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        // We don't have a FK relation on AdminNote.authorId for safety
        // (no User cascade). Hand-join the author name.
      },
    });

    const authorIds = [...new Set(notes.map((n) => n.authorId).filter(Boolean))];
    const authors = authorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const authorById = new Map(authors.map((u) => [u.id, u]));

    res.json({
      notes: notes.map((n) => shapeNote({ ...n, author: authorById.get(n.authorId) })),
    });
  } catch (err) {
    console.error('[admin-notes] list error:', err);
    res.status(500).json({ error: 'Failed to list notes' });
  }
};

// POST /api/admin/orders/:id/notes  { body: string }
exports.createNote = async (req, res) => {
  try {
    const { id } = req.params;
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Note body is required' });
    if (body.length > 4000) return res.status(400).json({ error: 'Note is too long (max 4000 chars)' });

    const booking = await ensureBooking(id);
    if (!booking) return res.status(404).json({ error: 'Order not found' });

    const note = await prisma.adminNote.create({
      data: { bookingId: id, authorId: req.userId, body },
    });

    await prisma.accountEvent.create({
      data: {
        userId: req.userId,
        eventType: 'admin_note_created',
        eventData: { noteId: note.id, orderId: id, orderNumber: booking.orderNumber },
      },
    }).catch(() => {});

    res.json({ success: true, note: shapeNote({ ...note, author: null }) });
  } catch (err) {
    console.error('[admin-notes] create error:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

// PATCH /api/admin/notes/:noteId  { body: string }
exports.updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Note body is required' });

    const existing = await prisma.adminNote.findUnique({ where: { id: noteId } });
    if (!existing || existing.deletedAt) return res.status(404).json({ error: 'Note not found' });

    // Only the author or super-admins can edit. Default (no super) → author only.
    const isSuper = String(req.userRoles || '').toUpperCase().includes('ADMIN_SUPER');
    if (existing.authorId !== req.userId && !isSuper) {
      return res.status(403).json({ error: 'Only the note author can edit this note' });
    }

    const note = await prisma.adminNote.update({
      where: { id: noteId },
      data: { body },
    });

    await prisma.accountEvent.create({
      data: {
        userId: req.userId,
        eventType: 'admin_note_updated',
        eventData: { noteId, orderId: note.bookingId, before: existing.body, after: body },
      },
    }).catch(() => {});

    res.json({ success: true, note: shapeNote({ ...note, author: null }) });
  } catch (err) {
    console.error('[admin-notes] update error:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
};

// DELETE /api/admin/notes/:noteId  — soft delete
exports.deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const existing = await prisma.adminNote.findUnique({ where: { id: noteId } });
    if (!existing || existing.deletedAt) return res.status(404).json({ error: 'Note not found' });

    const isSuper = String(req.userRoles || '').toUpperCase().includes('ADMIN_SUPER');
    if (existing.authorId !== req.userId && !isSuper) {
      return res.status(403).json({ error: 'Only the note author can delete this note' });
    }

    await prisma.adminNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    await prisma.accountEvent.create({
      data: {
        userId: req.userId,
        eventType: 'admin_note_deleted',
        eventData: { noteId, orderId: existing.bookingId, body: existing.body },
      },
    }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('[admin-notes] delete error:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
};
