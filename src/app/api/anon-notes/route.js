import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const DATA_FILE = path.join(process.cwd(), "data", "anon-notes.json");

async function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  try { await fs.access(DATA_FILE); } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

async function read() {
  await ensureFile();
  try { return JSON.parse(await fs.readFile(DATA_FILE, "utf-8")); } catch { return []; }
}

async function write(data) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// GET /api/anon-notes?subjectId=xxx
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const all = await read();
  if (subjectId) {
    return NextResponse.json({ requests: all.filter((r) => r.subjectId === subjectId) });
  }
  return NextResponse.json({ requests: all });
}

// POST /api/anon-notes — create a new anonymous note request
export async function POST(request) {
  const body = await request.json();
  const { subjectId, subjectName, alias, date } = body;
  if (!subjectId || !alias) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const noteReq = {
    id: Date.now().toString(),
    subjectId,
    subjectName: subjectName || "Unknown",
    alias,
    date: date || new Date().toISOString(),
    uploads: 0,
    status: "active",
  };

  const all = await read();
  all.unshift(noteReq);
  if (all.length > 500) all.length = 500;
  await write(all);

  return NextResponse.json({ success: true, request: noteReq });
}

// DELETE /api/anon-notes — delete a request by id, or clear all by alias
export async function DELETE(request) {
  const body = await request.json();
  const { id, alias, clearAll } = body;
  const all = await read();

  let filtered;
  if (clearAll && alias) {
    // Clear all requests created by this alias
    filtered = all.filter((r) => r.alias !== alias);
  } else if (id) {
    // Delete a single request
    filtered = all.filter((r) => r.id !== id);
  } else {
    return NextResponse.json({ error: "Missing id or alias" }, { status: 400 });
  }

  await write(filtered);
  return NextResponse.json({ success: true });
}

// PATCH /api/anon-notes — update a request (e.g. increment uploads)
export async function PATCH(request) {
  const body = await request.json();
  const { id, uploads } = body;
  const all = await read();
  const updated = all.map((r) =>
    r.id === id ? { ...r, uploads: uploads ?? r.uploads } : r
  );
  await write(updated);
  return NextResponse.json({ success: true });
}
