import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({ message = "Loading...", size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8" data-testid="loading-spinner">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}