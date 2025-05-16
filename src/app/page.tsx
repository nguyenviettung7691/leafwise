
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PlantGrid } from '@/components/plants/PlantGrid';
import { Button } from '@/components/ui/button';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantHealthCondition } from '@/types';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { parseISO, compareAsc } from 'date-fns';
import { PlantFilterSortControls, type Filters, type SortConfig } from '@/components/plants/PlantFilterSortControls';

const initialFiltersState: Filters = {
  searchTerm: '',
  ageRange: 'all',
  location: '',
  familyCategory: '',
  healthCondition: 'all',
};

const initialSortConfigState: SortConfig = {
  key: 'commonName',
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

  const [filters, setFilters] = useState<Filters>(initialFiltersState);
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSortConfigState);

  useEffect(() => {
    setPlants(mockPlants);
    setIsLoading(false);
  }, []);

  const handleAddNewPlantClick = () => {
    setIsNavigatingToNewPlant(true);
    router.push('/plants/new');
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
        if (valA === null) return 1;
        if (valB === null) return -1;
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

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.myPlants')}</h1>
        <Button onClick={handleAddNewPlantClick} disabled={isNavigatingToNewPlant}>
          {isNavigatingToNewPlant ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <PlusCircle className="mr-2 h-5 w-5" />
          )}
          {isNavigatingToNewPlant ? 'Navigating...' : 'Add New Plant'}
        </Button>
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
        <PlantGrid plants={filteredAndSortedPlants} />
      )}
    </AppLayout>
  );
}
