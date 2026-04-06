#!/usr/bin/env node
/**
 * build.js — Christo et Doctrinae
 *
 * Reads all markdown articles from content/articles/,
 * parses their frontmatter (including YAML list fields like tags),
 * sorts by date (newest first), and writes to data/articles.json.
 */

const fs   = require('fs');
const path = require('path');

// ----------------------------------------------------------------
// Frontmatter parser — handles scalar values and YAML lists
// ----------------------------------------------------------------
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data  = {};
  const lines = match[1].split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colon = line.indexOf(':');
    if (colon === -1) { i++; continue; }

    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();

    if (val === '') {
      // Collect indented list items that follow
      const list = [];
      i++;
      while (i < lines.length && /^\s*-\s/.test(lines[i])) {
        list.push(lines[i].trim().slice(1).trim().replace(/^['"]|['"]$/g, ''));
        i++;
      }
      data[key] = list;
    } else {
      data[key] = val.replace(/^['"]|['"]$/g, '');
      i++;
    }
  }

  return { data, body: match[2] || '' };
}

function stripMarkdown(md) {
  return md
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------
const articlesDir = path.join(__dirname, 'content', 'articles');
const dataDir     = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let articles = [];

if (fs.existsSync(articlesDir)) {
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));

  articles = files.map(file => {
    const raw            = fs.readFileSync(path.join(articlesDir, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const plainBody      = stripMarkdown(body);

    // Normalise tags — may come in as a YAML list array or comma-separated string
    let tags = data.tags || [];
    if (typeof tags === 'string') {
      tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    return {
      slug:          file.replace(/\.md$/, ''),
      title:         data.title         || 'Untitled',
      subtitle:      data.subtitle      || '',
      author:        data.author        || '',
      date:          data.date          || '',
      series:        data.series        || '',
      print_edition: data.print_edition || '',
      cover_image:   data.cover_image   || '',
      tags:          tags,
      excerpt:       plainBody.slice(0, 220)
    };
  });

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
