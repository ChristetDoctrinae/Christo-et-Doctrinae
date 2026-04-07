/**
 * cloudinary.js — Netlify Function
 *
 * Proxies Cloudinary API calls for the Tina CMS media library
 * (next-tinacms-cloudinary TinaCloudCloudinaryMediaStore).
 *
 * Endpoints (all via the /api/cloudinary redirect in netlify.toml):
 *   GET    ?directory=&limit=&offset=   list assets
 *   POST   multipart/form-data          upload asset
 *   DELETE ?media=<public_id>           delete asset
 *
 * Required environment variables (set in Netlify UI):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

const cloudinary = require("cloudinary").v2;
const Busboy = require("busboy");
const { Readable } = require("stream");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// All Tina media is stored under this Cloudinary folder.
const ROOT_FOLDER = "tina-media";

// -----------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------
exports.handler = async (event) => {
  const method = event.httpMethod;

  // CORS pre-flight
  if (method === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }

  // ── GET: list assets ─────────────────────────────────────────────
  if (method === "GET") {
    const { directory = "", limit = "20", offset } =
      event.queryStringParameters || {};

    const prefix = [ROOT_FOLDER, directory].filter(Boolean).join("/") + "/";
    const maxResults = Math.min(parseInt(limit, 10) || 20, 100);

    try {
      const [imgResult, rawResult] = await Promise.all([
        cloudinary.api
          .resources({
            type: "upload",
            resource_type: "image",
            prefix,
            max_results: maxResults,
            next_cursor: offset || undefined,
          })
          .catch(() => ({ resources: [] })),
        cloudinary.api
          .resources({
            type: "upload",
            resource_type: "raw",
            prefix,
            max_results: maxResults,
          })
          .catch(() => ({ resources: [] })),
      ]);

      const resources = [
        ...(imgResult.resources || []),
        ...(rawResult.resources || []),
      ];

      const items = resources.map((r) => {
        const parts = r.public_id.split("/");
        const filename =
          parts[parts.length - 1] +
          (r.format ? "." + r.format : "");
        return {
          id: r.public_id,
          type: "file",
          directory: directory || "",
          src: r.secure_url,
          filename,
          thumbnails:
            r.resource_type === "image"
              ? [{ src: r.secure_url }]
              : undefined,
        };
      });

      return json(200, {
        items,
        offset: imgResult.next_cursor || null,
        limit: maxResults,
      });
    } catch (err) {
      return json(500, { error: err.message });
    }
  }

  // ── POST: upload asset ───────────────────────────────────────────
  if (method === "POST") {
    const contentType =
      event.headers["content-type"] ||
      event.headers["Content-Type"] ||
      "";

    if (!contentType.includes("multipart/form-data")) {
      return json(400, { error: "Expected multipart/form-data" });
    }

    return new Promise((resolve) => {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body, "binary");

      const bb = Busboy({ headers: { "content-type": contentType } });
      let directory = "";
      let uploadPromise = null;

      bb.on("field", (name, value) => {
        if (name === "directory") directory = value;
      });

      bb.on("file", (_field, fileStream, { filename, mimeType }) => {
        const folder = [ROOT_FOLDER, directory].filter(Boolean).join("/");
        const isPdf =
          (mimeType || "").includes("pdf") ||
          (filename || "").toLowerCase().endsWith(".pdf");

        uploadPromise = new Promise((res, rej) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type: isPdf ? "raw" : "auto",
              use_filename: true,
              unique_filename: false,
              overwrite: true,
            },
            (err, result) => (err ? rej(err) : res(result))
          );
          fileStream.pipe(stream);
        });
      });

      bb.on("finish", async () => {
        if (!uploadPromise) {
          resolve(json(400, { error: "No file found in request" }));
          return;
        }
        try {
          const result = await uploadPromise;
          const filename =
            result.original_filename +
            (result.format ? "." + result.format : "");
          resolve(
            json(200, {
              id: result.public_id,
              type: "file",
              directory: directory || "",
              src: result.secure_url,
              filename,
            })
          );
        } catch (err) {
          resolve(json(500, { error: err.message }));
        }
      });

      bb.on("error", (err) =>
        resolve(json(500, { error: err.message }))
      );

      const readable = new Readable();
      readable.push(rawBody);
      readable.push(null);
      readable.pipe(bb);
    });
  }

  // ── DELETE: remove asset ─────────────────────────────────────────
  if (method === "DELETE") {
    const { media } = event.queryStringParameters || {};
    if (!media) {
      return json(400, { error: "Missing ?media= parameter" });
    }

    try {
      // Try image first, then raw (for PDFs and other files)
      let result = await cloudinary.uploader.destroy(media, {
        resource_type: "image",
      });
      if (result.result === "not found") {
        result = await cloudinary.uploader.destroy(media, {
          resource_type: "raw",
        });
      }
      return json(200, { result });
    } catch (err) {
      return json(500, { error: err.message });
    }
  }

  return json(405, { error: "Method not allowed" });
};
