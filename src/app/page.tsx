
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PlantGrid } from '@/components/plants/PlantGrid';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Settings2 as ManageIcon, Check, Trash2, MoreVertical } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseISO, compareAsc } from 'date-fns';
import { PlantFilterSortControls, type Filters, type SortConfig } from '@/components/plants/PlantFilterSortControls';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as DialogTitlePrimitive, // Renamed to avoid conflict if DialogTitle from ui/dialog is also used
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as ShadDialogTitle, // Use a different alias
  DialogDescription as ShadDialogDescription, // Use a different alias
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { useToast } from '@/hooks/use-toast';
import { usePlantData } from '@/contexts/PlantDataContext';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { Plant, CareTask, PlantFormData, PlantHealthCondition } from '@/types';

const initialFiltersState: Filters = {
  searchTerm: '',
  ageRange: 'all',
  location: '',
  familyCategory: '',
  healthCondition: 'all',
};

const initialSortConfigState: SortConfig = {
  key: 'nextCareDate',
  direction: 'asc',
};

// Modified to accept all care tasks and the plant ID
const getNextCareTaskDate = (allCareTasks: CareTask[], plantId: string): Date | null => {
  const plantTasks = allCareTasks.filter(task => task.plantId === plantId);

  if (!plantTasks || plantTasks.length === 0) return null;

  // Step 1: Map tasks to potential dates, handling parsing errors
  const parsedDates: (Date | null)[] = plantTasks
    .filter(task => !task.isPaused && task.nextDueDate)
    .map(task => {
      try {
        return parseISO(task.nextDueDate!);
      } catch (e) {
        console.error("Error parsing nextDueDate for task:", task.name, task.nextDueDate, e);
        return null;
      }
    });

  // Step 2: Filter out nulls and ensure we have a clean Date array
  const validDates: Date[] = parsedDates.filter(date => date !== null) as Date[];

  // Step 3: Filter for future dates (or today) and sort
  const upcomingTasks = validDates
    .filter(date => date >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => a.getTime() - b.getTime());

  return upcomingTasks.length > 0 ? upcomingTasks[0] : null;
};

