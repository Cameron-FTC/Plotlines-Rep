import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { socialStoryRequestSchema, type SocialStoryRequest, type GeneratedSocialStory, type StepImage } from "../shared/schema";
import OpenAI from "openai";
<<<<<<< HEAD

/**
 * SINGLE OpenAI client reused per process.
 */

const openai = new OpenAI({
  apiKey: process.env.-OPENAI_API_KEY
});

/**
 * Generate a Social Story using OpenAI Responses API, then parse into
 * { intro, 10 numbered steps, conclusion }.
 */
export async function generateStoryWithOpenAI(request: SocialStoryRequest): Promise<{
  intro: string;
  steps: string[];
  conclusion: string;
  full: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }

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
      model: "gpt-4.1",
      input: [
        { role: "system", content: "You are a helpful assistant that writes therapeutic social stories for children." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_output_tokens: 1200,  // Responses API uses max_output_tokens (not max_tokens)
    });

    // Easiest extraction for plain text
    storyContent = (resp as any).output_text?.trim?.() ?? "";

    // Fallback extraction if output_text missing (older SDKs)
    if (!storyContent) {
      const pieces = (resp as any).content ?? [];
      storyContent = pieces
        .map((p: any) => (p?.text?.value ?? p?.text ?? "").trim())
        .filter(Boolean)
        .join("\n")
        .trim();
    }
  } catch (err) {
    // Surface details during dev; the route will add this to JSON
    console.error("[OpenAI Responses API error]", safeError(err));
    throw err;
  }

  if (!storyContent) {
    throw new Error("OpenAI returned empty content (possibly rate-limited or blocked).");
  }

  // ——— Parse intro / steps / conclusion ———
  const rawLines = storyContent.split("\n").map(s => s.trim()).filter(Boolean);
  const stepRegex = /^(\d{1,2})[.)-]\s+/; // matches "1. ", "2) ", "3- " etc.

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
      // Still in steps; either continuation or conclusion once 10 reached
      if (stepLines.length >= 10) {
        conclusionLines.push(line);
      } else if (stepLines.length > 0) {
        stepLines[stepLines.length - 1] += " " + line;
      }
    }
  }

  // Normalize to exactly 10
  if (stepLines.length > 10) {
    conclusionLines.unshift(...stepLines.splice(10));
  }
  if (stepLines.length < 10) {
    const numbered = rawLines.filter(l => stepRegex.test(l)).slice(0, 10);
    if (numbered.length) {
      stepLines.splice(0, stepLines.length, ...numbered);
    }
  }
  if (stepLines.length !== 10) {
    throw new Error(`Expected 10 steps, got ${stepLines.length}`);
  }

  const intro = introLines.join(" ").trim();
  const conclusion = conclusionLines.join(" ").trim();
  const stepsForUi = stepLines.map(s => s.replace(/^\s*/, "")); // keep numbering "1. ..." for your viewer

  return { intro, steps: stepsForUi, conclusion, full: storyContent };
}
export async function registerRoutes(app: Express): Promise<Server> {
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
=======
export async function registerRoutes(app: Express): Promise<Server> {
  // Endpoint to generate a social story using OpenAI API
  app.post("/api/generate-story-openai", async (req, res) => {
    try {
      const {
        characterName,
        personPerspective,
        motivatingInterest,
        storyCategory,
        specificActivity,
        additionalNotes
      } = req.body;

      // Compose the prompt for OpenAI
      const prompt = `Write a Social Story with exactly 10 steps for a character named "${characterName}", written in the ${personPerspective} person perspective. The story should relate anecdotes to the motivating interest: "${motivatingInterest}". The goal is to help the reader understand the category "${storyCategory}" in the context of "${specificActivity}". Incorporate the following additional notes: "${additionalNotes}". Format the story as an introduction, 10 clearly numbered steps, and a conclusion. Make it engaging, supportive, and developmentally appropriate.`;

      // Call OpenAI API (placeholder API key)
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set.");
      }
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a helpful assistant that writes therapeutic social stories for children." },
            { role: "user", content: prompt }
          ],
          max_tokens: 1200,
          temperature: 0.7
        })
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
      }

<<<<<<< HEAD
      return res.json(story);
    }

    // … your non-Steven (offline) path …
    // build the same GeneratedSocialStory payload and res.json(...)
  } catch (err) {
    const details = isDev() ? safeError(err) : undefined;
    console.error("[/api/generate-story] error", details || err);
    res.status(500).json({
      error: "Failed to generate story with OpenAI",
      ...(isDev() ? { details } : {})
    });
  }
});
}
// ————————————————————————————————————————————————————————————
// Below here: your existing helpers (unchanged except minor typings)
// ————————————————————————————————————————————————————————————

