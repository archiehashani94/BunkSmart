import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/utils/firebaseAdmin";

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

function sanitizeFilename(name) {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function requireString(val, name) {
  if (typeof val !== "string" || !val.trim()) {
    throw new Error(`Missing ${name}`);
  }
  return val.trim();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function safePublicUrl(urlPath) {
  // Keep it consistent for both Windows and POSIX paths.
  return urlPath.replaceAll("\\", "/");
}

async function uploadLocally({ files, requestId, uploaderEmail }) {
  const baseDir = path.join(process.cwd(), "public", "uploads", "notes", requestId);
  await ensureDir(baseDir);

  const now = Date.now();
  const uploaded = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = sanitizeFilename(file.name);
    const uploadId = `${now}_${i}_${Math.random().toString(16).slice(2)}`;
    const filename = `${uploadId}_${safeName}`;

    const filepath = path.join(baseDir, filename);
    await fs.writeFile(filepath, buffer);

    uploaded.push({
      id: uploadId,
      name: safeName,
      contentType: file.type || "",
      size: buffer.length,
      storagePath: filepath,
      downloadUrl: safePublicUrl(`/uploads/notes/${requestId}/${filename}`),
      uploadedAt: new Date().toISOString(),
      uploaderEmail,
    });
  }

  return uploaded;
}

// POST /api/notes/upload — upload files for a note request (Firebase Storage)
export async function POST(request) {
  try {
    const formData = await request.formData();
    const requestId = requireString(formData.get("requestId"), "requestId");
    const uploaderEmail = normalizeEmail(requireString(formData.get("uploaderEmail"), "uploaderEmail"));
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const all = await readRequests();
    const idx = all.findIndex((r) => r.id === requestId);
    if (idx === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const now = Date.now();
    let uploaded = [];

    try {
      const admin = getFirebaseAdmin();
      const bucket = admin.storage().bucket();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const safeName = sanitizeFilename(file.name);
        const uploadId = `${now}_${i}_${Math.random().toString(16).slice(2)}`;
        const storagePath = `notes/${requestId}/${uploadId}_${safeName}`;

        const blob = bucket.file(storagePath);
        await blob.save(buffer, {
          contentType: file.type || "application/octet-stream",
          resumable: false,
          metadata: {
            metadata: {
              requestId,
              uploaderEmail,
              originalName: safeName,
            },
          },
        });

        const [downloadUrl] = await blob.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        uploaded.push({
          id: uploadId,
          name: safeName,
          contentType: file.type || "",
          size: buffer.length,
          storagePath,
          downloadUrl,
          uploadedAt: new Date().toISOString(),
          uploaderEmail,
        });
      }
    } catch (err) {
      // Firebase isn't configured (missing env vars, invalid credentials, etc).
      // Fall back to local uploads so the feature keeps working.
      uploaded = await uploadLocally({ files, requestId, uploaderEmail });
    }

    const next = [...all];
    const prevReq = next[idx] || {};
    const prevUploads = Array.isArray(prevReq.uploads) ? prevReq.uploads : [];
    const updatedReq = {
      ...prevReq,
      uploads: [...prevUploads, ...uploaded],
      status: "fulfilled",
      updatedAt: new Date().toISOString(),
    };
    next[idx] = updatedReq;
    await writeRequests(next);

    return NextResponse.json({ success: true, request: updatedReq, uploads: uploaded });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

