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

/** Utility: environment & safe error */
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

function makeProxiedFromReq(req: import("express").Request, src: string): string {
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
    // To force PD/CC0 only: license: "cc0,pdm",
    mature: "false",
  });

  const resp = await fetch(`https://api.openverse.engineering/v1/images/?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const result = data?.results?.[0];
  if (!result) return null;

  // Prefer thumbnail (direct image) then original url
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

  // thumburl is direct and sized; fallback to original
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
  // Last-resort placeholder so imageUrl is never blank
  return { url: placeholderUrl(query) };
}

/* ─────────────── OpenAI Responses API generator — ALWAYS used ──────────── */

export async function generateStoryWithOpenAI(
  request: SocialStoryRequest
): Promise<{ intro: string; steps: string[]; conclusion: string; full: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const prompt = `Write a Social Story with exactly 10 steps for a character named "${request.characterName}", written in the ${request.personPerspective} person perspective.
Motivating interest: "${request.motivatingInterest}"
Story category: "${request.storyCategory}"
Specific activity: "${request.specificActivity}"
Additional notes: "${request.additionalNotes}"

STRICT FORMAT:
- Introduction paragraph (no heading).
- Then 10 steps, each on its own line, each starting with its number and a period (e.g. "1. ...", "2. ...", "10. ..."), no blank lines between.
- Conclusion paragraph (no heading).
Do not include any other headings or sections. Keep language supportive and developmentally appropriate.`;

  let storyContent = "";
  try {
    const resp = await openai.responses.create({
      model,
      input: [
        { role: "system", content: "You are a helpful assistant that writes therapeutic social stories for children." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_output_tokens: 1200,
    });

    storyContent = (resp as any).output_text?.trim?.() ?? "";
    if (!storyContent) {
      const pieces = (resp as any).content ?? [];
      storyContent = pieces
        .map((p: any) => (p?.text?.value ?? p?.text ?? "").trim())
        .filter(Boolean)
        .join("\n")
        .trim();
    }
  } catch (err) {
    console.error("[OpenAI Responses API error]", safeError(err));
    throw err;
  }

  if (!storyContent) {
    throw new Error("OpenAI returned empty content (possibly rate-limited or blocked).");
  }

  // Parse intro / steps / conclusion
  const rawLines = storyContent.split("\n").map((s) => s.trim()).filter(Boolean);
  const stepRegex = /^(\d{1,2})[.)-]\s+/;

  const introLines: string[] = [];
  const stepLines: string[] = [];
  const conclusionLines: string[] = [];
  let inSteps = false;

  for (const line of rawLines) {
    const isStep = stepRegex.test(line);
    if (isStep) {
      inSteps = true;
      stepLines.push(line);
      continue;
    }
    if (!inSteps) {
      introLines.push(line);
    } else {
      if (stepLines.length >= 10) conclusionLines.push(line);
      else if (stepLines.length > 0) stepLines[stepLines.length - 1] += " " + line; // wrap continuation
    }
  }

  if (stepLines.length > 10) {
    conclusionLines.unshift(...stepLines.splice(10));
  }
  if (stepLines.length < 10) {
    const numbered = rawLines.filter((l) => stepRegex.test(l)).slice(0, 10);
    if (numbered.length) stepLines.splice(0, stepLines.length, ...numbered);
  }
  if (stepLines.length !== 10) {
    throw new Error(`Expected 10 steps, got ${stepLines.length}`);
  }

  const intro = introLines.join(" ").trim();
  const conclusion = conclusionLines.join(" ").trim();
  const stepsForUi = stepLines.map((s) => s.replace(/^\s*/, "")); // keep "1. ..."

  return { intro, steps: stepsForUi, conclusion: conclusion, full: storyContent };
}

/* ──────────────────────────────── Routes ──────────────────────────────── */
/** ALWAYS OpenAI; then fetch real royalty-free images and proxy them with absolute URLs */

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-story", async (req, res) => {
    try {
      const request = socialStoryRequestSchema.parse(req.body);

      // 1) Generate the story
      const { intro, steps, conclusion } = await generateStoryWithOpenAI(request);

      // 2) Cover image (RAW → ABSOLUTE PROXIED)
      const title = generateStoryTitle(request);
      const coverQuery = [request.motivatingInterest]
        .filter(Boolean)
        .join(" ")
        .trim();
      const coverImg = await getRoyaltyFreeImageUrl(coverQuery);
      const coverUrl = coverImg.url ? makeProxiedFromReq(req, coverImg.url) : placeholderUrl(coverQuery);

      // 3) Step images (parallel) (RAW → ABSOLUTE PROXIED)
      const stepImages: StepImage[] = await Promise.all(
        steps.map(async (line, idx) => {
          const stepNumber = idx + 1;
          const stepText = line.replace(/^\s*\d{1,2}[.)-]\s*/, "").trim();
          const q = [request.motivatingInterest]
            .filter(Boolean)
            .join(" ")
            .trim();
          const img = await getRoyaltyFreeImageUrl(q);
          const proxied = img.url ? makeProxiedFromReq(req, img.url) : placeholderUrl(stepText);
          return {
            stepNumber,
            stepText,
            imageUrl: proxied, // absolute URL to your API
          };
        })
      );

      // 4) Respond
      const story: GeneratedSocialStory = {
        id: `story-${Date.now()}`,
        title,
        story: `${intro}\n\n${steps.join("\n")}\n\n${conclusion}`,
        imageUrl: coverUrl,    // absolute proxied URL
        stepImages,
        request,
        createdAt: new Date().toISOString(),
      };

      if (isDev()) {
        console.log("[coverImage]", story.imageUrl);
        console.log(
          "[stepImages]",
          stepImages.map((s) => ({ n: s.stepNumber, url: s.imageUrl })).slice(0, 3)
        );
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
