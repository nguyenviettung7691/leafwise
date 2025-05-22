
import type { Plant } from '@/types';
import { PlantCard } from './PlantCard';
import { Leaf } from 'lucide-react'; // Import an icon for the empty state
import { useLanguage } from '@/contexts/LanguageContext';

interface PlantGridProps {
  plants: Plant[];
  isManaging?: boolean;
  selectedPlantIds?: Set<string>;
  onToggleSelect?: (plantId: string) => void;
  onEdit?: (plantId: string) => void;
}

export function PlantGrid({ plants, isManaging, selectedPlantIds, onToggleSelect, onEdit }: PlantGridProps) {
  const { t } = useLanguage();

  if (plants.length === 0) {
    return (
      <div className="text-center py-16 px-6 flex flex-col items-center">
        <Leaf className="h-20 w-20 text-primary/30 mb-6" />
        <h3 className="text-2xl font-semibold text-foreground mb-3">
          {t('myPlantsPage.filterSortCard.noPlantsFound')}
        </h3>
        <p className="text-md text-muted-foreground max-w-md">
          {t('myPlantsPage.filterSortCard.noPlantsHint')}
        </p>
        {/* Optional: Add a direct "Add New Plant" button here if desired for empty state UX */}
        {/* <Button onClick={() => router.push('/plants/new')} className="mt-6">
          <PlusCircle className="mr-2 h-5 w-5" />
          {t('myPlantsPage.addNewPlant')}
        </Button> */}
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
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
