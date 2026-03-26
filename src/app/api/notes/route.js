import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const DATA_FILE = path.join(process.cwd(), 'data', 'note-requests.json');

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function deriveRecipientEmails(classmates) {
  const emails = (classmates || [])
    .map((c) => normalizeEmail(c?.email))
    .filter(Boolean);
  return Array.from(new Set(emails));
}

async function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

async function readRequests() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeRequests(requests) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(requests, null, 2), 'utf-8');
}

// GET /api/notes?email=user@example.com — fetch requests sent by or to a user
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = normalizeEmail(searchParams.get('email'));

  const all = await readRequests();

  if (email) {
    const relevant = all.filter((r) => {
      const isSender = normalizeEmail(r.senderEmail) === email;
      const recipientEmails = Array.isArray(r.recipientEmails)
        ? r.recipientEmails.map(normalizeEmail).filter(Boolean)
        : [];
      const isUploader = Array.isArray(r.uploads)
        ? r.uploads.some((u) => normalizeEmail(u?.uploaderEmail) === email)
        : false;
      const hasReactionFromUser = Array.isArray(r.reactions)
        ? r.reactions.some((rea) => normalizeEmail(rea?.fromEmail) === email)
        : false;
      const isRecipient =
        recipientEmails.includes(email) ||
        (r.method === 'in-app' &&
          (r.classmates || []).some(
            (c) =>
              normalizeEmail(c?.email) === email ||
              // Backward-compat: older requests sometimes stored an email in `name` with `email: ""`.
              normalizeEmail(c?.name) === email
          ));
      return isSender || isRecipient || isUploader || hasReactionFromUser;
    });
    return NextResponse.json({ requests: relevant });
  }

  return NextResponse.json({ requests: all });
}

// POST /api/notes — send a new note request
export async function POST(request) {
  const body = await request.json();
  const { senderEmail, senderName, subjectName, classmates, message, method } = body;

  if (!classmates || classmates.length === 0) {
    return NextResponse.json({ error: 'No classmates specified' }, { status: 400 });
  }

  const normalizedMethod = method || 'in-app';
  const recipientEmails = deriveRecipientEmails(classmates);
  if (normalizedMethod === 'in-app' && recipientEmails.length === 0) {
    return NextResponse.json(
      { error: 'In-app requests require at least one recipient email' },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const noteRequest = {
    id: Date.now().toString(),
    senderEmail: normalizeEmail(senderEmail),
    senderName: senderName || 'A classmate',
    subjectName: subjectName || 'Unknown',
    classmates,
    recipientEmails,
    message: message || '',
    method: normalizedMethod,
    date: nowIso,
    updatedAt: nowIso,
    status: 'sent',
    uploads: [],
    reactions: [],
  };

  const all = await readRequests();
  all.unshift(noteRequest);

  // Keep only last 200 requests to prevent file bloat
  if (all.length > 200) all.length = 200;

  await writeRequests(all);

  return NextResponse.json({ success: true, request: noteRequest });
}

// PATCH /api/notes — mark a request as viewed
export async function PATCH(request) {
  const body = await request.json();
  const { id, status } = body;

  const all = await readRequests();
  const updated = all.map((r) =>
    r.id === id
      ? { ...r, status: status || 'viewed', updatedAt: new Date().toISOString() }
      : r
  );

  await writeRequests(updated);
  return NextResponse.json({ success: true });
}

// DELETE /api/notes — delete a request by id, or clear all by senderEmail
export async function DELETE(request) {
  const body = await request.json();
  const { id, senderEmail, clearAll } = body;

  const all = await readRequests();
  let filtered;

  if (clearAll && senderEmail) {
    // Clear all requests created by this sender
    const normEmail = normalizeEmail(senderEmail);
    filtered = all.filter((r) => normalizeEmail(r.senderEmail) !== normEmail);
  } else if (id) {
    // Delete a single request
    filtered = all.filter((r) => r.id !== id);
  } else {
    return NextResponse.json({ error: 'Missing id or senderEmail' }, { status: 400 });
  }

  await writeRequests(filtered);
  return NextResponse.json({ success: true });
}
