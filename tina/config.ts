import { defineConfig } from "tinacms";

// ---------------------------------------------------------------------------
// Tina CMS Configuration — Christo et Doctrinae
//
// Backend:  Tina Cloud (handles auth + Git commits)
// Media:    Cloudinary (via next-tinacms-cloudinary + Netlify Function)
// Setup:
//   1. Create a project at https://app.tina.io
//   2. Set TINA_CLIENT_ID and TINA_TOKEN in Netlify environment variables
//   3. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//      in Netlify environment variables
//   4. Visit /admin to log in
// ---------------------------------------------------------------------------

export default defineConfig({
  branch: process.env.TINA_BRANCH || process.env.HEAD || "main",
  clientId: process.env.TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,

  build: {
    // Outputs the compiled admin app into the ./admin/ folder,
    // relative to the site root (".").
    outputFolder: "admin",
    publicFolder: ".",
  },

  media: {
    // Cloudinary media library via a Netlify Function proxy.
    // The function lives at netlify/functions/cloudinary.js and is
    // reachable at /api/cloudinary via the redirect in netlify.toml.
    loadCustomStore: async () => {
      const pack = await import("next-tinacms-cloudinary");
      return pack.TinaCloudCloudinaryMediaStore;
    },
  },

  schema: {
    collections: [

      // ----------------------------------------------------------------
      // SERIES — create and manage series; articles reference them
      // ----------------------------------------------------------------
      {
        name: "series",
        label: "Series",
        path: "content/series",
        format: "md",
        ui: {
          allowedActions: { create: true, delete: true },
          filename: {
            slugify: (values) =>
              (values?.name ?? "")
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, ""),
          },
        },
        fields: [
          {
            name: "name",
            type: "string",
            label: "Series Name",
            isTitle: true,
            required: true,
            description:
              "The full series name, e.g. 'Holy Week Series' or 'The Saints'",
          },
          {
            name: "is_yearly",
            type: "boolean",
            label: "Is Yearly Series?",
            description:
              "Yearly series (e.g. Holy Week, Advent) group articles by year on the series page. Non-yearly series show a flat list.",
          },
          {
            name: "description",
            type: "string",
            label: "Description",
            ui: { component: "textarea" },
            description: "Brief description shown on the Series page (1–3 sentences)",
          },
        ],
      },

      // ----------------------------------------------------------------
      // TAGS — create and delete tags; articles reference them by name
      // ----------------------------------------------------------------
      {
        name: "tags",
        label: "Tags",
        path: "content/tags",
        format: "md",
        ui: {
          allowedActions: { create: true, delete: true },
          filename: {
            slugify: (values) =>
              (values?.name ?? "").toLowerCase().replace(/\s+/g, "-"),
          },
        },
        fields: [
          {
            name: "name",
            type: "string",
            label: "Tag Name",
            isTitle: true,
            required: true,
            description: "Use lowercase, e.g. theology, art, culture, poetry",
          },
        ],
      },

      // ----------------------------------------------------------------
      // ARTICLES — create, edit, and publish articles
      // ----------------------------------------------------------------
      {
        name: "articles",
        label: "Articles",
        path: "content/articles",
        format: "md",
        ui: {
          allowedActions: { create: true, delete: true },
          filename: {
            slugify: (values) =>
              (values?.title ?? "")
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, ""),
          },
        },
        fields: [
          {
            name: "title",
            type: "string",
            label: "Title",
            isTitle: true,
            required: true,
            description: "The article's main title",
          },
          {
            name: "subtitle",
            type: "string",
            label: "Subtitle",
            description:
              "A short description shown beneath the title on cards and the article page",
          },
          {
            name: "author",
            type: "string",
            label: "Author",
            required: true,
            description: "Author's full name (student authors only)",
          },
          {
            name: "date",
            type: "string",
            label: "Publication Date",
            description:
              "Display date for the article. Format: YYYY-MM-DD (e.g. 2025-04-06)",
          },
          {
            name: "publish_date",
            type: "datetime",
            label: "Scheduled Publish Date",
            description:
              "Leave blank to publish immediately on next deploy. Set a future date/time to hold the article until that moment. A scheduled Netlify build hook is required to auto-publish at the set time.",
          },
          {
            name: "tags",
            type: "string",
            label: "Tags",
            list: true,
            description:
              "Up to 3 tags. Enter each tag name exactly as it appears in the Tags section (e.g. theology, art, poetry).",
          },
          {
            name: "series",
            type: "string",
            label: "Series",
            description:
              "Enter the series name exactly, e.g. 'Holy Week Series'. Leave blank for standalone articles.",
          },
          {
            name: "series_year",
            type: "string",
            label: "Series Year",
            description:
              "For yearly series only (Holy Week, Advent): enter the 4-digit year, e.g. 2025. Leave blank for non-yearly series.",
          },
          {
            name: "print_edition",
            type: "string",
            label: "Print Edition",
            description:
              "e.g. Spring 2025 — leave blank for digital/online-only articles",
          },
          {
            name: "cover_image",
            type: "image",
            label: "Cover Image",
            description:
              "Upload a cover image (JPG, PNG, WEBP, or GIF). Appears as the thumbnail on article cards and the article header.",
          },
          {
            name: "focal_point",
            type: "string",
            label: "Cover Image Focal Point",
            options: [
              { label: "Center (default)", value: "center" },
              { label: "Top",             value: "top" },
              { label: "Bottom",          value: "bottom" },
              { label: "Left",            value: "left" },
              { label: "Right",           value: "right" },
              { label: "Top Left",        value: "top-left" },
              { label: "Top Right",       value: "top-right" },
              { label: "Bottom Left",     value: "bottom-left" },
              { label: "Bottom Right",    value: "bottom-right" },
            ],
            description:
              "Which part of the cover image stays in frame when cropped to a thumbnail card?",
          },
          {
            name: "body",
            type: "rich-text",
            label: "Article Content",
            isBody: true,
            description:
              "Write or paste the full article here. To position an inline image, set its alt text to: left|caption, right|caption, full|caption, or center|caption",
          },
        ],
      },

      // ----------------------------------------------------------------
      // FEATURED ARTICLES — select up to 2 for the homepage
      // ----------------------------------------------------------------
      {
        name: "featured",
        label: "Featured Articles",
        path: "data",
        match: { include: "featured" },
        format: "json",
        ui: {
          allowedActions: { create: false, delete: false },
          global: true,
          router: () => "/",
        },
        fields: [
          {
            name: "featured_articles",
            type: "string",
            label: "Featured Article Slugs (max 2)",
            list: true,
            description:
              "Enter the slug (filename without .md) of each article to feature on the homepage. Maximum 2 — remove one before adding another.",
          },
        ],
      },

      // ----------------------------------------------------------------
      // TEAM MEMBERS — About page editorial board
      // ----------------------------------------------------------------
      {
        name: "team",
        label: "Team Members",
        path: "data",
        match: { include: "team" },
        format: "json",
        ui: {
          allowedActions: { create: false, delete: false },
          global: true,
          router: () => "/about.html",
        },
        fields: [
          {
            name: "editor_in_chief",
            type: "object",
            label: "Editor in Chief",
            fields: [
              { name: "name",     type: "string", label: "Name" },
              { name: "title",    type: "string", label: "Title" },
              { name: "major",    type: "string", label: "Major of Study" },
              { name: "year",     type: "string", label: "Year at School",   description: "e.g. Class of 2025" },
              { name: "hometown", type: "string", label: "Hometown & State", description: "e.g. Nashville, TN" },
            ],
          },
          {
            name: "managing_editor",
            type: "object",
            label: "Managing Editor",
            fields: [
              { name: "name",     type: "string", label: "Name" },
              { name: "title",    type: "string", label: "Title" },
              { name: "major",    type: "string", label: "Major of Study" },
              { name: "year",     type: "string", label: "Year at School" },
              { name: "hometown", type: "string", label: "Hometown & State" },
            ],
          },
          {
            name: "chief_of_design",
            type: "object",
            label: "Chief of Design",
            fields: [
              { name: "name",     type: "string", label: "Name" },
              { name: "title",    type: "string", label: "Title" },
              { name: "major",    type: "string", label: "Major of Study" },
              { name: "year",     type: "string", label: "Year at School" },
              { name: "hometown", type: "string", label: "Hometown & State" },
            ],
          },
          {
            name: "contributors",
            type: "object",
            label: "Contributors",
            list: true,
            ui: {
              itemProps: (item) => ({
                label: item?.name ? `${item.name} — ${item.title ?? ""}` : "New Contributor",
              }),
            },
            fields: [
              { name: "name",     type: "string", label: "Name" },
              { name: "title",    type: "string", label: "Title" },
              { name: "major",    type: "string", label: "Major of Study" },
              { name: "year",     type: "string", label: "Year at School" },
              { name: "hometown", type: "string", label: "Hometown & State" },
            ],
          },
        ],
      },

      // ----------------------------------------------------------------
      // SUBMISSIONS PAGE — deadlines and guidelines
      // ----------------------------------------------------------------
      {
        name: "submissions",
        label: "Submissions Page",
        path: "data",
        match: { include: "submissions" },
        format: "json",
        ui: {
          allowedActions: { create: false, delete: false },
          global: true,
          router: () => "/submissions.html",
        },
        fields: [
          {
            name: "deadline_text",
            type: "string",
            label: "Current Deadline Text",
            ui: { component: "textarea" },
            description:
              "Appears in the info box at the top of the Submissions page",
          },
          {
            name: "scholarly_guidelines",
            type: "string",
            label: "Scholarly & Critical Writing Guidelines",
            list: true,
          },
          {
            name: "creative_guidelines",
            type: "string",
            label: "Creative Writing & Poetry Guidelines",
            list: true,
          },
          {
            name: "visual_guidelines",
            type: "string",
            label: "Visual Art & Photography Guidelines",
            list: true,
          },
          {
            name: "eligibility_guidelines",
            type: "string",
            label: "Eligibility & Process Guidelines",
            list: true,
          },
        ],
      },

      // ----------------------------------------------------------------
      // PRINT EDITIONS — manage each print edition
      // ----------------------------------------------------------------
      {
        name: "print_editions",
        label: "Print Editions",
        path: "content/editions",
        format: "md",
        ui: {
          allowedActions: { create: true, delete: true },
          filename: {
            slugify: (values) =>
              (values?.title ?? "")
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, ""),
          },
        },
        fields: [
          {
            name: "title",
            type: "string",
            label: "Title",
            isTitle: true,
            required: true,
            description: "e.g. Volume III",
          },
          {
            name: "theme",
            type: "string",
            label: "Theme",
            description:
              "The edition's thematic title, e.g. Love & Justice",
          },
          {
            name: "season",
            type: "string",
            label: "Season / Date",
            description: "e.g. Spring 2025",
          },
          {
            name: "volume_number",
            type: "number",
            label: "Volume Number",
            description:
              "Used to sort editions — higher number = more recent",
          },
          {
            name: "page_count",
            type: "number",
            label: "Page Count",
          },
          {
            name: "contents",
            type: "string",
            label: "Contents",
            description:
              "Short summary, e.g. 9 essays · 5 poems · 1 short story · Perfect bound",
          },
          {
            name: "description",
            type: "string",
            label: "Description",
            ui: { component: "textarea" },
            description:
              "1–3 sentence description shown on the Print Editions page",
          },
          {
            name: "pdf_file",
            type: "image",
            label: "PDF File",
            description:
              "Upload the PDF of this edition via Cloudinary. When set, clicking the edition opens the flipbook viewer.",
          },
        ],
      },

      // ----------------------------------------------------------------
      // SITE SETTINGS — editor email and other site-wide settings
      // ----------------------------------------------------------------
      {
        name: "settings",
        label: "Site Settings",
        path: "data",
        match: { include: "settings" },
        format: "json",
        ui: {
          allowedActions: { create: false, delete: false },
          global: true,
        },
        fields: [
          {
            name: "editor_email",
            type: "string",
            label: "Editor in Chief Email",
            description:
              "Displayed in the Contact section of the About page",
          },
        ],
      },
    ],
  },
});