=======
      const data = await openaiResponse.json();
      const storyContent = data.choices?.[0]?.message?.content || "";

      // Extract intro, steps, and conclusion from the storyContent
      // Assumes format: intro, 10 numbered steps, conclusion
      const lines = storyContent.split('\n').map(l => l.trim()).filter(Boolean);
      let intro = "";
      let steps = [];
      let conclusion = "";
      let stepStarted = false;
      let stepLines = [];
      let conclusionLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^1\./.test(line)) {
          stepStarted = true;
        }
        if (!stepStarted) {
          intro += (intro ? '\n' : '') + line;
        } else if (/^\d+\./.test(line)) {
          stepLines.push(line);
        } else if (stepStarted) {
          // After steps, everything else is conclusion
          // If previous line was a step and this is not a step, it's likely conclusion
          // Only start collecting conclusion after all 10 steps
          if (stepLines.length >= 10) {
            conclusionLines.push(line);
          } else if (stepLines.length > 0) {
            // Sometimes step text wraps to next line
            stepLines[stepLines.length - 1] += ' ' + line;
          }
        }
      }
      // If conclusion wasn't found in loop, try to get it from the last lines
      if (conclusionLines.length === 0 && stepLines.length > 10) {
        conclusionLines = stepLines.slice(10);
        stepLines = stepLines.slice(0, 10);
      }
      steps = stepLines.slice(0, 10);
      conclusion = conclusionLines.join('\n');

      res.json({
        intro,
        steps,
        conclusion,
        story: storyContent
      });
    } catch (error) {
      console.error("Error generating story with OpenAI:", error);
      res.status(500).json({ error: "Failed to generate story with OpenAI" });
    }
  });
  // Generate social story with image or OpenAI (for Steven)
  app.post("/api/generate-story", async (req, res) => {
    try {
      const request = socialStoryRequestSchema.parse(req.body);
      if (request.characterName === "Steven") {
        // Use OpenAI for Steven
  const prompt = `Write a Social Story with exactly 10 steps for a character named "${request.characterName}", written in the ${request.personPerspective} person perspective. The story should relate anecdotes to the motivating interest: "${request.motivatingInterest}". The goal is to help the reader understand the category "${request.storyCategory}" in the context of "${request.specificActivity}". Incorporate the following additional notes: "${request.additionalNotes}".\n\nFormat the story as follows:\n- An introduction paragraph.\n- 10 steps, each on its own line, each starting with its number and a period (e.g., '1. ...', '2. ...', etc.), with no extra line breaks between steps.\n- A conclusion paragraph.\n\nDo not include any other sections or formatting. Make it engaging, supportive, and developmentally appropriate.`;

        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          throw new Error("OPENAI_API_KEY environment variable is not set.");
        }
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              { role: "system", content: "You are a helpful assistant that writes therapeutic social stories for children." },
              { role: "user", content: prompt }
            ],
            max_tokens: 1200,
            temperature: 0.7
          })
        });

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
        }

        const data = await openaiResponse.json();
        const storyContent = data.choices?.[0]?.message?.content || "";

        // Extract intro, steps, and conclusion from the storyContent
        const lines = storyContent.split('\n').map(l => l.trim()).filter(Boolean);
        let intro = "";
        let steps = [];
        let conclusion = "";
        let stepStarted = false;
        let stepLines = [];
        let conclusionLines = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/^1\./.test(line)) {
            stepStarted = true;
          }
          if (!stepStarted) {
            intro += (intro ? '\n' : '') + line;
          } else if (/^\d+\./.test(line)) {
            stepLines.push(line);
          } else if (stepStarted) {
            // After steps, everything else is conclusion
            // If previous line was a step and this is not a step, it's likely conclusion
            // Only start collecting conclusion after all 10 steps
            if (stepLines.length >= 10) {
              conclusionLines.push(line);
            } else if (stepLines.length > 0) {
              // Sometimes step text wraps to next line
              stepLines[stepLines.length - 1] += ' ' + line;
            }
          }
        }
        // If conclusion wasn't found in loop, try to get it from the last lines
        if (conclusionLines.length === 0 && stepLines.length > 10) {
          conclusionLines = stepLines.slice(10);
          stepLines = stepLines.slice(0, 10);
        }
        steps = stepLines.slice(0, 10);
        conclusion = conclusionLines.join('\n');

        res.json({
          intro,
          steps,
          conclusion,
          story: storyContent
        });
        return;
      }
      // ...existing code for non-Steven characters below...
      // Generate the complete story content
      const storyTitle = generateStoryTitle(request);
      const storyContent = generateEnhancedStory(request);
      // Extract steps from the story content
      const steps = extractSteps(storyContent);
      // Generate descriptive text for ALL steps instead of images
      const stepImages: StepImage[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNumber = i + 1;
        const stepText = step
          .replace(/^\d+\.\s*/, '')
          .replace(/^•\s*/, '');
        // Create a descriptive "image" text instead of generating an image
        const stepImageUrl = `Description: An appropriate illustration could depict "${stepText}"`;
        stepImages.push({
          stepNumber,
          stepText,
          imageUrl: stepImageUrl,
        });
      }
      // Instead of generating a main image, create a descriptive cover text
      const mainImageUrl = `Description: An appropriate cover illustration could depict the theme of "${storyTitle}"`;
      // Create the complete story response
      const story: GeneratedSocialStory = {
        id: `story-${Date.now()}`,
        title: storyTitle,
        story: storyContent,
        imageUrl: mainImageUrl,
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

// Story generation functions (moved from frontend)
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
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
<<<<<<< HEAD
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



=======
  
  return `${intro}\n\n${steps}${challengeSteps ? '\n\n' + challengeSteps : ''}\n\n${conclusion}`;
}

