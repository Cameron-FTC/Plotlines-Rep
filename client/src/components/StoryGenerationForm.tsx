import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, BookOpen } from "lucide-react";
import { socialStoryRequestSchema, type SocialStoryRequest } from "@shared/schema";
import { Switch } from "@/components/ui/switch";

interface StoryGenerationFormProps {
  onSubmit: (data: SocialStoryRequest) => void;
  isGenerating: boolean;
}

const storyCategoryOptions = [
  { value: "daily_living", label: "Activities of Daily Living", description: "Tasks like brushing teeth, getting dressed, eating meals" },
  { value: "social_skills", label: "Social Skills", description: "Interactions like sharing, taking turns, making friends" },
  { value: "emotional_regulation", label: "Emotional Regulation", description: "Managing feelings like anger, disappointment, excitement" },
  { value: "motor_skills", label: "Motor Skills", description: "Physical activities like throwing a ball, writing, walking" },
  { value: "sensory_regulation", label: "Sensory Regulation", description: "Managing sensory input like loud sounds, textures, bright lights" },
  { value: "communication", label: "Communication", description: "Expressing needs, asking for help, having conversations" },
  { value: "community_participation", label: "Community Participation", description: "Activities like shopping, using public transport, visiting places" },
  { value: "other", label: "Other", description: "Custom category for specific needs" }
];

export default function StoryGenerationForm({ onSubmit, isGenerating }: StoryGenerationFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [showAdditionalNotes, setShowAdditionalNotes] = useState(false);

  const form = useForm<SocialStoryRequest>({
    resolver: zodResolver(socialStoryRequestSchema),
    defaultValues: {
      characterName: "",
      personPerspective: "first" as const,
      motivatingInterest: "",
      storyCategory: "daily_living" as const,
      customCategory: "",
      specificActivity: "",
      additionalNotes: "",
      individualFactors: false
    }
  });

  const handleSubmit = (data: SocialStoryRequest) => {
    console.log("Form submitted:", data);
    onSubmit(data);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Create Your Social Story
        </CardTitle>
        <p className="text-muted-foreground">
          Fill out the form below to generate a personalized, neuro-affirming story tailored to your client's needs.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Character Name */}
            <FormField
              control={form.control}
              name="characterName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Character Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Sarah, Alex, the child's actual name..."
                      data-testid="input-character-name"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Person Perspective */}
            <FormField
              control={form.control}
              name="personPerspective"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Story Perspective</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                      data-testid="radio-person-perspective"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="first" id="first" />
                        <Label htmlFor="first" className="font-normal">
                          First person (I, me, my) - "I am learning to brush my teeth"
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="third" id="third" />
                        <Label htmlFor="third" className="font-normal">
                          Third person (character name) - "Alex is learning to brush Alex's teeth"
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Motivating Interest */}
            <FormField
              control={form.control}
              name="motivatingInterest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivating Interest</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., dinosaurs, music, trains, art, cooking, sports..."
                      data-testid="input-motivating-interest"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Story Category */}
            <FormField
              control={form.control}
              name="storyCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Story Category</FormLabel>
                  <Select onValueChange={(value) => { 
                    field.onChange(value); 
                    setSelectedCategory(value);
                    setShowCustomCategory(value === "other");
                    if (value !== "other") {
                      form.setValue("customCategory", "");
                    }
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-story-category">
                        <SelectValue placeholder="Select story category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {storyCategoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Category Field */}
            {showCustomCategory && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify category</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter specific category type..."
                        data-testid="input-custom-category"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Specific Activity */}
            <FormField
              control={form.control}
              name="specificActivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specific Activity</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., brushing teeth, sharing toys, managing disappointment, throwing a ball"
                      data-testid="input-specific-activity"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Include Individual Factors Switch */}
            <FormField
              control={form.control}
              name="individualFactors"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex items-center space-x-2">
                  <FormLabel>Include Individual Factors</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={checked => {
                        field.onChange(checked);
                        setShowAdditionalNotes(checked);
                      }}
                      data-testid="switch-individual-factors"
                    />
                  </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Notes */}
            {showAdditionalNotes && (
            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any specific considerations, preferences, or details you'd like to include in the story..."
                      className="min-h-20"
                      data-testid="textarea-additional-notes"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isGenerating}
              data-testid="button-generate-story"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Generating Story...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Social Story
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}