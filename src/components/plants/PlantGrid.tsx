
import type { Plant } from '@/types';
import { PlantCard } from './PlantCard';
import { Leaf, Sparkles, PlusCircle } from 'lucide-react'; // Import Sparkles and PlusCircle
import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink'; // Import ProgressBarLink
import { Button } from '@/components/ui/button'; // Import Button
import { cn } from '@/lib/utils'; // Import cn

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
      <div className="text-center py-16 px-6 flex flex-col items-center bg-card shadow-lg rounded-lg border border-border">
        <div className="relative mb-6">
          <Leaf className="h-24 w-24 text-primary/20" />
          <Sparkles className="h-10 w-10 text-accent absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground mb-3">
          {t('myPlantsPage.emptyState.title')}
        </h3>
        <p className="text-md text-muted-foreground max-w-md mb-6">
          {t('myPlantsPage.emptyState.descriptionPart1')}
          <ProgressBarLink href="/diagnose" className="font-semibold text-primary hover:underline">
            {t('nav.diagnosePlant')}
          </ProgressBarLink>
          {t('myPlantsPage.emptyState.descriptionPart2')}
        </p>
        <ProgressBarLink href="/plants/new">
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" />
            {t('myPlantsPage.emptyState.addNewPlantButton')}
          </Button>
        </ProgressBarLink>
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