// Helper functions for proper pronoun handling
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
function getSubject(request: SocialStoryRequest, startOfSentence: boolean = true): string {
  if (request.personPerspective === "first") {
    return "I";
  }
  return request.characterName; // Always capitalize character names
}

<<<<<<< HEAD


=======
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
function getPossessive(request: SocialStoryRequest, startOfSentence: boolean = false): string {
  if (request.personPerspective === "first") {
    return startOfSentence ? "My" : "my";
  }
<<<<<<< HEAD
  return request.characterName + "'s";
}



=======
  return `${request.characterName}'s`;
}

>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
function getObjectPronoun(request: SocialStoryRequest): string {
  return request.personPerspective === "first" ? "me" : request.characterName; // Always capitalize character names
}

<<<<<<< HEAD


=======
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
function getReflexivePronoun(request: SocialStoryRequest): string {
  return request.personPerspective === "first" ? "myself" : "themselves";
}

<<<<<<< HEAD


=======
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
function getVerb(request: SocialStoryRequest, baseVerb: string): string {
  const isFirstPerson = request.personPerspective === "first";
  
  // Handle irregular verbs
  if (baseVerb === "am/is") return isFirstPerson ? "am" : "is";
  if (baseVerb === "have/has") return isFirstPerson ? "have" : "has";
  if (baseVerb === "try/tries") return isFirstPerson ? "try" : "tries";
  
  // Regular verbs - add 's' for third person
  return isFirstPerson ? baseVerb : baseVerb + "s";
}

<<<<<<< HEAD


=======
function generateStoryIntro(request: SocialStoryRequest): string {
  const subject = getSubject(request, true);
  const subjectMid = getSubject(request, false);
  const possessive = getPossessive(request);
  const objectPronoun = getObjectPronoun(request);
  const reflexive = getReflexivePronoun(request);
  
  let interestIntegration = "";
  if (request.motivatingInterest) {
    interestIntegration = ` Just like how ${request.motivatingInterest} can be exciting and fun, learning new activities can be enjoyable too!`;
  }
  
  const categoryIntros = {
    daily_living: `Hi! ${subject} ${getVerb(request, "am/is")} learning about ${request.specificActivity}. This is an important activity that helps ${objectPronoun} take care of ${reflexive} every day.${interestIntegration}`,
    social_skills: `${subject} ${getVerb(request, "am/is")} learning about ${request.specificActivity}. When ${subjectMid} ${getVerb(request, "interact")} with other people, there are special ways to make everyone feel good and comfortable.${interestIntegration}`,
    emotional_regulation: `Sometimes ${subjectMid} ${getVerb(request, "have/has")} different feelings, and that's completely normal! ${subject} ${getVerb(request, "am/is")} learning about ${request.specificActivity} to help understand and manage ${possessive} feelings better.${interestIntegration}`,
    motor_skills: `${getPossessive(request, true)} body can do amazing things! ${subject} ${getVerb(request, "am/is")} going to practice ${request.specificActivity}, which helps ${possessive} body get stronger and more coordinated.${interestIntegration}`,
    sensory_regulation: `${getPossessive(request, true)} body takes in information from the world through ${possessive} senses. ${subject} ${getVerb(request, "am/is")} learning about ${request.specificActivity} to understand and manage what ${possessive} body feels.${interestIntegration}`,
    communication: `Talking and sharing with others is an important way to connect. ${subject} ${getVerb(request, "am/is")} learning about ${request.specificActivity} to help express ${possessive} thoughts and feelings better.${interestIntegration}`,
    community_participation: `Being part of ${possessive} community means doing activities outside ${possessive} home. ${subject} ${getVerb(request, "am/is")} learning about ${request.specificActivity} to feel comfortable in different places.${interestIntegration}`,
    other: `${subject} ${getVerb(request, "am/is")} learning about ${request.specificActivity}, which is an important skill that will help in daily life.${interestIntegration}`
  };
  
  return categoryIntros[request.storyCategory];
}

