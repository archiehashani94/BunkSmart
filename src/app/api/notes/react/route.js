import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const DATA_FILE = path.join(process.cwd(), "data", "note-requests.json");

async function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

async function readRequests() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeRequests(requests) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(requests, null, 2), "utf-8");
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const requestId = body?.id || body?.requestId;
    const fromEmail = normalizeEmail(body?.fromEmail);
    const fromName = (body?.fromName || "").toString().trim() || undefined;
    const type = body?.type;

    const allowed = ["thumbs_up", "thanks"];
    if (!requestId || !fromEmail) {
      return NextResponse.json({ error: "Missing requestId/fromEmail" }, { status: 400 });
    }
    if (!allowed.includes(type)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const all = await readRequests();
    const idx = all.findIndex((r) => r.id === requestId);
    if (idx === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const prevReq = all[idx] || {};
    const reactions = Array.isArray(prevReq.reactions) ? prevReq.reactions : [];

    // Prevent duplicates of the same type per user.
    const already = reactions.some(
      (r) => normalizeEmail(r?.fromEmail) === fromEmail && r?.type === type
    );

    const nextReactions = already
      ? reactions
      : [
          ...reactions,
          {
            id: `${Date.now().toString()}_${Math.random().toString(16).slice(2)}`,
            fromEmail,
            fromName,
            type,
            createdAt: new Date().toISOString(),
          },
        ];

    const updatedReq = {
      ...prevReq,
      reactions: nextReactions,
      updatedAt: new Date().toISOString(),
    };

    all[idx] = updatedReq;
    await writeRequests(all);

    return NextResponse.json({ success: true, request: updatedReq });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Reaction failed" },
      { status: 500 }
    );
  }
}

