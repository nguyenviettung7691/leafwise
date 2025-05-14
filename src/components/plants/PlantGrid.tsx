import type { Plant } from '@/types';
import { PlantCard } from './PlantCard';

interface PlantGridProps {
  plants: Plant[];
}

export function PlantGrid({ plants }: PlantGridProps) {
  if (plants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-muted-foreground">No plants added yet.</p>
        <p className="mt-2">Click "Add New Plant" to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {plants.map((plant) => (
        <PlantCard key={plant.id} plant={plant} />
      ))}
    </div>
  );
}