function generateActivitySpecificSteps(request: SocialStoryRequest): string {
  const subject = getSubject(request, true);
  const subjectMid = getSubject(request, false);
  const possessive = getPossessive(request);
  const objectPronoun = getObjectPronoun(request);
  const reflexive = getReflexivePronoun(request);
  const lowerActivity = request.specificActivity.toLowerCase();
  
  // Add interest integration throughout steps
  const interestPhrase = request.motivatingInterest ? `Just like in ${request.motivatingInterest}, ` : "";
  
  // Social skills activities - detailed breakdowns
  if (lowerActivity.includes("play") && lowerActivity.includes("friend")) {
    return `Here are the steps ${subjectMid} ${getVerb(request, "follow")} to play with friends:\n\n1. ${subject} ${getVerb(request, "look")} for friends who might want to play. ${interestPhrase}${subjectMid} can find ${possessive} favorite people to spend time with.\n2. ${subject} ${getVerb(request, "use")} kind words to ask a friend to play. ${subject} might say "Would you like to play with ${objectPronoun}?" or "Can I join your game?"\n3. ${subject} ${getVerb(request, "listen")} to what ${possessive} friend wants to play. Taking turns choosing activities makes everyone feel included.\n4. If the play area is crowded, ${subject} ${getVerb(request, "help")} find extra space where everyone can play safely and comfortably.\n5. ${subject} ${getVerb(request, "use")} gentle hands and kind words while playing. This helps everyone have fun together.\n6. If ${subjectMid} ${getVerb(request, "want")} to change the game, ${subjectMid} ${getVerb(request, "ask")} ${possessive} friends what they think first.\n7. When it's time to stop playing, ${subject} ${getVerb(request, "say")} "Thank you for playing with ${objectPronoun}" to ${possessive} friends.`;
  }
  
  if (lowerActivity.includes("los") && (lowerActivity.includes("game") || lowerActivity.includes("compet"))) {
    return `Here are the steps ${subjectMid} ${getVerb(request, "follow")} when learning to lose a game:\n\n1. Before playing, ${subject} ${getVerb(request, "remind")} ${reflexive} that playing is about having fun. ${interestPhrase}the most important thing is enjoying the experience.\n2. During the game, ${subject} ${getVerb(request, "focus")} on doing ${possessive} best and enjoying the activity with friends.\n3. If ${subjectMid} ${getVerb(request, "start")} to feel worried about losing, ${subjectMid} can take three deep breaths to stay calm.\n4. When the game ends, ${subject} ${getVerb(request, "congratulate")} the winner by saying "Good game!" or "Nice job!"\n5. ${subject} ${getVerb(request, "remind")} ${reflexive} that losing doesn't mean ${subjectMid} ${getVerb(request, "am/is")} not good at things - it just means someone else won this time.\n6. ${subject} ${getVerb(request, "think")} about what ${subjectMid} enjoyed about playing, like laughing with friends or trying ${possessive} best.\n7. ${subject} can ask to play again if ${subjectMid} ${getVerb(request, "want")} to, knowing that each game is a new chance to have fun.`;
  }
  
  // Emotional regulation activities
  if (lowerActivity.includes("manage") || lowerActivity.includes("calm") || lowerActivity.includes("emotion")) {
    return `Here are the steps ${subjectMid} ${getVerb(request, "follow")} to manage big feelings:\n\n1. ${subject} ${getVerb(request, "notice")} when ${possessive} feelings start to get big. ${possessive} body might feel different - heart beating faster, face getting warm, or hands feeling tight.\n2. ${subject} ${getVerb(request, "pause")} and take three slow, deep breaths. ${interestPhrase}${subjectMid} can imagine breathing like a calm, peaceful place.\n3. ${subject} ${getVerb(request, "name")} ${possessive} feeling. ${subject} might say "I'm feeling frustrated" or "I'm feeling excited."\n4. ${subject} ${getVerb(request, "choose")} a helpful strategy: counting to ten, asking for a hug, or taking a short break.\n5. If ${subjectMid} ${getVerb(request, "need")} help, ${subjectMid} can ask a trusted adult by saying "I need some help with my feelings."\n6. ${subject} ${getVerb(request, "use")} ${possessive} strategy and wait for the big feeling to get smaller.\n7. When ${subjectMid} ${getVerb(request, "feel")} calmer, ${subjectMid} can continue with ${possessive} activity or try again.`;
  }
  
  // Daily living activities
  if (lowerActivity.includes("brush") && lowerActivity.includes("teeth")) {
    return `Here are the steps ${subjectMid} ${getVerb(request, "follow")} to brush ${possessive} teeth:\n\n1. ${subject} ${getVerb(request, "get")} ${possessive} toothbrush and toothpaste. ${interestPhrase}${subjectMid} can make this fun by thinking about ${possessive} favorite things.\n2. ${subject} ${getVerb(request, "turn")} on the water and ${getVerb(request, "wet")} ${possessive} toothbrush.\n3. ${subject} ${getVerb(request, "squeeze")} a small amount of toothpaste onto ${possessive} toothbrush - about the size of a pea.\n4. ${subject} ${getVerb(request, "put")} the toothbrush in ${possessive} mouth and ${getVerb(request, "brush")} gently in small circles.\n5. ${subject} ${getVerb(request, "brush")} all ${possessive} teeth: front, back, and tops.\n6. ${subject} ${getVerb(request, "brush")} for about two minutes. ${subject} can count or think about ${request.motivatingInterest} to make the time pass.\n7. ${subject} ${getVerb(request, "spit")} out the toothpaste and ${getVerb(request, "rinse")} ${possessive} mouth.\n8. ${subject} ${getVerb(request, "clean")} ${possessive} toothbrush and ${getVerb(request, "put")} it away.`;
  }
  
  // Generic activity template with interest integration
  return `Here's how ${subjectMid} can approach ${request.specificActivity}:\n\n1. ${subject} ${getVerb(request, "prepare")} by getting ready and gathering what ${subjectMid} ${getVerb(request, "need")}. ${interestPhrase}preparation is important for success.\n2. ${subject} ${getVerb(request, "start")} slowly and ${getVerb(request, "take")} ${possessive} time with each part.\n3. ${subject} ${getVerb(request, "follow")} the steps one at a time, without rushing.\n4. If something feels difficult, ${subject} can take a break and try again. ${interestPhrase}practice makes progress.\n5. ${subject} ${getVerb(request, "celebrate")} each step ${subjectMid} ${getVerb(request, "complete")} successfully.\n6. With practice, the whole activity becomes easier and more comfortable.\n7. ${subject} can ask for help when ${subjectMid} ${getVerb(request, "need")} it, and that's perfectly okay.`;
}

