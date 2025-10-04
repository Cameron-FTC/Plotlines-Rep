import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Printer, Edit3, Calendar } from "lucide-react";
import type { GeneratedSocialStory } from "@shared/schema";

interface StoryPreviewProps {
  story: GeneratedSocialStory;
  onEdit?: () => void;
  onPrint?: () => void;
}

const categoryLabels = {
  daily_living: "Daily Living",
  social_skills: "Social Skills", 
  emotional_regulation: "Emotional Regulation",
  motor_skills: "Motor Skills",
  sensory_regulation: "Sensory Regulation",
  communication: "Communication",
  community_participation: "Community Participation"
};

export default function StoryPreview({ story, onEdit, onPrint }: StoryPreviewProps) {
  const handlePrint = () => {
    console.log('Print story:', story.id);
    if (onPrint) {
      onPrint();
    } else {
      categoryLabels.print();
    }
  };

  const handleEdit = () => {
    console.log('Edit story:', story.id);
    if (onEdit) {
      onEdit();
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl" data-testid="text-story-title">{story.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Created {story.createdAt.toLocaleDateString()}</span>
            </div>
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

        {/* Story Details */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary" data-testid="badge-category">
            {story.request.storyCategory === "other" && story.request.customCategory 
              ? story.request.customCategory 
              : categoryLabels[story.request.storyCategory as keyof typeof categoryLabels]}
          </Badge>
          <Badge variant="outline" data-testid="badge-diagnosis">
            {story.request.diagnosis === "Other" && story.request.customDiagnosis 
              ? story.request.customDiagnosis 
              : story.request.diagnosis}
          </Badge>
          <Badge variant="outline" data-testid="badge-activity">
            {story.request.specificActivity}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Separator />
        
        {/* Story Content */}
        <div className="prose prose-slate max-w-none">
          <div 
            className="text-base leading-7 text-foreground whitespace-pre-wrap font-normal"
            data-testid="text-story-content"
          >
            {story.story}
          </div>
        </div>

        <Separator />

        {/* Story Parameters */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <h4 className="font-medium text-sm text-foreground mb-3">Story Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Character:</span>
              <span className="ml-2 text-foreground">{story.request.characterName}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Interest:</span>
              <span className="ml-2 text-foreground">{story.request.motivatingInterest}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Activity:</span>
              <span className="ml-2 text-foreground">{story.request.specificActivity}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Diagnosis:</span>
              <span className="ml-2 text-foreground">
                {story.request.diagnosis === "Other" && story.request.customDiagnosis 
                  ? story.request.customDiagnosis 
                  : story.request.diagnosis}
              </span>
            </div>
            {story.request.additionalNotes && (
              <div className="md:col-span-2">
                <span className="font-medium text-muted-foreground">Notes:</span>
                <span className="ml-2 text-foreground">{story.request.additionalNotes}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}