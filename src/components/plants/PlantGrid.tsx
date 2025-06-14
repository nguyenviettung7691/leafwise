
import type { Plant, CareTask } from '@/types';
import { PlantCard } from './PlantCard';
import { Leaf, Sparkles, PlusCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlantGridProps {
  plants: Plant[];
  allCareTasks: CareTask[];
  isManaging?: boolean;
  selectedPlantIds?: Set<string>;
  onToggleSelect?: (plantId: string) => void;
  onEdit?: (plantId: string) => void;
  isPWAStandalone?: boolean;
}

export function PlantGrid({
  plants,
  allCareTasks,
  isManaging,
  selectedPlantIds,
  onToggleSelect,
  onEdit,
  isPWAStandalone,
}: PlantGridProps) {
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
          {t('myPlantsPage.emptyState.descriptionPart')}
          <ProgressBarLink href="/diagnose" className="ml-2">
            <Button>
              <Sparkles className="mr-2 h-5 w-5" />
              {t('nav.diagnosePlant')}
            </Button>
          </ProgressBarLink>
        </p>
        <p className="text-sm text-muted-foreground">
          {t('myPlantsPage.emptyState.orAddManually')}
          <ProgressBarLink href="/plants/new" className="font-semibold text-primary hover:underline ml-1">
            {t('myPlantsPage.emptyState.addNewPlantLink')}
          </ProgressBarLink>
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-6",
      isPWAStandalone
        ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    )}>
      {plants.map((plant) => {
        const plantCareTasks = allCareTasks.filter(task => task.plantId === plant.id);
        return (
          <PlantCard
            key={plant.id}
            plant={plant}
            plantCareTasks={plantCareTasks}
            isManaging={isManaging}
            isSelected={selectedPlantIds?.has(plant.id)}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
          />
        );
      })}
    </div>
  );
}
