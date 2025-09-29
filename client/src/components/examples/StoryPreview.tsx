import StoryPreview from '../StoryPreview';
import type { GeneratedSocialStory } from '@shared/schema';

export default function StoryPreviewExample() {
  // Mock story data for preview
  const mockStory: GeneratedSocialStory = {
    id: "story-1",
    title: "Sarah's Tooth Brushing Adventure",
    story: `Hi! My name is Sarah and I'm going to tell you about brushing my teeth.

Every morning and every night, I brush my teeth to keep them clean and healthy. It's like giving my teeth a nice bath!

First, I get my special toothbrush. My toothbrush is blue, just like the ocean I love to read about in my favorite books.

Next, I put a small amount of toothpaste on my toothbrush. The toothpaste is minty and fresh.

Then, I brush my teeth gently in small circles. I brush the front teeth, the back teeth, and the teeth on the sides. I count to 10 for each section - just like counting the pages in my favorite storybooks!

When I'm done brushing, I spit out the toothpaste foam and rinse my mouth with water.

Finally, I rinse my toothbrush and put it back in its special place.

Brushing my teeth makes them sparkle and shine, and it helps me stay healthy so I can keep reading all my wonderful books!

Sometimes brushing teeth can feel different in my mouth, and that's okay. If it feels too much, I can take a deep breath and remember that I'm taking good care of myself.

I'm proud of myself every time I brush my teeth because I'm learning to take care of my body!`,
    request: {
      diagnosis: "Autism Spectrum Disorder",
      customDiagnosis: "",
      characterName: "Sarah", 
      motivatingInterest: "books and stories",
      storyCategory: "daily_living",
      customCategory: "",
      specificActivity: "brushing teeth",
      additionalNotes: "Client enjoys reading and stories. Sensory sensitivities around mouth."
    },
    createdAt: new Date()
  };

  return (
    <div className="p-6 bg-background">
      <StoryPreview 
        story={mockStory}
        onEdit={() => console.log('Edit clicked')}
        onPrint={() => console.log('Print clicked')}
      />
    </div>
  );
}