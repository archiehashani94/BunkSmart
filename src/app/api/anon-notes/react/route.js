import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const DATA_FILE = path.join(process.cwd(), "data", "anon-notes.json");

async function ensureFile() {
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
  await ensureFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeRequests(requests) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(requests, null, 2), "utf-8");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const requestId = (body?.requestId || body?.id || "").toString().trim();
    const fromAlias = (body?.fromAlias || "").toString().trim();
    const type = body?.type;

    const allowed = ["thumbs_up", "thanks"];
    if (!requestId || !fromAlias) {
      return NextResponse.json({ error: "Missing requestId/fromAlias" }, { status: 400 });
    }
    if (!allowed.includes(type)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const all = await readRequests();
    const idx = all.findIndex((r) => r.id === requestId);
    if (idx === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const prev = all[idx] || {};
    const reactions = Array.isArray(prev.reactions) ? prev.reactions : [];

    const already = reactions.some((r) => r?.type === type && (r?.fromAlias || "") === fromAlias);
    const nextReactions = already
      ? reactions
      : [
          ...reactions,
          {
            id: `${Date.now().toString()}_${Math.random().toString(16).slice(2)}`,
            fromAlias,
            type,
            createdAt: new Date().toISOString(),
          },
        ];

    all[idx] = {
      ...prev,
      reactions: nextReactions,
      updatedAt: new Date().toISOString(),
    };

    await writeRequests(all);
    return NextResponse.json({ success: true, request: all[idx] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Reaction failed" }, { status: 500 });
  }
}

