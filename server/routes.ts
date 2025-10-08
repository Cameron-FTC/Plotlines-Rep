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

const response = await openai.responses.create({
    model: "gpt-4.1",
    input: "Tell me a three sentence bedtime story about a unicorn."
});

console.log(response);

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
