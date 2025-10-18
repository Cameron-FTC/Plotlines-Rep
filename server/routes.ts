import type { Express } from "express";
import { createServer, type Server } from "http";
import {
  socialStoryRequestSchema,
  type SocialStoryRequest,
  type GeneratedSocialStory,
  type StepImage,
} from "../shared/schema";
import OpenAI from "openai";

// If your Node is < 18, enable global fetch (harmless on >=18)
try {
  // @ts-ignore
  if (typeof fetch === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nf = require("node-fetch");
    // @ts-ignore
    globalThis.fetch = nf;
  }
} catch {}

/** Reuse one OpenAI client */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Utility */
function isDev() {
  return process.env.NODE_ENV !== "production";
}
function safeError(e: unknown) {
  const any = e as any;
  return {
    message: String(any?.message ?? e),
    name: any?.name,
    status: any?.status,
    code: any?.code,
    type: any?.type,
    details: any?.response?.data ?? any?.error ?? null,
  };
}

/* ───────────────────────── Image proxy & helpers ───────────────────────── */
// Optionally set this if your API runs on a different origin than the SPA
const API_ORIGIN = process.env.PUBLIC_API_ORIGIN || "";

function makeProxiedAbsolute(req: import("express").Request, src: string): string {
  if (API_ORIGIN) {
    return `${API_ORIGIN}/api/image-proxy?src=${encodeURIComponent(src)}`;
  }
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  const host  = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  return `${proto}://${host}/api/image-proxy?src=${encodeURIComponent(src)}`;
}

function placeholderUrl(text: string) {
  const label = encodeURIComponent((text || "Image").slice(0, 40));
  return `https://placehold.co/800x500?text=${label}`;
}

/* ───────────────── Royalty-free image helpers (FREE, no keys) ──────────── */
/** Openverse (WordPress) → Wikimedia Commons fallback, return RAW URLs (no proxy here) */

