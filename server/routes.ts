import type { Express } from "express";
import { createServer, type Server } from "http";
import { socialStoryRequestSchema, type SocialStoryRequest, type GeneratedSocialStory, type StepImage } from "../shared/schema";
import OpenAI from "openai";

/** SINGLE OpenAI client reused per process. */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

/* ───────────────────────────── Freepik helpers ───────────────────────────── */
function freepikSearchUrl(query: string): string {
  const base = "https://www.freepik.com/search";
  const params = new URLSearchParams({ format: "search", query });
  return `${base}?${params.toString()}`;
}

const FREEPIK_TOKEN_RE = /\[FREEPIK_QUERY:\s*([^\]]+)\]/i;

function extractFreepikQueryAndClean(line: string) {
  const fallbackText = line.replace(/^\s*\d{1,2}[.)-]\s*/, "").trim();
  const m = line.match(FREEPIK_TOKEN_RE);
  const query = (m?.[1] || fallbackText).replace(/\s+/g, " ").slice(0, 120).trim();
  const cleanedForUi = line.replace(FREEPIK_TOKEN_RE, "").trim();
  return { query, cleanedForUi };
}

function buildCoverFreepikQuery(request: SocialStoryRequest, title: string) {
  const parts = [
    "child friendly illustration",
    request.storyCategory || "",
    request.specificActivity || "",
    request.motivatingInterest || "",
    title || ""
  ].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
/* ─────────────────────────── End Freepik helpers ─────────────────────────── */

/* --- OpenAI generator (Responses API) --- */
export async function generateStoryWithOpenAI(request: SocialStoryRequest): Promise<{
  intro: string;
  steps: string[];
  conclusion: string;
  full: string;
}> {
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
- At the END of each step line, append a bracketed token with a short Freepik search phrase for that step, exactly like:
  [FREEPIK_QUERY: <3-7 word phrase suitable for Freepik image search>]
  Keep this phrase concise and literal (no quotes or punctuation), describing a child-friendly illustration (e.g., child brushing teeth bathroom).
- Conclusion paragraph (no heading).
Do not include any other headings or sections. Keep language supportive and developmentally appropriate.`;

  let storyContent = "";
  try {
    const resp = await openai.responses.create({
      model,
      input: [
        { role: "system", content: "You are a helpful assistant that writes therapeutic social stories for children." },
        { role: "user", content: prompt }
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
  const rawLines = storyContent.split("\n").map(s => s.trim()).filter(Boolean);
  const stepRegex = /^(\d{1,2})[.)-]\s+/;

  const introLines: string[] = [];
  const stepLines: string[] = [];
  const conclusionLines: string[] = [];
  let inSteps = false;

  for (const line of rawLines) {
    const isStep = stepRegex.test(line);
    if (isStep) { inSteps = true; stepLines.push(line); continue; }
    if (!inSteps) introLines.push(line);
    else if (stepLines.length >= 10) conclusionLines.push(line);
    else if (stepLines.length > 0) stepLines[stepLines.length - 1] += " " + line;
  }

  if (stepLines.length > 10) conclusionLines.unshift(...stepLines.splice(10));
  if (stepLines.length < 10) {
    const numbered = rawLines.filter(l => stepRegex.test(l)).slice(0, 10);
    if (numbered.length) stepLines.splice(0, stepLines.length, ...numbered);
  }
  if (stepLines.length !== 10) throw new Error(`Expected 10 steps, got ${stepLines.length}`);

  const intro = introLines.join(" ").trim();
  const conclusion = conclusionLines.join(" ").trim();
  const stepsForUi = stepLines.map(s => s.replace(/^\s*/, "")); // keep "1. ..."

  return { intro, steps: stepsForUi, conclusion, full: storyContent };
}

/* --- Route: always OpenAI --- */
export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-story", async (req, res) => {
    try {
      const request = socialStoryRequestSchema.parse(req.body);

      // Always use OpenAI path
      const { intro, steps, conclusion } = await generateStoryWithOpenAI(request);

      // Build step images from Freepik token
      const stepImages: StepImage[] = steps.map((line, idx) => {
        const { query, cleanedForUi } = extractFreepikQueryAndClean(line);
        return {
          stepNumber: idx + 1,
          stepText: cleanedForUi.replace(/^\d{1,2}[.)-]\s*/, ""),
          imageUrl: freepikSearchUrl(query)
        };
      });

      const title = generateStoryTitle(request);
      const coverQuery = buildCoverFreepikQuery(request, title);

      const story: GeneratedSocialStory = {
        id: `story-${Date.now()}`,
        title,
        story: `${intro}\n\n${steps.map(s => s.replace(FREEPIK_TOKEN_RE, "").trim()).join("\n")}\n\n${conclusion}`,
        imageUrl: freepikSearchUrl(coverQuery),
        stepImages,
        request,
        createdAt: new Date().toISOString(),
      };

      return res.json(story);
    } catch (err) {
      const details = isDev() ? safeError(err) : undefined;
      console.error("[/api/generate-story] error", details || err);
      res.status(500).json({
        error: "Failed to generate story with OpenAI",
        ...(isDev() ? { details } : {})
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

/* --- minimal helper used by title --- */
function generateStoryTitle(request: SocialStoryRequest): string {
  const activity = request.specificActivity?.[0]
    ? request.specificActivity[0].toUpperCase() + request.specificActivity.slice(1)
    : "Activity";
  return request.personPerspective === "first"
    ? "My Guide to " + activity
    : `${request.characterName}'s Guide to ${activity}`;
}
