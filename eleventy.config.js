// Eleventy config for the undercurrent films website.
// Content lives in src/projects (one file per project) and src/_data (site texts, team).
// Both are edited through Pages CMS (see .pages.yml).

import markdownIt from "markdown-it";

const md = markdownIt({ html: true, breaks: false, linkify: true });

function videoEmbed(url) {
  if (!url) return null;
  const s = String(url).trim();
  let m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  if (m) return { kind: "youtube", id: m[1], src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1` };
  m = s.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
  if (m) return { kind: "vimeo", id: m[1], src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1${m[2] ? "&h=" + m[2] : ""}` };
  m = s.match(/(?:iframe\.mediadelivery\.net|player\.mediadelivery\.net)\/(?:embed|play)\/(\d+)\/([\w-]+)/);
  if (m) return { kind: "bunny", id: m[2], src: `https://iframe.mediadelivery.net/embed/${m[1]}/${m[2]}?autoplay=true&preload=true` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(s)) return { kind: "file", src: s };
  return null;
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/media": "media" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });

  // Pick the field for the current language, falling back to English.
  eleventyConfig.addFilter("t", (obj, key, lang) => {
    if (!obj) return "";
    const v = obj[`${key}_${lang}`];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    return obj[`${key}_en`] ?? obj[key] ?? "";
  });

  // In the editor, words wrapped in *stars* are set in the italic serif.
  eleventyConfig.addFilter("accent", (s) =>
    String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*([^*]+)\*/g, '<em class="accent">$1</em>')
  );
  eleventyConfig.addWatchTarget("content/");
  // Rich-text fields may arrive as HTML or Markdown; both render correctly.
  eleventyConfig.addFilter("rich", (s) => md.render(String(s || "")));
  eleventyConfig.addFilter("projectUrl", (slug, lang, routes) => `${routes.work[lang]}${slug}/`);
  eleventyConfig.addFilter("embed", (url) => videoEmbed(url));
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("year", () => new Date().getFullYear());
  eleventyConfig.addFilter("isoDate", () => new Date().toISOString().slice(0, 10));
  eleventyConfig.addFilter("absolute", (path, base) => {
    if (!path) return "";
    if (/^https?:/.test(path)) return path;
    return base.replace(/\/$/, "") + path;
  });
  // Plain text from a rich-text field, for meta descriptions.
  eleventyConfig.addFilter("plain", (html) =>
    String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  );
  eleventyConfig.addFilter("truncate", (s, n = 155) => {
    s = String(s || "");
    return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