function generateChallengeSteps(request: SocialStoryRequest): string | null {
  if (!request.additionalNotes) return null;
  
  const subject = getSubject(request, true);
  const subjectMid = getSubject(request, false);
  const possessive = getPossessive(request);
  const reflexive = getReflexivePronoun(request);
  const notes = request.additionalNotes.toLowerCase();
  
  let challengeSteps = "Here are some extra strategies that can help:\n\n";
  
  // Enhanced challenge parsing with better pattern matching
  const challengePatterns = {
    losing: /(lose|losing|lost|defeat|fail)/i,
    overwhelm: /(overwhelm|overwhelmed|overstimulat)/i,
    excitement: /(excit|overexcit|hyper)/i,
    hitting: /(hit|push|shov|aggress)/i,
    anxiety: /(anxious|anxiety|worry|worried|nervous)/i,
    loud: /(loud|noise|sound)/i,
    transition: /(transition|change|switch)/i,
    frustrated: /(frustrat|anger|mad)/i
  };
  
  // Handle specific challenges with improved matching
  if (challengePatterns.overwhelm.test(notes) && challengePatterns.losing.test(notes)) {
    challengeSteps += `• When ${subjectMid} ${getVerb(request, "start")} to feel overwhelmed about losing: ${subject} can count to five slowly and remind ${reflexive} that games are for fun.\n`;
    challengeSteps += `• ${subject} can say "It's okay, I can try again" or "Good game, everyone!"\n`;
    challengeSteps += `• If feelings get too big, ${subject} can ask for a short break to calm down.\n`;
  }
  
  if (challengePatterns.excitement.test(notes) && challengePatterns.hitting.test(notes)) {
    challengeSteps += `• When ${subjectMid} ${getVerb(request, "feel")} very excited while playing: ${subject} can take three deep breaths to help ${possessive} body stay calm.\n`;
    challengeSteps += `• Instead of hitting or pushing, ${subject} can ask for high fives or use words like "This is so fun!"\n`;
    challengeSteps += `• ${subject} can remember that gentle hands help everyone feel safe and happy.\n`;
  }
  
  if (challengePatterns.anxiety.test(notes)) {
    challengeSteps += `• When ${subjectMid} ${getVerb(request, "feel")} worried: ${subject} can think about ${request.motivatingInterest} or another favorite thing to help ${reflexive} feel calmer.\n`;
    challengeSteps += `• ${subject} can tell a trusted adult "I'm feeling worried" and ask for help.\n`;
  }
  
  if (challengePatterns.frustrated.test(notes)) {
    challengeSteps += `• When ${subjectMid} ${getVerb(request, "feel")} frustrated: ${subject} can take slow breaths and count to ten.\n`;
    challengeSteps += `• ${subject} can say "I need a break" and step away for a moment.\n`;
  }
  
  if (challengePatterns.loud.test(notes)) {
    challengeSteps += `• If sounds feel too loud: ${subject} can cover ${possessive} ears gently or ask to move to a quieter space.\n`;
    challengeSteps += `• ${subject} can bring ear defenders or headphones if they help.\n`;
  }
  
  if (challengePatterns.transition.test(notes)) {
    challengeSteps += `• When it's time to change activities: ${subject} can take a moment to say goodbye to the current activity.\n`;
    challengeSteps += `• ${subject} can ask "What are we doing next?" to help prepare for the change.\n`;
  }
  
  // If no specific challenges were identified, create a generic helpful strategy
  if (challengeSteps === "Here are some extra strategies that can help:\n\n") {
    challengeSteps += `• ${subject} can always ask for help when ${subjectMid} ${getVerb(request, "need")} it.\n`;
    challengeSteps += `• Taking breaks is okay and can help ${subjectMid} feel better.\n`;
    challengeSteps += `• ${subject} can think about ${request.motivatingInterest} to help ${reflexive} feel calm and happy.\n`;
  }
  
  return challengeSteps;
}

