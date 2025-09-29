import LoadingSpinner from '../LoadingSpinner';

export default function LoadingSpinnerExample() {
  return (
    <div className="space-y-8">
      <LoadingSpinner message="Generating your personalized story..." size="lg" />
      <LoadingSpinner message="Processing..." size="md" />
      <LoadingSpinner size="sm" />
    </div>
  );
}