// Reads the project files edited in Pages CMS (content/projects/*.md).
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.resolve("content/projects");

export default function () {
  const list = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const data = matter.read(path.join(DIR, f)).data || {};
      data.slug = String(data.slug || f.replace(/\.md$/, ""))
        .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return data;
    })
    .filter((p) => p.published !== false && p.client)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const pages = [];
  for (const lang of ["en", "de"]) {
    list.forEach((p, i) => {
      const next = list[(i + 1) % list.length];
      pages.push({ lang, project: p, slug: p.slug, next, nextSlug: next.slug });
    });
  }
  return {
    all: list,
    featured: list.filter((p) => p.home),
    extra: list.filter((p) => !p.home),
    pages,
  };
}