function generateStoryConclusion(request: SocialStoryRequest): string {
  const subject = getSubject(request, true);
  const subjectMid = getSubject(request, false);
  
  let conclusion = `${subject} can feel proud when ${subjectMid} ${getVerb(request, "practice")} ${request.specificActivity}. Every time ${subjectMid} ${getVerb(request, "try/tries")}, ${subjectMid} ${getVerb(request, "am/is")} doing something wonderful!\n\n`;
  
  if (request.motivatingInterest) {
    conclusion += `Just like with ${request.motivatingInterest}, learning new things takes practice and patience. `;
  }
  
  conclusion += `Each time ${subjectMid} ${getVerb(request, "practice")}, ${subjectMid} ${getVerb(request, "get")} better and stronger. ${subject} ${getVerb(request, "am/is")} amazing just the way ${subjectMid} ${getVerb(request, "am/is")}!`;
  
  return conclusion;
}

// Extract steps from story content (similar to frontend logic)
function extractSteps(storyContent: string): string[] {
  const lines = storyContent.split('\n');
  const steps: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Look for numbered steps (1., 2., etc.) or bullet points
    if (/^\d+\./.test(trimmedLine) || trimmedLine.startsWith('•')) {
      steps.push(trimmedLine);
    }
  }
  
  return steps.length > 0 ? steps : [];
}

// Generate step-specific image prompts
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
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

<<<<<<< HEAD

