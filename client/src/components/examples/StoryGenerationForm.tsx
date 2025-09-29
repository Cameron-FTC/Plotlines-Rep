import StoryGenerationForm from '../StoryGenerationForm';
import { SocialStoryRequest } from '@shared/schema';

export default function StoryGenerationFormExample() {
  const handleSubmit = (data: SocialStoryRequest) => {
    console.log('Story generation requested:', data);
    alert('Story generation would be triggered here!');
  };

  return (
    <div className="p-6 bg-background">
      <StoryGenerationForm onSubmit={handleSubmit} isGenerating={false} />
    </div>
  );
}