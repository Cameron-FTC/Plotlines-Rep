import { useState } from "react";
import Header from "@/components/Header";
import StoryGenerationForm from "@/components/StoryGenerationForm";
import StoryStepsViewer from "@/components/StoryStepsViewer";
import LoadingSpinner from "@/components/LoadingSpinner";
import { type SocialStoryRequest, type GeneratedSocialStory } from "@shared/schema";

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<GeneratedSocialStory | null>(null);

  const handleGenerateStory = async (request: SocialStoryRequest) => {
    console.log("Generating story for:", request);
    setIsGenerating(true);
    
    try {
      // Call backend API to generate story with image
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to generate story');
      }

      // The backend now generates the complete story with step images
      const generatedStory = await response.json();
      
      setGeneratedStory(generatedStory);
    } catch (error) {
      console.error("Error generating story:", error);
      // In a real app, show error message to user
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditStory = () => {
    setGeneratedStory(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!generatedStory ? (
          isGenerating ? (
            <div className="max-w-4xl mx-auto">
              <LoadingSpinner 
                message="Generating your personalized social story... This may take a moment."
                size="lg"
              />
            </div>
          ) : (
            <StoryGenerationForm 
              onSubmit={handleGenerateStory}
              isGenerating={isGenerating}
            />
          )
        ) : (
          <div className="space-y-6">
            <StoryStepsViewer 
              story={generatedStory}
              onEdit={handleEditStory}
            />
          </div>
        )}
      </main>
    </div>
  );
}

// Story generation now handled by backend