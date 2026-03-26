import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "notes");

// POST /api/anon-notes/upload — handle file upload
export async function POST(request) {
  try {
    const formData = await request.formData();
    const requestId = formData.get("requestId");
    const alias = formData.get("alias");
    const files = formData.getAll("files");

    if (!requestId || !files || files.length === 0) {
      return NextResponse.json({ error: "Missing requestId or files" }, { status: 400 });
    }

    const dir = path.join(UPLOAD_DIR, requestId);
    await fs.mkdir(dir, { recursive: true });

    const savedFiles = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Sanitize filename
      const origName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = Date.now();
      const filename = `${timestamp}_${origName}`;
      const filepath = path.join(dir, filename);

      await fs.writeFile(filepath, buffer);

      savedFiles.push({
        id: `${timestamp}`,
        name: origName,
        filename,
        type: file.type,
        size: buffer.length,
        url: `/uploads/notes/${requestId}/${filename}`,
        uploaderAlias: alias || "Anonymous",
        uploadedAt: new Date().toISOString(),
      });
    }

    // Update the metadata file for this request
    const metaFile = path.join(dir, "_meta.json");
    let existing = [];
    try {
      const raw = await fs.readFile(metaFile, "utf-8");
      existing = JSON.parse(raw);
    } catch {}
    existing.push(...savedFiles);
    await fs.writeFile(metaFile, JSON.stringify(existing, null, 2), "utf-8");

    // Update upload count in anon-notes.json
    const notesFile = path.join(process.cwd(), "data", "anon-notes.json");
    try {
      const raw = await fs.readFile(notesFile, "utf-8");
      const all = JSON.parse(raw);
      const updated = all.map((r) =>
        r.id === requestId ? { ...r, uploads: (r.uploads || 0) + savedFiles.length } : r
      );
      await fs.writeFile(notesFile, JSON.stringify(updated, null, 2), "utf-8");
    } catch {}

    return NextResponse.json({ success: true, files: savedFiles });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
