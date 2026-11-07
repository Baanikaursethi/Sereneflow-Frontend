#!/usr/bin/env node
/**
 * ============================================================
 * POST-EXPORT SEO PASS  (website build only)
 * ============================================================
 * `expo export --platform web` produces a client-rendered
 * dist/index.html with no SEO metadata. Crawlers (and any tool that
 * does not execute JS) therefore see an empty document, and social
 * previews have no Open Graph tags at all.
 *
 * This script runs after the export and only touches build output:
 *   1. injects title / description / canonical / OG / Twitter /
 *      robots / theme-color / JSON-LD into dist/index.html
 *   2. adds a <noscript> fallback (one <h1>, real copy, CTA link) so
 *      the public page is meaningful without JavaScript
 *   3. writes dist/robots.txt and dist/sitemap.xml
 *   4. copies the app icon to dist/og-image.png (social preview)
 *
 * It does not change the app's architecture, routing or UI.
 * The production origin comes from SITE_URL and falls back to the
 * custom domain already used in the app's legal screens.
 * ============================================================
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SITE_URL = (process.env.SITE_URL || "https://sereneflow.app").replace(/\/+$/, "");
const CONTACT_EMAIL = "sereneflow27@gmail.com";

const TITLE = "Serene Flow — Private Journal, Mood Tracking & Calming Sounds";
const DESCRIPTION =
  "A calm, private space for your mind: a journal that stays on your device, mood check-ins with history, guided breathing exercises and synthesised calming sounds.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const faqs = [
  {
    q: "Is my journal private?",
    a: "Journal entries are written to your device's local app storage and are not sent to the Serene Flow servers. They are only readable from the account that created them on that device, and you can delete any entry at any time.",
  },
  {
    q: "Do I need an account to use Serene Flow?",
    a: "You need an account for mood check-ins and Spaces. Sign-up requires email verification, and you can delete your account from your Profile at any time.",
  },
  {
    q: "Can I post in Spaces anonymously?",
    a: "Yes. Spaces lets you post and reply anonymously, in which case your name and avatar are not shown to other people. Posts are checked by an automatic safety filter before they are published.",
  },
  {
    q: "Is Serene Flow a substitute for therapy or emergency help?",
    a: "No. Serene Flow is a general wellbeing tool, not medical or crisis care. If you are in danger or in crisis, contact your local emergency services or a crisis line such as 988 in the US.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: "Serene Flow",
      url: `${SITE_URL}/`,
      applicationCategory: "HealthApplication",
      operatingSystem: "Android, Web",
      description: DESCRIPTION,
      image: OG_IMAGE,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Private on-device journal",
        "Mood check-ins and mood history",
        "Guided breathing exercises",
        "Calming ambient sounds",
        "Anonymous community support in Spaces",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Serene Flow",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/og-image.png`,
      email: CONTACT_EMAIL,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: CONTACT_EMAIL,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function headTags() {
  return [
    `<title>${esc(TITLE)}</title>`,
    `<meta name="description" content="${esc(DESCRIPTION)}" />`,
    `<meta name="keywords" content="journal app, mood tracker, breathing exercises, calming sounds, mindfulness, mental wellbeing, private journal, anxiety relief" />`,
    `<link rel="canonical" href="${SITE_URL}/" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta name="googlebot" content="index, follow" />`,
    `<meta name="theme-color" content="#0D0717" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Serene Flow" />`,
    `<meta property="og:title" content="${esc(TITLE)}" />`,
    `<meta property="og:description" content="${esc(DESCRIPTION)}" />`,
    `<meta property="og:url" content="${SITE_URL}/" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:alt" content="Serene Flow app icon — a glowing purple drop" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(TITLE)}" />`,
    `<meta name="twitter:description" content="${esc(DESCRIPTION)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join("\n    ");
}

function noscriptBlock() {
  const faqHtml = faqs
    .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
    .join("");
  return `<noscript data-sereneflow-seo="1">
      <div style="max-width:680px;margin:0 auto;padding:32px 20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#E8D8FF;background:#0D0717">
        <h1>Serene Flow — a calm, private space for your mind</h1>
        <p>${esc(DESCRIPTION)}</p>
        <p><a href="${SITE_URL}/" style="color:#CFA7FF">Open Serene Flow</a> · <a href="mailto:${CONTACT_EMAIL}" style="color:#CFA7FF">Contact us</a></p>
        <h2>What you can do in Serene Flow</h2>
        <ul>
          <li>Write journal entries that stay on your device</li>
          <li>Check in with your mood and review your mood history</li>
          <li>Follow guided breathing exercises (4-4, 4-7-8, box and grounding)</li>
          <li>Listen to five synthesised calming soundscapes</li>
          <li>Share and reply anonymously in Spaces</li>
        </ul>
        <h2>Frequently asked questions</h2>
        ${faqHtml}
        <p>Serene Flow is not a substitute for professional medical or crisis care.</p>
      </div>
    </noscript>`;
}

function writeIndex() {
  const indexPath = path.join(DIST, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`dist/index.html not found — run "expo export --platform web" first (${indexPath})`);
  }
  let html = fs.readFileSync(indexPath, "utf8");

  // Remove any title/SEO tags the export already emitted so we never emit
  // duplicate titles or conflicting canonicals.
  html = html.replace(/<title>[\s\S]*?<\/title>/gi, "");
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, "");
  html = html.replace(/<meta\s+name="keywords"[^>]*>/gi, "");

  if (!/lang="[^"]*"/.test(html.slice(0, 400))) {
    html = html.replace(/<html\b/i, '<html lang="en"');
  }
  if (!/<meta\s+name="viewport"/i.test(html)) {
    html = html.replace(/<head>/i, '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />');
  }

  // Idempotent: strip a previous run's injection first, so re-running over an
  // existing dist/ can never duplicate canonical / OG / JSON-LD tags.
  html = html.replace(/<!-- sereneflow-seo:start -->[\s\S]*?<!-- sereneflow-seo:end -->\s*/g, "");
  html = html.replace(/<noscript data-sereneflow-seo="1">[\s\S]*?<\/noscript>\s*/g, "");

  if (!html.includes("</head>")) throw new Error("dist/index.html has no </head> — cannot inject SEO tags");
  html = html.replace(
    "</head>",
    `  <!-- sereneflow-seo:start -->\n    ${headTags()}\n    <!-- sereneflow-seo:end -->\n  </head>`
  );

  if (html.includes("<body")) {
    html = html.replace(/(<body[^>]*>)/i, `$1\n    ${noscriptBlock()}`);
  }

  fs.writeFileSync(indexPath, html);
  return indexPath;
}

function writeRobots() {
  const body = [
    "# Serene Flow — public website only.",
    "# The web build is a single-page app: private data (journal, moods,",
    "# profile, admin) lives behind authentication in in-app state and has",
    "# no crawlable URL, so there is nothing private to disallow here.",
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(DIST, "robots.txt"), body);
}

function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), body);
}

function copyOgImage() {
  const src = path.join(ROOT, "assets", "icon.png");
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, path.join(DIST, "og-image.png"));
  return true;
}

function main() {
  if (!fs.existsSync(DIST)) throw new Error("dist/ does not exist — run the web export first");
  const indexPath = writeIndex();
  writeRobots();
  writeSitemap();
  const og = copyOgImage();
  console.log(`[seo] wrote ${path.relative(ROOT, indexPath)}, robots.txt, sitemap.xml${og ? ", og-image.png" : ""}`);
  console.log(`[seo] canonical/site URL: ${SITE_URL} (override with SITE_URL=...)`);
}

main();