async function fetchOpenverseImage(query: string): Promise<{ url: string; attribution?: string } | null> {
  const params = new URLSearchParams({
    q: query,
    page_size: "1",
    license_type: "commercial", // may still require attribution
    // To force PD/CC0 only (no attribution), uncomment: license: "cc0,pdm",
    mature: "false",
    category: "illustration",
  });

  const resp = await fetch(`https://api.openverse.engineering/v1/images/?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const result = data?.results?.[0];
  if (!result) return null;

  // Prefer thumbnail (direct) then original url
  const raw: string | undefined = result?.thumbnail || result?.url;
  if (!raw) return null;

  const title = result?.title || "";
  const creator = result?.creator || "";
  const attribution = creator
    ? `${title ? `${title} – ` : ""}${creator} (via Openverse)`
    : `${title || "Image"} (via Openverse)`;

  return { url: raw, attribution };
}

async function fetchWikimediaImage(query: string): Promise<{ url: string; attribution?: string } | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrlimit: "1",
    gsrsearch: query,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1200",
  });

  const resp = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const firstPage = Object.values(pages)[0] as any;
  const ii = firstPage?.imageinfo?.[0];
  if (!ii) return null;

  const raw: string | undefined = ii?.thumburl || ii?.url;
  if (!raw) return null;

  const meta = ii?.extmetadata || {};
  const artist = (meta.Artist?.value || "").replace(/<[^>]+>/g, "");
  const credit = (meta.Credit?.value || "").replace(/<[^>]+>/g, "");
  const licenseShort = meta.LicenseShortName?.value || "";
  const attribution =
    [artist || credit, licenseShort ? `(${licenseShort})` : ""].filter(Boolean).join(" ") || "Wikimedia Commons";

  return { url: raw, attribution };
}

async function getRoyaltyFreeImageUrl(query: string): Promise<{ url: string; attribution?: string }> {
  try {
    const ov = await fetchOpenverseImage(query);
    if (ov?.url) return { url: ov.url, attribution: ov.attribution };
  } catch (e) {
    if (isDev()) console.warn("[Openverse error]", safeError(e));
  }
  try {
    const wm = await fetchWikimediaImage(query);
    if (wm?.url) return { url: wm.url, attribution: wm.attribution };
  } catch (e) {
    if (isDev()) console.warn("[Wikimedia error]", safeError(e));
  }
  return { url: placeholderUrl(query) };
}

// Try the model-provided terms in a good order
async function imageFromTerms(terms: string[], req: import("express").Request, fallbackLabel: string): Promise<string> {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const uniq = Array.from(new Set(terms.map(clean).filter(Boolean)));
  const candidates = [
    uniq.join(" "),         // all terms combined
    ...uniq,                // each term individually
  ].filter(Boolean);

  for (const q of candidates) {
    const res = await getRoyaltyFreeImageUrl(q);
    if (res.url && !res.url.startsWith("https://placehold.co")) {
      return makeProxiedAbsolute(req, res.url);
    }
  }
  // last resort
  return placeholderUrl(fallbackLabel || uniq[0] || "Image");
}

/* ─────────────── OpenAI Responses API generator — ALWAYS used ──────────── */

type StoryGen = {
  intro: string;
  steps: string[];
  conclusion: string;
  full: string;
  coverTerms: string[];
  stepTerms: string[][];
};

export async function generateStoryWithOpenAI(request: SocialStoryRequest): Promise<StoryGen> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const prompt = `
You are a helpful assistant that writes therapeutic social stories for children AND also proposes concise image search terms.

Write a Social Story with exactly 10 steps for a character named "${request.characterName}", written in the ${request.personPerspective} person perspective.

Context:
- Motivating interest: "${request.motivatingInterest}"
- Story category: "${request.storyCategory}"
- Specific activity: "${request.specificActivity}"
- Additional notes: "${request.additionalNotes}"

Output requirements:
1) The story MUST have:
   - An introduction paragraph (no heading).
   - Exactly 10 steps, each as a single line starting with its number and a period (e.g., "1. ...", "2. ...", ..., "10. ..."). No blank lines between steps.
   - A conclusion paragraph (no heading).

2) ALSO choose 1 to 3 short, concrete **image search terms** that describe what should be visually depicted, 
   focusing on **cartoon, illustration, or vector art** style (e.g., “cartoon boy brushing teeth”, “vector classroom illustration”).

   - For the cover image: return 1–3 terms describing the overall story theme in illustration/vector style.
   - For EACH step: return 1–3 terms that capture the main idea of the step, also phrased to return **cartoon / vector / illustration** art.

   All search terms must clearly include one of the words: “cartoon”, “illustration”, “vector art”, or “clipart”.


3) Respond ONLY as **strict JSON** matching this schema (no prose, no Markdown):

