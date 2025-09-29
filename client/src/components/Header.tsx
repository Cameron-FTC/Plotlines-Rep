import { Heart, Users } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-app-title">
              Allied Health Social Story Tool
            </h1>
            <p className="text-sm text-muted-foreground">
              Create personalized, neuro-affirming stories for therapeutic support
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}