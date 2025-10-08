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

/* --- MOVE THIS OUTSIDE registerRoutes (top-level) --- */
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
- Then 10 steps, each on its own line, each starting with its number and a period (e.g. "1. ...", "2. ...", … "10. ..."), no blank lines between.
- Conclusion paragraph (no heading).
Do not include any other headings or sections. Keep language supportive and developmentally appropriate.`;

  // ——— Responses API ———
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

/* --- Keep registerRoutes as a top-level named export --- */
export async function registerRoutes(app: Express): Promise<Server> {
  // Main endpoint — uses OpenAI when character is Steven, otherwise offline generator
  app.post("/api/generate-story", async (req, res) => {
    try {
      const request = socialStoryRequestSchema.parse(req.body);

      if (request.characterName === "Steven") {
        const { intro, steps, conclusion } = await generateStoryWithOpenAI(request);

        const stepImages: StepImage[] = steps.map((line, idx) => {
          const stepText = line.replace(/^\d{1,2}[.)-]\s*/, "");
          return {
            stepNumber: idx + 1,
            stepText,
            imageUrl: `Description: An appropriate illustration could depict "${stepText}"`
          };
        });

        const story: GeneratedSocialStory = {
          id: `story-${Date.now()}`,
          title: generateStoryTitle(request),
          story: `${intro}\n\n${steps.join("\n")}\n\n${conclusion}`,
          imageUrl: `Description: An appropriate cover illustration could depict the theme of "${generateStoryTitle(request)}"`,
          stepImages,
          request,
          createdAt: new Date().toISOString(),
        };

        return res.json(story);
      }

      // … your non-Steven (offline) path …
      // build the same GeneratedSocialStory payload and res.json(...)
      const storyTitle = generateStoryTitle(request);
      const storyContent = generateEnhancedStory(request);
      const steps = extractSteps(storyContent);
      const stepImages: StepImage[] = steps.map((step, i) => {
        const stepText = step.replace(/^\d+\.\s*/, "").replace(/^•\s*/, "");
        return {
          stepNumber: i + 1,
          stepText,
          imageUrl: `Description: An appropriate illustration could depict "${stepText}"`
        };
      });
      const story: GeneratedSocialStory = {
        id: `story-${Date.now()}`,
        title: storyTitle,
        story: storyContent,
        imageUrl: `Description: An appropriate cover illustration could depict the theme of "${storyTitle}"`,
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

/* --- helpers (unchanged from your version) --- */
function generateStoryTitle(request: SocialStoryRequest): string {
  const activity = request.specificActivity.charAt(0).toUpperCase() + request.specificActivity.slice(1);
  if (request.personPerspective === "first") {
    return "My Guide to " + activity;
  } else {
    return request.characterName + "'s Guide to " + activity;
  }
}

function generateEnhancedStory(request: SocialStoryRequest): string {
  const intro = generateStoryIntro(request);
  const steps = generateActivitySpecificSteps(request);
  const challengeSteps = generateChallengeSteps(request);
  const conclusion = generateStoryConclusion(request);
  let result = intro + "\n\n" + steps;
  if (challengeSteps) result += "\n\n" + challengeSteps;
  result += "\n\n" + conclusion;
  return result;
}

function extractSteps(story: string): string[] {
  const lines = story.split(/\r?\n/);
  const stepRegex = /^(\d+\.|•)\s+/;
  const steps: string[] = [];
  for (const l of lines) if (stepRegex.test(l.trim())) steps.push(l.trim());
  if (steps.length === 0) {
    const numbered = story.split(/(?=\n\d+\.\s)/).map(s => s.trim()).filter(Boolean);
    return numbered.length ? numbered : lines.filter(Boolean);
  }
  return steps;
}

// Stubs — replace with your originals as needed
function generateStoryIntro(request: SocialStoryRequest): string { return "Intro placeholder"; }
function generateActivitySpecificSteps(request: SocialStoryRequest): string {
  return "1. Step placeholder\n2. Step placeholder\n3. Step placeholder\n4. Step placeholder\n5. Step placeholder\n6. Step placeholder\n7. Step placeholder\n8. Step placeholder\n9. Step placeholder\n10. Step placeholder";
}
function generateChallengeSteps(request: SocialStoryRequest): string { return ""; }
function generateStoryConclusion(request: SocialStoryRequest): string { return "Conclusion placeholder"; }

function getSubject(request: SocialStoryRequest, startOfSentence: boolean = true): string {
  if (request.personPerspective === "first") return "I";
  return request.characterName;
}
function getPossessive(request: SocialStoryRequest, startOfSentence: boolean = false): string {
  if (request.personPerspective === "first") return startOfSentence ? "My" : "my";
  return request.characterName + "'s";
}
function getObjectPronoun(request: SocialStoryRequest): string {
  return request.personPerspective === "first" ? "me" : request.characterName;
}
function getReflexivePronoun(request: SocialStoryRequest): string {
  return request.personPerspective === "first" ? "myself" : "themselves";
}
function getVerb(request: SocialStoryRequest, baseVerb: string): string {
  const isFirstPerson = request.personPerspective === "first";
  if (baseVerb === "am/is") return isFirstPerson ? "am" : "is";
  if (baseVerb === "have/has") return isFirstPerson ? "have" : "has";
  if (baseVerb === "try/tries") return isFirstPerson ? "try" : "tries";
  return isFirstPerson ? baseVerb : baseVerb + "s";
}
function generateStepImagePrompt(request: SocialStoryRequest, stepText: string, stepNumber: number): string {
  const basePrompt = "A therapeutic, child-friendly illustration showing";
  const category = request.storyCategory;
  const interest = request.motivatingInterest?.toLowerCase() || "";
  const activity = request.specificActivity.toLowerCase();
  let stepScene = generateStepSpecificScene(stepText, category, activity, interest, stepNumber);
  const interestEnhancement = interest ? `, incorporating ${interest} elements that make the step engaging and motivating` : "";
  const styleDescription = ". Soft, calming art style with bright but soothing colors, child-friendly, therapeutic setting, no text or words, step-by-step visual guide";
  return `${basePrompt} ${stepScene}${interestEnhancement}${styleDescription}`;
}
function generateImagePrompt(request: SocialStoryRequest): string {
  const basePrompt = "A therapeutic, child-friendly illustration showing";
  const activityDescription = request.specificActivity.toLowerCase();
  const category = request.storyCategory;
  const interest = request.motivatingInterest?.toLowerCase() || "";
  let sceneDescription = generateSceneByCategory(category, activityDescription, interest);
  const interestEnhancement = generateInterestEnhancement(interest, category);
  const styleDescription = ". Soft, calming art style with bright but soothing colors, child-friendly, therapeutic setting, no text or words";
  return `${basePrompt} ${sceneDescription}${interestEnhancement}${styleDescription}`;
}

/* If you have generateStepSpecificScene / generateSceneByCategory / generateInterestEnhancement in your original file,
   keep them here too. */