{
  "story": {
    "intro": "string",
    "steps": ["1. ...", "2. ...", "...", "10. ..."],
    "conclusion": "string"
  },
  "images": {
    "coverTerms": ["term1", "term2?"],
    "stepTerms": [
      ["term1","term2?"],  // for step 1
      ["..."],             // for step 2
      ["..."],             // for step 3
      ["..."],             // for step 4
      ["..."],             // for step 5
      ["..."],             // for step 6
      ["..."],             // for step 7
      ["..."],             // for step 8
      ["..."],             // for step 9
      ["..."]              // for step 10
    ]
  }
}
`;

  let jsonText = "";
  try {
    const resp = await openai.responses.create({
      model,
      input: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_output_tokens: 1500,
    });

    jsonText = (resp as any).output_text?.trim?.() ?? "";
    if (!jsonText) {
      const pieces = (resp as any).content ?? [];
      jsonText = pieces
        .map((p: any) => (p?.text?.value ?? p?.text ?? "").trim())
        .filter(Boolean)
        .join("\n")
        .trim();
    }
  } catch (err) {
    console.error("[OpenAI Responses API error]", safeError(err));
    throw err;
  }

  if (!jsonText) {
    throw new Error("OpenAI returned empty content.");
  }

  // Parse the strict JSON
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    if (isDev()) console.error("[OpenAI JSON parse error] raw:", jsonText);
    throw new Error("Failed to parse OpenAI JSON.");
  }

  // Validate minimal shape & coerce
  const intro = String(parsed?.story?.intro ?? "").trim();
  const steps: string[] = Array.isArray(parsed?.story?.steps) ? parsed.story.steps.map((s: any) => String(s)) : [];
  const conclusion = String(parsed?.story?.conclusion ?? "").trim();

  const coverTerms: string[] = Array.isArray(parsed?.images?.coverTerms)
    ? parsed.images.coverTerms.map((s: any) => String(s))
    : [];

  const stepTerms: string[][] = Array.isArray(parsed?.images?.stepTerms)
    ? parsed.images.stepTerms.map((arr: any) =>
        Array.isArray(arr) ? arr.map((s: any) => String(s)) : []
      )
    : [];

  if (steps.length !== 10) {
    throw new Error(`Expected 10 steps, got ${steps.length}`);
  }
  if (stepTerms.length !== 10) {
    // Not fatal: pad with empty arrays
    while (stepTerms.length < 10) stepTerms.push([]);
  }

  return {
    intro,
    steps,
    conclusion,
    full: jsonText, // keep raw json for debugging
    coverTerms,
    stepTerms,
  };
}

/* ──────────────────────────────── Routes ──────────────────────────────── */
/** ALWAYS OpenAI; then fetch images using the model-provided terms */

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-story", async (req, res) => {
    try {
      const request = socialStoryRequestSchema.parse(req.body);

      // 1) Generate story + search terms
      const { intro, steps, conclusion, coverTerms, stepTerms } = await generateStoryWithOpenAI(request);

      // 2) Cover image via model-provided terms (proxied absolute URL)
      const coverUrl = await imageFromTerms(coverTerms, req, "Cartoon illustration of " + request.specificActivity);

      // 3) Step images in parallel via stepTerms[i]
      const stepImages: StepImage[] = await Promise.all(
        steps.map(async (line, idx) => {
          const stepNumber = idx + 1;
          const stepText = line.replace(/^\s*\d{1,2}[.)-]\s*/, "").trim();
          const terms = Array.isArray(stepTerms[idx]) ? stepTerms[idx] : [];
          const url = await imageFromTerms(terms, req, stepText, "cartoon illustration");
          return { stepNumber, stepText, imageUrl: url };
        })
      );

      // 4) Respond
      const story: GeneratedSocialStory = {
        id: `story-${Date.now()}`,
        title: generateStoryTitle(request),
        story: `${intro}\n\n${steps.join("\n")}\n\n${conclusion}`,
        imageUrl: coverUrl,
        stepImages,
        request,
        createdAt: new Date().toISOString(),
      };

      if (isDev()) {
        console.log("[coverTerms]", coverTerms, "→", story.imageUrl);
        console.log("[stepTerms 1..3]", stepTerms.slice(0, 3));
      }

      return res.json(story);
    } catch (err) {
      const details = isDev() ? safeError(err) : undefined;
      console.error("[/api/generate-story] error", details || err);
      res.status(500).json({
        error: "Failed to generate story with OpenAI",
        ...(isDev() ? { details } : {}),
      });
    }
  });

  // Image proxy to avoid hotlink/CSP issues
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const src = (req.query.src as string) || "";
      if (!src || !/^https?:\/\//i.test(src)) {
        return res.status(400).send("Invalid src");
      }
      const upstream = await fetch(src, { headers: { "User-Agent": "PlotlinesBot/1.0" } });
      if (!upstream.ok) {
        return res.status(upstream.status).send("Upstream error");
      }
      const ct = upstream.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", ct);
      const cache = upstream.headers.get("cache-control");
      if (cache) res.setHeader("Cache-Control", cache);
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.send(buf);
    } catch (e) {
      console.error("[/api/image-proxy] error", e);
      res.status(500).send("Proxy error");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

/* ─────────────────────────────── Helpers ─────────────────────────────── */

function generateStoryTitle(request: SocialStoryRequest): string {
  const activity = request.specificActivity?.[0]
    ? request.specificActivity[0].toUpperCase() + request.specificActivity.slice(1)
    : "Activity";
  return request.personPerspective === "first"
    ? "My Guide to " + activity
    : `${request.characterName}'s Guide to ${activity}`;
}