=======
function generateStepSpecificScene(stepText: string, category: string, activity: string, interest: string, stepNumber: number): string {
  const lowerStepText = stepText.toLowerCase();
  
  // Create specific scenes based on step content
  if (lowerStepText.includes("get") && lowerStepText.includes("toothbrush")) {
    return `a child reaching for a ${interest ? `${interest}-themed` : "colorful"} toothbrush and toothpaste in a bright, clean bathroom`;
  } else if (lowerStepText.includes("wet") && lowerStepText.includes("toothbrush")) {
    return `a child holding a toothbrush under running water at a bathroom sink, with ${interest ? `${interest} decorations` : "cheerful elements"} visible`;
  } else if (lowerStepText.includes("squeeze") && lowerStepText.includes("toothpaste")) {
    return `a child carefully squeezing a small amount of toothpaste onto their toothbrush, showing the proper pea-sized amount`;
  } else if (lowerStepText.includes("brush") && lowerStepText.includes("gently")) {
    return `a child brushing their teeth with gentle circular motions, looking comfortable and confident in the bathroom`;
  } else if (lowerStepText.includes("spit") && lowerStepText.includes("rinse")) {
    return `a child spitting toothpaste into the sink and rinsing their mouth, completing the tooth brushing routine successfully`;
  } else if (lowerStepText.includes("clean") && lowerStepText.includes("toothbrush")) {
    return `a child cleaning their toothbrush and putting it away neatly, finishing the dental care routine with pride`;
  }
  
  // Social skills step scenes
  else if (lowerStepText.includes("look") && lowerStepText.includes("friend")) {
    return `a child looking around for friends to play with${interest ? `, in an environment with ${interest} elements` : ""}, showing social awareness`;
  } else if (lowerStepText.includes("kind words") && lowerStepText.includes("ask")) {
    return `a child approaching another child with friendly body language, asking to play together in a welcoming manner`;
  } else if (lowerStepText.includes("listen") && lowerStepText.includes("friend")) {
    return `children talking together, with one child actively listening to their friend's ideas about what to play`;
  }
  
  // Emotional regulation step scenes
  else if (lowerStepText.includes("notice") && lowerStepText.includes("feeling")) {
    return `a child recognizing their emotional state, with visual cues showing self-awareness and mindfulness`;
  } else if (lowerStepText.includes("breathe") || lowerStepText.includes("deep breath")) {
    return `a child practicing calm breathing techniques${interest ? ` while looking at ${interest} imagery for comfort` : ""}, demonstrating emotional regulation`;
  } else if (lowerStepText.includes("name") && lowerStepText.includes("feeling")) {
    return `a child expressing their emotions verbally, showing healthy emotional communication and self-awareness`;
  }
  
  // Generic step scene
  else {
    return `a child progressing through step ${stepNumber} of ${activity}${interest ? ` with ${interest} elements providing motivation and engagement` : ""}, showing confidence and learning`;
  }
}
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)

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
<<<<<<< HEAD
=======

function generateSceneByCategory(category: string, activity: string, interest: string): string {
  switch (category) {
    case "daily_living":
      return generateDailyLivingScene(activity, interest);
    case "social_skills":
      return generateSocialSkillsScene(activity, interest);
    case "emotional_regulation":
      return generateEmotionalRegulationScene(activity, interest);
    case "motor_skills":
      return generateMotorSkillsScene(activity, interest);
    case "sensory_regulation":
      return generateSensoryRegulationScene(activity, interest);
    case "communication":
      return generateCommunicationScene(activity, interest);
    case "community_participation":
      return generateCommunityParticipationScene(activity, interest);
    default:
      return `a child confidently practicing ${activity} in a supportive, comfortable environment`;
  }
}

function generateDailyLivingScene(activity: string, interest: string): string {
  if (activity.includes("brush") && activity.includes("teeth")) {
    return `a happy child in a bright, clean bathroom brushing their teeth with ${interest ? `a ${interest}-themed toothbrush and` : "a colorful"} toothbrush, with bubbles and a cheerful mirror reflection`;
  } else if (activity.includes("wash") && activity.includes("hand")) {
    return `a child at a sink washing hands with soap bubbles, surrounded by ${interest ? `${interest}-themed` : "cheerful"} bathroom decorations, showing proper handwashing technique`;
  } else if (activity.includes("dress") || activity.includes("cloth")) {
    return `a child getting dressed in their bedroom with ${interest ? `${interest} posters on the wall and ${interest}-themed` : "colorful"} clothes laid out neatly`;
  } else if (activity.includes("eat") || activity.includes("meal")) {
    return `a child at a dining table enjoying a healthy meal, with ${interest ? `${interest}-themed placemats and` : ""} nutritious food arranged attractively`;
  } else {
    return `a child successfully completing ${activity} in a welcoming home environment${interest ? ` with ${interest} elements visible in the background` : ""}`;
  }
}

function generateSocialSkillsScene(activity: string, interest: string): string {
  if (activity.includes("play") && activity.includes("friend")) {
    return `children playing together happily${interest ? ` with ${interest}-themed toys or in a ${interest}-inspired play area` : ""}, showing cooperation and kindness`;
  } else if (activity.includes("share") || activity.includes("turn")) {
    return `children taking turns and sharing toys${interest ? ` related to ${interest}` : ""} in a peaceful playground or classroom setting`;
  } else if (activity.includes("talk") || activity.includes("conversation")) {
    return `children having a friendly conversation${interest ? ` about ${interest} or while looking at ${interest}-related books` : ""}, using kind words and listening to each other`;
  } else {
    return `children engaged in ${activity} together, demonstrating positive social interaction${interest ? ` in a ${interest}-themed environment` : ""}`;
  }
}