export default function MyPlantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { plants: plantsFromContext, careTasks: careTasksFromContext, plantPhotos: plantPhotosFromContext, isLoading: isLoadingPlants, deleteMultiplePlants, updatePlant: updateContextPlant } = usePlantData();
  
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isNavigatingToNewPlant, setIsNavigatingToNewPlant] = useState(false);
  const isStandalone = usePWAStandalone();

  const [filters, setFilters] = useState<Filters>(initialFiltersState);
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSortConfigState);

  const [isManagingPlants, setIsManagingPlants] = useState(false);
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  const [isEditPlantDialogOpen, setIsEditPlantDialogOpen] = useState(false);
  const [plantToEdit, setPlantToEdit] = useState<Plant | null>(null);
  const [initialEditFormData, setInitialEditFormData] = useState<Partial<PlantFormData> | undefined>(undefined);
  const [isSavingEditedPlant, setIsSavingEditedPlant] = useState(false);


  useEffect(() => {
    if (!isLoadingPlants) {
      setPlants(plantsFromContext);
    }
  }, [plantsFromContext, isLoadingPlants]);

  const handleAddNewPlantClick = () => {
    setIsNavigatingToNewPlant(true);
    router.push('/plants/new');
  };

  const handleOpenEditPlantDialog = useCallback((plantId: string) => {
    const foundPlant = plantsFromContext.find(p => p.id === plantId);
    if (foundPlant) {
      setPlantToEdit(foundPlant);
      setInitialEditFormData({
        commonName: foundPlant.commonName,
        scientificName: foundPlant.scientificName || '',
        familyCategory: foundPlant.familyCategory || '',
        ageEstimateYears: foundPlant.ageEstimateYears,
        healthCondition: foundPlant.healthCondition as PlantHealthCondition,
        location: foundPlant.location || '',
        customNotes: foundPlant.customNotes || '',
        diagnosedPhotoDataUrl: foundPlant.primaryPhotoUrl || null,
      });
      setIsEditPlantDialogOpen(true);
    } else {
      toast({ title: t('common.error'), description: t('myPlantsPage.plantNotFoundError'), variant: "destructive" });
    }
  }, [plantsFromContext, t, toast]);

  const handleSaveEditedPlant = async (data: Omit<PlantFormData, 'primaryPhoto' | 'diagnosedPhotoDataUrl'>, primaryPhotoFile?: File | null) => {
    if (!plantToEdit || !plantToEdit.id || !user?.id) {
       toast({ title: t('common.error'), description: t('myPlantsPage.plantNotFoundError'), variant: 'destructive'});
       return;
    }
    setIsSavingEditedPlant(true);

    const updatedPlantData: Partial<Omit<Plant, 'photos' | 'careTasks' | 'owner'>> = {
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory || '',
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
    };

    try {
        await updateContextPlant(plantToEdit.id, updatedPlantData, primaryPhotoFile);

        toast({ title: t('myPlantsPage.plantUpdatedToastTitle'), description: t('myPlantsPage.plantUpdatedToastDescription', { plantName: data.commonName }) });

        setIsEditPlantDialogOpen(false);
        setPlantToEdit(null);
        setInitialEditFormData(undefined);

    } catch (error) {
        console.error("Error saving edited plant:", error);
        toast({ title: t('common.error'), description: t('myPlantsPage.toastErrorSavingPlant'), variant: "destructive" });
    } finally {
        setIsSavingEditedPlant(false);
    }
  };

  const handleCancelEditPlantDialog = () => {
    setIsEditPlantDialogOpen(false);
    setPlantToEdit(null);
    setInitialEditFormData(undefined);
  };


  const handleFilterChange = (filterName: keyof Filters, value: string | PlantHealthCondition) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleSortKeyChange = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSortDirectionChange = (direction: 'asc' | 'desc') => {
    setSortConfig(prev => ({ ...prev, direction }));
  };

  const handleResetAll = () => {
    setFilters(initialFiltersState);
    setSortConfig(initialSortConfigState);
  };

  const ageRanges: Record<string, (age: number | undefined) => boolean> = {
    all: () => true,
    '<1': (age) => age !== undefined && age !== null && age < 1,
    '1-3': (age) => age !== undefined && age !== null && age >= 1 && age <= 3,
    '>3': (age) => age !== undefined && age !== null && age > 3,
  };

  const filteredAndSortedPlants = useMemo(() => {
    let processedPlants = [...plants];

    processedPlants = processedPlants.filter(plant => {
      const searchTermLower = filters.searchTerm.toLowerCase();
      const matchesSearch =
        plant.commonName.toLowerCase().includes(searchTermLower) ||
        (plant.scientificName && plant.scientificName.toLowerCase().includes(searchTermLower)) ||
        (plant.location && plant.location.toLowerCase().includes(searchTermLower)) ||
        (plant.familyCategory && plant.familyCategory.toLowerCase().includes(searchTermLower));

      const matchesAge = ageRanges[filters.ageRange](plant.ageEstimateYears ?? undefined);
      const matchesLocation = filters.location ? (plant.location && plant.location.toLowerCase().includes(filters.location.toLowerCase())) : true;
      const matchesFamily = filters.familyCategory ? (plant.familyCategory && plant.familyCategory.toLowerCase().includes(filters.familyCategory.toLowerCase())) : true;
      const matchesHealth = filters.healthCondition === 'all' || plant.healthCondition === filters.healthCondition;

      return matchesSearch && matchesAge && matchesLocation && matchesFamily && matchesHealth;
    });

    processedPlants.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortConfig.key === 'nextCareDate') {
        valA = getNextCareTaskDate(careTasksFromContext, a.id);
        valB = getNextCareTaskDate(careTasksFromContext, b.id);
        if (valA === null && valB === null) return 0;
        if (valA === null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (valB === null) return sortConfig.direction === 'asc' ? -1 : 1;
      } else {
        valA = a[sortConfig.key as keyof Plant];
        valB = b[sortConfig.key as keyof Plant];
      }

      let comparison = 0;
      if (valA === undefined || valA === null) comparison = 1;
      else if (valB === undefined || valB === null) comparison = -1;
      else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (valA instanceof Date && valB instanceof Date) {
        comparison = compareAsc(valA, valB);
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        if (sortConfig.key === 'plantingDate') {
           try {
            comparison = compareAsc(parseISO(valA), parseISO(valB));
           } catch (e) {
            comparison = 0;
           }
        } else {
           comparison = valA.toLowerCase().localeCompare(valB.toLowerCase());
        }
      }

      return sortConfig.direction === 'asc' ? comparison : comparison * -1;
    });

    return processedPlants;
  }, [plants, filters, sortConfig, careTasksFromContext]);


  const sortOptions = useMemo(() => [
    { value: 'commonName', label: t('myPlantsPage.filterSortCard.commonNameSort') },
    { value: 'scientificName', label: t('myPlantsPage.filterSortCard.scientificNameSort') },
    { value: 'ageEstimateYears', label: t('myPlantsPage.filterSortCard.ageSort') },
    { value: 'location', label: t('myPlantsPage.filterSortCard.locationSort') },
    { value: 'familyCategory', label: t('myPlantsPage.filterSortCard.familyCategorySort') },
    { value: 'healthCondition', label: t('myPlantsPage.filterSortCard.healthConditionSort') },
    { value: 'plantingDate', label: t('myPlantsPage.filterSortCard.createdDateSort') },
    { value: 'nextCareDate', label: t('myPlantsPage.filterSortCard.nextCareTaskSort') },
  ], [t]);

  const healthConditionOptions: { value: PlantHealthCondition | 'all'; label: string }[] = useMemo(() => [
    { value: 'all', label: t('myPlantsPage.filterSortCard.allHealthConditions') },
    { value: 'healthy', label: t('common.healthy') },
    { value: 'needs_attention', label: t('common.needs_attention') },
    { value: 'sick', label: t('common.sick') },
    { value: 'unknown', label: t('common.unknown') },
  ], [t]);

  const ageRangeOptions = useMemo(() => [
    { value: 'all', label: t('myPlantsPage.filterSortCard.allAges') },
    { value: '<1', label: t('myPlantsPage.filterSortCard.ageLessThanOneYear') },
    { value: '1-3', label: t('myPlantsPage.filterSortCard.ageOneToThreeYears') },
    { value: '>3', label: t('myPlantsPage.filterSortCard.ageOverThreeYears') },
  ], [t]);

  const toggleManagePlantsMode = () => {
    setIsManagingPlants(prev => {
      if (prev) {
        setSelectedPlantIds(new Set());
      }
      return !prev;
    });
  };

  const handleTogglePlantSelection = useCallback((plantId: string) => {
    setSelectedPlantIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(plantId)) {
        newSelected.delete(plantId);
      } else {
        newSelected.add(plantId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteSelectedPlants = async () => {
    const numSelected = selectedPlantIds.size;
    if (numSelected === 0 || !user?.id) return;

    deleteMultiplePlants(selectedPlantIds);

    toast({
      title: t('myPlantsPage.plantsDeletedToastTitle'),
      description: t('myPlantsPage.plantsDeletedToastDescription', { count: numSelected }),
    });
    setSelectedPlantIds(new Set());
    setIsManagingPlants(false);
    setShowDeleteConfirmDialog(false);
  };

  return (
    <AppLayout>
      <div className={"mb-6 flex flex-row justify-between items-center"}>
        <h1 className="text-3xl font-bold tracking-tight flex-grow">{t('nav.myPlants')}</h1>
        <div className="flex-shrink-0">
          {isStandalone ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isManagingPlants && selectedPlantIds.size > 0 && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirmDialog(true)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('myPlantsPage.deleteSelected', { count: selectedPlantIds.size })}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={toggleManagePlantsMode}>
                  {isManagingPlants ? <Check className="mr-2 h-4 w-4" /> : <ManageIcon className="mr-2 h-4 w-4" />}
                  {isManagingPlants ? t('myPlantsPage.doneManaging') : t('myPlantsPage.managePlants')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddNewPlantClick} disabled={isNavigatingToNewPlant || isManagingPlants}>
                  {isNavigatingToNewPlant ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {isNavigatingToNewPlant ? t('myPlantsPage.navigating') : t('myPlantsPage.addNewPlant')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2 items-center">
              {isManagingPlants && selectedPlantIds.size > 0 && (
                <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirmDialog(true)}
                    size="sm"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('myPlantsPage.deleteSelected', { count: selectedPlantIds.size })}
                </Button>
              )}
              <Button variant="outline" onClick={toggleManagePlantsMode} size="sm">
                {isManagingPlants ? <Check className="mr-2 h-4 w-4" /> : <ManageIcon className="mr-2 h-4 w-4" />}
                {isManagingPlants ? t('myPlantsPage.doneManaging') : t('myPlantsPage.managePlants')}
              </Button>
              <Button onClick={handleAddNewPlantClick} disabled={isNavigatingToNewPlant || isManagingPlants}>
                {isNavigatingToNewPlant ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-5 w-5" />
                )}
                {isNavigatingToNewPlant ? t('myPlantsPage.navigating') : t('myPlantsPage.addNewPlant')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <PlantFilterSortControls
        filters={filters}
        sortConfig={sortConfig}
        initialFiltersState={initialFiltersState}
        initialSortConfigState={initialSortConfigState}
        ageRangeOptions={ageRangeOptions}
        healthConditionOptions={healthConditionOptions}
        sortOptions={sortOptions}
        onFilterChange={handleFilterChange}
        onSortKeyChange={handleSortKeyChange}
        onSortDirectionChange={handleSortDirectionChange}
        onResetAll={handleResetAll}
      />

      {isLoadingPlants ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">{t('myPlantsPage.loadingPlants')}</p>
        </div>
      ) : (
        <PlantGrid
          plants={filteredAndSortedPlants}
          allCareTasks={careTasksFromContext}
          isManaging={isManagingPlants}
          selectedPlantIds={selectedPlantIds}
          onToggleSelect={handleTogglePlantSelection}
          onEdit={handleOpenEditPlantDialog}
          isPWAStandalone={isStandalone}
        />
      )}

      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitlePrimitive>{t('myPlantsPage.confirmDeleteTitle')}</DialogTitlePrimitive>
            <AlertDialogDescription>
              {t('myPlantsPage.confirmDeleteDescription', { count: selectedPlantIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelectedPlants} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditPlantDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
            handleCancelEditPlantDialog();
        } else {
            setIsEditPlantDialogOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-2xl p-0">
          <DialogHeader className="p-6 pb-0">
            <ShadDialogTitle>{t('myPlantsPage.editPlantDialogTitle')}</ShadDialogTitle>
            <ShadDialogDescription>
              {plantToEdit ? t('myPlantsPage.editPlantDialogDescription', { plantName: plantToEdit.commonName }) : ''}
            </ShadDialogDescription>
          </DialogHeader>
          {plantToEdit && initialEditFormData && (
            <SavePlantForm
              initialData={initialEditFormData}
              galleryPhotos={plantPhotosFromContext.filter(photo => photo.plantId === plantToEdit.id)}
              onSave={handleSaveEditedPlant}
              onCancel={handleCancelEditPlantDialog}
              isLoading={isSavingEditedPlant}
              hideInternalHeader={true}
              formTitle={t('myPlantsPage.editPlantDialogTitle')}
              formDescription={plantToEdit ? t('myPlantsPage.editPlantDialogDescription', { plantName: plantToEdit.commonName }) : ''}
              submitButtonText={t('common.update')}
            />
          )}
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
