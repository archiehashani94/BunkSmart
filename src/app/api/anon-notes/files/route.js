import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "notes");

// GET /api/anon-notes/files?requestId=xxx
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  const metaFile = path.join(UPLOAD_DIR, requestId, "_meta.json");
  try {
    const raw = await fs.readFile(metaFile, "utf-8");
    const files = JSON.parse(raw);
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
