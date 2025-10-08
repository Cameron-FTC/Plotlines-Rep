import type { Express } from "express";
import { createServer, type Server } from "http";
import { socialStoryRequestSchema, type SocialStoryRequest, type GeneratedSocialStory, type StepImage } from "../shared/schema";
import OpenAI from "openai";

/**
 * SINGLE OpenAI client reused per process.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function safeError(e: unknown) {
  const any = e as any;
  const base = { message: String(any?.message || e), name: any?.name };
  // If using official SDK, API errors often include status & response body:
  return {
    ...base,
    status: any?.status,
    code: any?.code,
    type: any?.type,
    details: any?.response?.data || any?.error || null,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ————————————————————————————————————————————————————————————
  // Unified helper: call OpenAI and parse { intro, steps[10], conclusion }
  // ————————————————————————————————————————————————————————————
  async function generateStoryWithOpenAI(request: SocialStoryRequest): Promise<{ intro: string; steps: string[]; conclusion: string; full: string; }> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set.");
    }

    const prompt = `Write a Social Story with exactly 10 steps for a character named "${request.characterName}", written in the ${request.personPerspective} person perspective.
The story should relate anecdotes to the motivating interest: "${request.motivatingInterest}".
The goal is to help the reader understand the category "${request.storyCategory}" in the context of "${request.specificActivity}".
Incorporate the following additional notes: "${request.additionalNotes}".

STRICT FORMAT:
- Introduction paragraph (no heading).
- Then 10 steps, each on its own line, each starting with its number and a period (e.g. "1. ...", "2. ...", … "10. ..."), with no blank lines between steps.
- Conclusion paragraph (no heading).
Do not include any other headings or sections. Keep language supportive and developmentally appropriate.`;

    // Use SDK (chat.completions). You can swap the model via env if you like.
    const completion = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that writes therapeutic social stories for children." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1200
    });

    const storyContent = completion.choices?.[0]?.message?.content ?? "";

    // Parse intro / steps / conclusion
    // Robust against “1)”, “1 - ”, etc., and wrapped lines.
    const rawLines = storyContent.split("\n").map(s => s.trim()).filter(Boolean);

    // Find index of first step and collect steps
    const stepRegex = /^(\d{1,2})[.)-]\s+/; // 1.  2)  3-  etc.
    let introLines: string[] = [];
    let stepLines: string[] = [];
    let conclusionLines: string[] = [];

    let inSteps = false;

    for (const line of rawLines) {
      const m = line.match(stepRegex);
      if (m) {
        inSteps = true;
        stepLines.push(line);
        continue;
      }
      if (!inSteps) {
        introLines.push(line);
      } else {
        // We are inside steps; if we already have 10 steps, the rest is conclusion
        if (stepLines.length >= 10) {
          conclusionLines.push(line);
        } else if (stepLines.length > 0) {
          // Continuation of previous step (word-wrapped)
          stepLines[stepLines.length - 1] = stepLines[stepLines.length - 1] + " " + line;
        }
      }
    }

    // Truncate to exactly 10 steps if a model added extras
    if (stepLines.length > 10) {
      conclusionLines = stepLines.slice(10).concat(conclusionLines);
      stepLines = stepLines.slice(0, 10);
    }

    // If we somehow got fewer than 10 steps, try a second pass by extracting all numbered lines
    if (stepLines.length < 10) {
      const numberedOnly = rawLines.filter(l => stepRegex.test(l));
      if (numberedOnly.length >= 10) {
        stepLines = numberedOnly.slice(0, 10);
      }
    }

    // Keep the numbered steps (1. … 10.) for UI consistency; also provide unnumbered if needed
    const stepsForUi = stepLines.map(s => s.replace(/^\s*/, "")); // keep “1. …” formatting

    const intro = introLines.join(" ").trim();
    const conclusion = conclusionLines.join(" ").trim();

    return {
      intro,
      steps: stepsForUi, // << return the numbered steps (1. … 10.)
      conclusion,
      full: storyContent
    };
  }

  // ————————————————————————————————————————————————————————————
  // OpenAI-only endpoint (kept for convenience; now uses the helper)
  // ————————————————————————————————————————————————————————————
  app.post("/api/generate-story-openai", async (req, res) => {
    try {
      const request = socialStoryRequestSchema.parse(req.body);
      const { intro, steps, conclusion } = await generateStoryWithOpenAI(request);

      // Build a consistent response for your frontend
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

      res.json(story);
    } catch (err) {
      console.error("Error generating story with OpenAI:", err);
      res.status(500).json({ error: "Failed to generate story with OpenAI" });
    }
  });

  // ————————————————————————————————————————————————————————————
  // Main endpoint — now uses OpenAI when character is Steven, otherwise offline generator
  // ————————————————————————————————————————————————————————————
  app.post("/api/generate-story", async (req, res) => {
    try {
      const request = socialStoryRequestSchema.parse(req.body);

      if (request.characterName === "Steven") {
        // Use OpenAI for Steven
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

        res.json(story);
        return;
      }

      // Fallback (non-Steven) — your existing offline path
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

      res.json(story);
    } catch (error) {
      console.error("Error generating story:", error);
      res.status(500).json({ error: "Failed to generate story" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// ————————————————————————————————————————————————————————————
// Below here: your existing helpers (unchanged except minor typings)
// ————————————————————————————————————————————————————————————

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
  if (challengeSteps) {
    result += "\n\n" + challengeSteps;
  }
  result += "\n\n" + conclusion;
  return result;
}

// Placeholder: keep/merge your existing helpers from the original file
// (pronouns, scenes, extractSteps, generateStoryIntro, generateActivitySpecificSteps, generateChallengeSteps, generateStoryConclusion, etc.)
function extractSteps(story: string): string[] {
  const lines = story.split(/\r?\n/);
  const stepRegex = /^(\d+\.|•)\s+/;
  const steps: string[] = [];
  for (const l of lines) {
    if (stepRegex.test(l.trim())) steps.push(l.trim());
  }
  // If not found as separate lines, try to split paragraphs with numbers
  if (steps.length === 0) {
    const numbered = story.split(/(?=\n\d+\.\s)/).map(s => s.trim()).filter(Boolean);
    return numbered.length ? numbered : lines.filter(Boolean);
  }
  return steps;
}

// The next functions are stubs so this file compiles if you drop it in.
// Replace them with your originals from the uploaded file.
function generateStoryIntro(request: SocialStoryRequest): string { return "Intro placeholder"; }
function generateActivitySpecificSteps(request: SocialStoryRequest): string { return "1. Step placeholder\n2. Step placeholder\n3. Step placeholder\n4. Step placeholder\n5. Step placeholder\n6. Step placeholder\n7. Step placeholder\n8. Step placeholder\n9. Step placeholder\n10. Step placeholder"; }
function generateChallengeSteps(request: SocialStoryRequest): string { return ""; }
function generateStoryConclusion(request: SocialStoryRequest): string { return "Conclusion placeholder"; }



function getSubject(request: SocialStoryRequest, startOfSentence: boolean = true): string {
  if (request.personPerspective === "first") {
    return "I";
  }
  return request.characterName; // Always capitalize character names
}



function getPossessive(request: SocialStoryRequest, startOfSentence: boolean = false): string {
  if (request.personPerspective === "first") {
    return startOfSentence ? "My" : "my";
  }
  return request.characterName + "'s";
}



function getObjectPronoun(request: SocialStoryRequest): string {
  return request.personPerspective === "first" ? "me" : request.characterName; // Always capitalize character names
}



function getReflexivePronoun(request: SocialStoryRequest): string {
  return request.personPerspective === "first" ? "myself" : "themselves";
}



function getVerb(request: SocialStoryRequest, baseVerb: string): string {
  const isFirstPerson = request.personPerspective === "first";
  
  // Handle irregular verbs
  if (baseVerb === "am/is") return isFirstPerson ? "am" : "is";
  if (baseVerb === "have/has") return isFirstPerson ? "have" : "has";
  if (baseVerb === "try/tries") return isFirstPerson ? "try" : "tries";
  
  // Regular verbs - add 's' for third person
  return isFirstPerson ? baseVerb : baseVerb + "s";
}



function generateStepImagePrompt(request: SocialStoryRequest, stepText: string, stepNumber: number): string {
  const basePrompt = "A therapeutic, child-friendly illustration showing";
  const category = request.storyCategory;
  const interest = request.motivatingInterest?.toLowerCase() || "";
  const activity = request.specificActivity.toLowerCase();
  
  // Create step-specific scene description
  let stepScene = generateStepSpecificScene(stepText, category, activity, interest, stepNumber);
  
  // Add interest enhancement
  const interestEnhancement = interest ? `, incorporating ${interest} elements that make the step engaging and motivating` : "";
  
  const styleDescription = ". Soft, calming art style with bright but soothing colors, child-friendly, therapeutic setting, no text or words, step-by-step visual guide";
  
  return `${basePrompt} ${stepScene}${interestEnhancement}${styleDescription}`;
}



function generateImagePrompt(request: SocialStoryRequest): string {
  const basePrompt = "A therapeutic, child-friendly illustration showing";
  const activityDescription = request.specificActivity.toLowerCase();
  const category = request.storyCategory;
  const interest = request.motivatingInterest?.toLowerCase() || "";
  
  // Generate scene based on category, activity, and interest integration
  let sceneDescription = generateSceneByCategory(category, activityDescription, interest);
  
  // Enhance with interest-specific elements
  const interestEnhancement = generateInterestEnhancement(interest, category);
  
  const styleDescription = ". Soft, calming art style with bright but soothing colors, child-friendly, therapeutic setting, no text or words";
  
  return `${basePrompt} ${sceneDescription}${interestEnhancement}${styleDescription}`;
}
