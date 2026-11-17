// Legal texts edited in Pages CMS (content/legal/*.md).
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.resolve("content/legal");

export default function () {
  const out = {};
  for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
    const { data, content } = matter.read(path.join(DIR, f));
    out[f.replace(/\.md$/, "").replace(/-/g, "_")] = { title: data.title || "", body: content };
  }
  return out;
}
