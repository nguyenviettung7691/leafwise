
import type { Plant } from '@/types';
import { PlantCard } from './PlantCard';

interface PlantGridProps {
  plants: Plant[];
  isManaging?: boolean;
  selectedPlantIds?: Set<string>;
  onToggleSelect?: (plantId: string) => void;
  onEdit?: (plantId: string) => void; // Added onEdit prop
}

export function PlantGrid({ plants, isManaging, selectedPlantIds, onToggleSelect, onEdit }: PlantGridProps) {
  if (plants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-muted-foreground">No plants found.</p>
        <p className="mt-2">Try adjusting your filters or add new plants!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {plants.map((plant) => (
        <PlantCard
          key={plant.id}
          plant={plant}
          isManaging={isManaging}
          isSelected={selectedPlantIds?.has(plant.id)}
          onToggleSelect={onToggleSelect}
          onEdit={onEdit} // Pass onEdit prop
        />
      ))}
    </div>
  );
}