function generateEmotionalRegulationScene(activity: string, interest: string): string {
  if (activity.includes("calm") || activity.includes("breathe") || activity.includes("relax")) {
    return `a child in a peaceful quiet corner practicing calm breathing or relaxation${interest ? ` surrounded by ${interest} images or holding a ${interest}-themed comfort item` : ""}, looking serene and centered`;
  } else if (activity.includes("angry") || activity.includes("frustrat")) {
    return `a child using healthy coping strategies like deep breathing or counting${interest ? ` while looking at a ${interest} poster or holding a ${interest} stress toy` : ""}, showing emotional self-regulation`;
  } else if (activity.includes("sad") || activity.includes("upset")) {
    return `a child seeking comfort and support from a trusted adult${interest ? ` in a cozy space decorated with ${interest} themes` : ""}, learning to express feelings safely`;
  } else {
    return `a child practicing emotional regulation during ${activity}${interest ? ` with ${interest}-themed calming tools nearby` : ""}, demonstrating healthy coping skills`;
  }
}

function generateMotorSkillsScene(activity: string, interest: string): string {
  if (activity.includes("fine motor") || activity.includes("writing") || activity.includes("draw")) {
    return `a child practicing fine motor skills like writing or drawing${interest ? ` ${interest}-themed pictures or letters` : ""} at a comfortable desk with proper posture`;
  } else if (activity.includes("gross motor") || activity.includes("running") || activity.includes("jump")) {
    return `a child practicing gross motor skills like running or jumping${interest ? ` in a ${interest}-themed playground or while pretending to be ${interest}` : ""} in a safe, open space`;
  } else {
    return `a child developing motor skills through ${activity}${interest ? ` using ${interest}-themed equipment or in a ${interest}-inspired setting` : ""}, showing coordination and confidence`;
  }
}

function generateSensoryRegulationScene(activity: string, interest: string): string {
  return `a child exploring sensory experiences related to ${activity}${interest ? ` with ${interest}-themed sensory tools or in a ${interest}-inspired sensory space` : ""}, looking comfortable and regulated`;
}

function generateCommunicationScene(activity: string, interest: string): string {
  if (activity.includes("ask") || activity.includes("request")) {
    return `a child confidently asking for help or making requests${interest ? ` about ${interest} or using ${interest}-themed communication tools` : ""}, with supportive adults nearby`;
  } else {
    return `a child practicing communication skills during ${activity}${interest ? ` using ${interest} as a conversation topic or communication aid` : ""}, expressing themselves clearly`;
  }
}

function generateCommunityParticipationScene(activity: string, interest: string): string {
  if (activity.includes("store") || activity.includes("shop")) {
    return `a child participating in community activities like shopping${interest ? ` for ${interest}-related items` : ""}, interacting politely with community members`;
  } else if (activity.includes("library") || activity.includes("park")) {
    return `a child enjoying community spaces like the library or park${interest ? ` while engaging with ${interest}-related activities` : ""}, following community rules and being respectful`;
  } else {
    return `a child participating in ${activity} in their community${interest ? ` with ${interest} elements incorporated` : ""}, showing confidence and appropriate social behavior`;
  }
}

function generateInterestEnhancement(interest: string, category: string): string {
  if (!interest) return "";
  
  // Additional interest-specific environmental elements
  const enhancements = [
    `, with ${interest} posters or artwork visible on the walls`,
    `, incorporating ${interest} colors and themes throughout the scene`,
    `, with subtle ${interest} elements that make the environment more engaging`,
    `, featuring ${interest}-inspired decorations that create a motivating atmosphere`
  ];
  
  // Choose enhancement based on category for more relevant integration
  if (category === "social_skills") {
    return `, with ${interest} providing a natural conversation topic or shared interest between children`;
  } else if (category === "emotional_regulation") {
    return `, using ${interest} as a calming focal point and emotional regulation tool`;
  } else if (category === "daily_living") {
    return `, with ${interest} themes making the daily routine more enjoyable and motivating`;
  } else {
    return enhancements[0]; // Default to posters/artwork
  }
}
>>>>>>> parent of c3ecce1 (Change to OpenAI response functionality)
