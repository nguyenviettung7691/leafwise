
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PlantGrid } from '@/components/plants/PlantGrid';
import { Button } from '@/components/ui/button';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantHealthCondition, PlantFormData } from '@/types';
import { PlusCircle, Loader2, Settings2 as ManageIcon, Check, Trash2, Edit3 } from 'lucide-react';
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
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as DialogTitlePrimitive,
  DialogDescription as DialogDescriptionPrimitive,
} from "@/components/ui/dialog";
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { useToast } from '@/hooks/use-toast';


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

const getNextCareTaskDate = (plant: Plant): Date | null => {
  if (!plant.careTasks || plant.careTasks.length === 0) return null;
  const upcomingTasks = plant.careTasks
    .filter(task => !task.isPaused && task.nextDueDate)
    .map(task => parseISO(task.nextDueDate!))
    .filter(date => date >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => a.getTime() - b.getTime());
  return upcomingTasks.length > 0 ? upcomingTasks[0] : null;
};


export default function MyPlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigatingToNewPlant, setIsNavigatingToNewPlant] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();

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
    setPlants(mockPlants);
    setIsLoading(false);
  }, []);

  const handleAddNewPlantClick = () => {
    setIsNavigatingToNewPlant(true);
    router.push('/plants/new');
  };

  const handleOpenEditPlantDialog = useCallback((plantId: string) => {
    const foundPlant = mockPlants.find(p => p.id === plantId);
    if (foundPlant) {
      setPlantToEdit(foundPlant);
      let ageYears: number | undefined = undefined;
      if (foundPlant.ageEstimate) {
        const match = foundPlant.ageEstimate.match(/(\d+(\.\d+)?)/);
        if (match && match[1]) {
          ageYears = parseFloat(match[1]);
        }
      }
      setInitialEditFormData({
        commonName: foundPlant.commonName,
        scientificName: foundPlant.scientificName || '',
        familyCategory: foundPlant.familyCategory || '',
        ageEstimateYears: ageYears,
        healthCondition: foundPlant.healthCondition,
        location: foundPlant.location || '',
        customNotes: foundPlant.customNotes || '',
        diagnosedPhotoDataUrl: foundPlant.primaryPhotoUrl || null,
      });
      setIsEditPlantDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Plant not found for editing.", variant: "destructive" });
    }
  }, [toast]);

  const handleSaveEditedPlant = async (data: PlantFormData) => {
    if (!plantToEdit) return;
    setIsSavingEditedPlant(true);

    await new Promise(resolve => setTimeout(resolve, 1000)); 

    const plantIndex = mockPlants.findIndex(p => p.id === plantToEdit.id);
    if (plantIndex !== -1) {
      let newPrimaryPhotoUrl = data.diagnosedPhotoDataUrl;
      let updatedPhotos = [...mockPlants[plantIndex].photos];

      if (data.primaryPhoto && data.primaryPhoto[0]) {
        newPrimaryPhotoUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(data.primaryPhoto![0]);
        });
        if (newPrimaryPhotoUrl) {
          const existingPhotoIndex = updatedPhotos.findIndex(p => p.url === newPrimaryPhotoUrl);
          if (existingPhotoIndex === -1) { 
            updatedPhotos.unshift({ 
              id: `p-${plantToEdit.id}-new-${Date.now()}`,
              url: newPrimaryPhotoUrl,
              dateTaken: new Date().toISOString(),
              healthCondition: data.healthCondition,
              diagnosisNotes: "Primary photo updated via edit form."
            });
          }
        }
      }


      mockPlants[plantIndex] = {
        ...mockPlants[plantIndex],
        commonName: data.commonName,
        scientificName: data.scientificName || undefined,
        familyCategory: data.familyCategory || '',
        ageEstimate: data.ageEstimateYears ? `${data.ageEstimateYears} years` : undefined,
        ageEstimateYears: data.ageEstimateYears,
        healthCondition: data.healthCondition,
        location: data.location || undefined,
        customNotes: data.customNotes || undefined,
        primaryPhotoUrl: newPrimaryPhotoUrl || mockPlants[plantIndex].primaryPhotoUrl,
        photos: updatedPhotos,
      };
      setPlants([...mockPlants]); 
      toast({ title: "Plant Updated!", description: `${data.commonName} has been updated.` });
    } else {
      toast({ title: "Error", description: "Could not find plant to update.", variant: "destructive" });
    }

    setIsSavingEditedPlant(false);
    setIsEditPlantDialogOpen(false);
    setPlantToEdit(null);
    setInitialEditFormData(undefined);
  };

  const handleCancelEditPlantDialog = () => {
    setIsEditPlantDialogOpen(false);
    setPlantToEdit(null);
    setInitialEditFormData(undefined);
  };


  const handleFilterChange = (filterName: keyof Filters, value: string) => {
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
    '<1': (age) => age !== undefined && age < 1,
    '1-3': (age) => age !== undefined && age >= 1 && age <= 3,
    '>3': (age) => age !== undefined && age > 3,
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

      const matchesAge = ageRanges[filters.ageRange](plant.ageEstimateYears);
      const matchesLocation = filters.location ? (plant.location && plant.location.toLowerCase().includes(filters.location.toLowerCase())) : true;
      const matchesFamily = filters.familyCategory ? (plant.familyCategory && plant.familyCategory.toLowerCase().includes(filters.familyCategory.toLowerCase())) : true;
      const matchesHealth = filters.healthCondition === 'all' || plant.healthCondition === filters.healthCondition;

      return matchesSearch && matchesAge && matchesLocation && matchesFamily && matchesHealth;
    });

    processedPlants.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortConfig.key === 'nextCareDate') {
        valA = getNextCareTaskDate(a);
        valB = getNextCareTaskDate(b);
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
        if (sortConfig.key === 'plantingDate' || sortConfig.key === 'lastCaredDate') {
           comparison = compareAsc(parseISO(valA), parseISO(valB));
        } else {
           comparison = valA.toLowerCase().localeCompare(valB.toLowerCase());
        }
      }

      return sortConfig.direction === 'asc' ? comparison : comparison * -1;
    });

    return processedPlants;
  }, [plants, filters, sortConfig]);


  const sortOptions: { value: SortConfig['key']; label: string }[] = [
    { value: 'commonName', label: 'Common Name' },
    { value: 'scientificName', label: 'Scientific Name' },
    { value: 'ageEstimateYears', label: 'Age' },
    { value: 'location', label: 'Location' },
    { value: 'familyCategory', label: 'Family Category' },
    { value: 'healthCondition', label: 'Health Condition' },
    { value: 'plantingDate', label: 'Created Date' },
    { value: 'lastCaredDate', label: 'Last Cared Date' },
    { value: 'nextCareDate', label: 'Next Care Task' },
  ];

  const healthConditionOptions: { value: PlantHealthCondition | 'all'; label: string }[] = [
    { value: 'all', label: 'All Health Conditions' },
    { value: 'healthy', label: 'Healthy' },
    { value: 'needs_attention', label: 'Needs Attention' },
    { value: 'sick', label: 'Sick' },
    { value: 'unknown', label: 'Unknown' },
  ];

  const ageRangeOptions = [
    { value: 'all', label: 'All Ages' },
    { value: '<1', label: 'Less than 1 year' },
    { value: '1-3', label: '1-3 years' },
    { value: '>3', label: 'Over 3 years' },
  ];

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

  const handleDeleteSelectedPlants = () => {
    const numSelected = selectedPlantIds.size;
    const updatedPlants = mockPlants.filter(p => !selectedPlantIds.has(p.id));
    mockPlants.length = 0;
    mockPlants.push(...updatedPlants);
    setPlants(updatedPlants);

    toast({
      title: "Plants Deleted",
      description: `${numSelected} plant${numSelected > 1 ? 's have' : ' has'} been deleted.`,
    });
    setSelectedPlantIds(new Set());
    setIsManagingPlants(false);
    setShowDeleteConfirmDialog(false);
  };


  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.myPlants')}</h1>
        <div className="flex items-center gap-2">
          {isManagingPlants && selectedPlantIds.size > 0 && (
            <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirmDialog(true)}
                size="sm"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedPlantIds.size})
            </Button>
          )}
          <Button variant="outline" onClick={toggleManagePlantsMode} size="sm">
            {isManagingPlants ? <Check className="mr-2 h-4 w-4" /> : <ManageIcon className="mr-2 h-4 w-4" />}
            {isManagingPlants ? 'Done' : 'Manage'}
          </Button>
          <Button onClick={handleAddNewPlantClick} disabled={isNavigatingToNewPlant || isManagingPlants}>
            {isNavigatingToNewPlant ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <PlusCircle className="mr-2 h-5 w-5" />
            )}
            {isNavigatingToNewPlant ? 'Navigating...' : 'Add New Plant'}
          </Button>
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

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading your beautiful plants...</p>
        </div>
      ) : (
        <PlantGrid
          plants={filteredAndSortedPlants}
          isManaging={isManagingPlants}
          selectedPlantIds={selectedPlantIds}
          onToggleSelect={handleTogglePlantSelection}
          onEdit={handleOpenEditPlantDialog}
        />
      )}

      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected {selectedPlantIds.size} plant{selectedPlantIds.size > 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelectedPlants} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditPlantDialogOpen} onOpenChange={setIsEditPlantDialogOpen}>
        <DialogContent className="sm:max-w-2xl p-0">
          {plantToEdit && initialEditFormData && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitlePrimitive>Edit Plant</DialogTitlePrimitive>
                <DialogDescriptionPrimitive>
                  Update the details for {plantToEdit.commonName}.
                </DialogDescriptionPrimitive>
              </DialogHeader>
              <SavePlantForm
                initialData={initialEditFormData}
                galleryPhotos={plantToEdit.photos}
                onSave={handleSaveEditedPlant}
                onCancel={handleCancelEditPlantDialog}
                isLoading={isSavingEditedPlant}
                hideInternalHeader={true} 
                submitButtonText="Update Plant"
              />
            </>
          )}
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
