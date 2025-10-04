import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Social Story schemas
export const socialStoryRequestSchema = z.object({
  characterName: z.string().min(1, "Character name is required"),
  personPerspective: z.enum(["first", "third"]).default("first"),
  motivatingInterest: z.string().min(1, "Interest is required"),
  storyCategory: z.enum(["daily_living", "social_skills", "emotional_regulation", "motor_skills", "sensory_regulation", "communication", "community_participation", "other"]),
  customCategory: z.string().optional(),
  specificActivity: z.string().min(1, "Specific activity is required"),
  additionalNotes: z.string().optional(),
});

export type SocialStoryRequest = z.infer<typeof socialStoryRequestSchema>;

export interface StepImage {
  stepNumber: number;
  stepText: string;
  imageUrl?: string;
}

export interface GeneratedSocialStory {
  id: string;
  title: string;
  story: string;
  imageUrl?: string; // Main story image (deprecated, keeping for compatibility)
  stepImages?: StepImage[]; // New: images for each step
  request: SocialStoryRequest;
  createdAt: string; // ISO string for JSON serialization
}
