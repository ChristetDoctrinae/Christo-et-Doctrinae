#!/usr/bin/env node
/**
 * build.js — Christo et Doctrinae
 *
 * Reads all markdown articles from content/articles/,
 * parses their frontmatter, sorts by date (newest first),
 * and writes the result to data/articles.json.
 *
 * The homepage JavaScript fetches data/articles.json to display
 * the three most recently published articles automatically.
 *
 * Run:  node build.js
 * Or:   Netlify runs this automatically on every deploy (see netlify.toml)
 */

const fs   = require('fs');
const path = require('path');

// ----------------------------------------------------------------
// Simple YAML frontmatter parser
// ----------------------------------------------------------------
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data = {};
  match[1].split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    const key = line.slice(0, colon).trim();
    let val    = line.slice(colon + 1).trim();
    // Strip surrounding quotes
    val = val.replace(/^['"]|['"]$/g, '');
    data[key] = val;
  });

  return { data, body: match[2] || '' };
}

// ----------------------------------------------------------------
// Strip markdown syntax for plain-text excerpts
// ----------------------------------------------------------------
function stripMarkdown(md) {
  return md
    .replace(/#{1,6}\s+/g, '')   // headings
    .replace(/[*_`]/g, '')        // bold/italic/code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\n+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------
const articlesDir = path.join(__dirname, 'content', 'articles');
const dataDir     = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let articles = [];

if (fs.existsSync(articlesDir)) {
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));

  articles = files.map(file => {
    const raw             = fs.readFileSync(path.join(articlesDir, file), 'utf8');
    const { data, body }  = parseFrontmatter(raw);
    const plainBody       = stripMarkdown(body);

    return {
      slug:          file.replace(/\.md$/, ''),
      title:         data.title         || 'Untitled',
      subtitle:      data.subtitle      || '',
      author:        data.author        || '',
      date:          data.date          || '',
      series:        data.series        || '',
      print_edition: data.print_edition || '',
      cover_image:   data.cover_image   || '',
      excerpt:       plainBody.slice(0, 220)
    };
  });

  // Sort newest first
  articles.sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(0);
    const db = b.date ? new Date(b.date) : new Date(0);
    return db - da;
  });
}

fs.writeFileSync(
  path.join(dataDir, 'articles.json'),
  JSON.stringify(articles, null, 2)
);

console.log(`✓ Built ${articles.length} article${articles.length !== 1 ? 's' : ''} → data/articles.json`);
