import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, BookOpen, Printer, Edit3 } from "lucide-react";
import type { GeneratedSocialStory } from "@shared/schema";

interface StoryStepsViewerProps {
  story: GeneratedSocialStory;
  onEdit?: () => void;
  onPrint?: () => void;
}

export default function StoryStepsViewer({ story, onEdit, onPrint }: StoryStepsViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  
  // Extract steps from the story content
  const extractSteps = (storyContent: string): string[] => {
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
  };

  const steps = extractSteps(story.story);
  const stepsPerPage = 2;
  const totalPages = Math.ceil(steps.length / stepsPerPage);
  
  // Get story content without the steps for introduction/conclusion
  const getStoryWithoutSteps = (storyContent: string): { intro: string; conclusion: string } => {
    const lines = storyContent.split('\n');
    const intro: string[] = [];
    const conclusion: string[] = [];
    let foundFirstStep = false;
    let afterSteps = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (/^\d+\./.test(trimmedLine) || trimmedLine.startsWith('•')) {
        foundFirstStep = true;
        continue;
      }
      
      if (!foundFirstStep && trimmedLine) {
        intro.push(line);
      } else if (foundFirstStep && trimmedLine && !/^\d+\./.test(trimmedLine) && !trimmedLine.startsWith('•')) {
        afterSteps = true;
      }
      
      if (afterSteps && trimmedLine) {
        conclusion.push(line);
      }
    }
    
    return {
      intro: intro.join('\n').trim(),
      conclusion: conclusion.join('\n').trim()
    };
  };

  const { intro, conclusion } = getStoryWithoutSteps(story.story);
  
  const getCurrentPageSteps = () => {
    const startIndex = currentPage * stepsPerPage;
    return steps.slice(startIndex, startIndex + stepsPerPage);
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePrint = () => {
    console.log('Print story:', story.id);
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleEdit = () => {
    console.log('Edit story:', story.id);
    if (onEdit) {
      onEdit();
    }
  };

  // If there are no steps, show the regular story view
  if (steps.length === 0) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {story.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit} data-testid="button-edit-story">
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-story">
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Generated Image */}
          {story.imageUrl && (
            <div className="mb-6 flex justify-center">
              <div className="relative max-w-md w-full">
                <img 
                  src={story.imageUrl} 
                  alt={`Therapeutic illustration for ${story.request.specificActivity}`}
                  className="w-full h-auto rounded-lg shadow-md"
                  data-testid="story-image"
                />
                <div className="absolute inset-0 rounded-lg ring-1 ring-black/5"></div>
              </div>
            </div>
          )}
          <div className="prose prose-slate max-w-none">
            <div className="text-base leading-7 text-foreground whitespace-pre-wrap font-normal">
              {story.story}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = ((currentPage + 1) / totalPages) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2" data-testid="text-story-title">
                <BookOpen className="w-5 h-5 text-primary" />
                {story.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Step-by-step guide: Page {currentPage + 1} of {totalPages}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit} data-testid="button-edit-story">
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-story">
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Story Content Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Introduction (only on first page) */}
          {currentPage === 0 && intro && (
            <div className="mb-8">
              {/* Generated Image */}
              {story.imageUrl && (
                <div className="mb-6 flex justify-center">
                  <div className="relative max-w-md w-full">
                    <img 
                      src={story.imageUrl} 
                      alt={`Therapeutic illustration for ${story.request.specificActivity}`}
                      className="w-full h-auto rounded-lg shadow-md"
                      data-testid="story-image"
                    />
                    <div className="absolute inset-0 rounded-lg ring-1 ring-black/5"></div>
                  </div>
                </div>
              )}
              <div className="text-base leading-7 text-foreground whitespace-pre-wrap font-normal">
                {intro}
              </div>
            </div>
          )}

          {/* Current page steps */}
          <div className="space-y-6">
            {getCurrentPageSteps().map((step, index) => {
              const stepNumber = (currentPage * stepsPerPage) + index + 1;
              // Find the corresponding step image
              const stepImage = story.stepImages?.find(img => img.stepNumber === stepNumber);
              
              return (
                <Card key={index} className="p-6 bg-muted/20">
                  {/* Step Image */}
                  {stepImage?.imageUrl && (
                    <div className="mb-4 flex justify-center">
                      <div className="relative max-w-sm w-full">
                        <img 
                          src={stepImage.imageUrl} 
                          alt={`Step ${stepNumber}: ${step.replace(/^\d+\.\s*/, '').replace(/^•\s*/, '')}`}
                          className="w-full h-auto rounded-lg shadow-md"
                          data-testid={`step-image-${stepNumber}`}
                        />
                        <div className="absolute inset-0 rounded-lg ring-1 ring-black/5"></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full font-semibold text-sm">
                      {stepNumber}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg leading-relaxed text-foreground">
                        {step.replace(/^\d+\.\s*/, '').replace(/^•\s*/, '')}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Conclusion (only on last page) */}
          {currentPage === totalPages - 1 && conclusion && (
            <div className="mt-8">
              <div className="text-base leading-7 text-foreground whitespace-pre-wrap font-normal">
                {conclusion}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={previousPage}
              disabled={currentPage === 0}
              data-testid="button-previous-page"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous Steps
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={i === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(i)}
                  className="w-8 h-8 p-0"
                  data-testid={`button-page-${i + 1}`}
                >
                  {i + 1}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
              data-testid="button-next-page"
            >
              Next Steps
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}