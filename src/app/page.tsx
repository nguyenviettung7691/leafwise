
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PlantGrid } from '@/components/plants/PlantGrid';
import { Button } from '@/components/ui/button';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantHealthCondition } from '@/types';
import { PlusCircle, Loader2, Search as SearchIcon, Filter as FilterIcon, ArrowDownUp } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseISO, compareAsc, compareDesc } from 'date-fns';

interface Filters {
  searchTerm: string;
  ageRange: string;
  location: string;
  familyCategory: string;
  healthCondition: PlantHealthCondition | 'all';
}

interface SortConfig {
  key: keyof Plant | 'nextCareDate' | 'commonName' | 'scientificName' | 'plantingDate' | 'lastCaredDate' | 'ageEstimateYears' | 'location' | 'familyCategory' | 'healthCondition';
  direction: 'asc' | 'desc';
}

const getNextCareTaskDate = (plant: Plant): Date | null => {
  if (!plant.careTasks || plant.careTasks.length === 0) return null;
  const upcomingTasks = plant.careTasks
    .filter(task => !task.isPaused && task.nextDueDate)
    .map(task => parseISO(task.nextDueDate!))
    .filter(date => date >= new Date(new Date().setHours(0,0,0,0))) // Only today or future
    .sort((a, b) => a.getTime() - b.getTime());
  return upcomingTasks.length > 0 ? upcomingTasks[0] : null;
};


export default function MyPlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigatingToNewPlant, setIsNavigatingToNewPlant] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    ageRange: 'all',
    location: '',
    familyCategory: '',
    healthCondition: 'all',
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'commonName',
    direction: 'asc',
  });

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

  const handleSortChange = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  
  const handleSortDirectionChange = (direction: 'asc' | 'desc') => {
    setSortConfig(prev => ({ ...prev, direction }));
  };

  const ageRanges: Record<string, (age: number | undefined) => boolean> = {
    all: () => true,
    '<1': (age) => age !== undefined && age < 1,
    '1-3': (age) => age !== undefined && age >= 1 && age <= 3,
    '>3': (age) => age !== undefined && age > 3,
  };

  const filteredAndSortedPlants = useMemo(() => {
    let processedPlants = [...plants];

    // Filtering
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

    // Sorting
    processedPlants.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortConfig.key === 'nextCareDate') {
        valA = getNextCareTaskDate(a);
        valB = getNextCareTaskDate(b);
        // Handle nulls: plants with no upcoming tasks go to the end
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;
      } else {
        valA = a[sortConfig.key as keyof Plant];
        valB = b[sortConfig.key as keyof Plant];
      }
      
      let comparison = 0;
      if (valA === undefined || valA === null) comparison = 1; // undefined/nulls go last for asc
      else if (valB === undefined || valB === null) comparison = -1; // undefined/nulls go first for asc
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

      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FilterIcon className="h-5 w-5 text-primary" />
            Filter & Sort Plants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">Search</label>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, location, family..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="ageRange" className="block text-sm font-medium text-muted-foreground mb-1">Age Range</label>
              <Select value={filters.ageRange} onValueChange={(value) => handleFilterChange('ageRange', value)}>
                <SelectTrigger id="ageRange"><SelectValue placeholder="Select age range" /></SelectTrigger>
                <SelectContent>
                  {ageRangeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="healthCondition" className="block text-sm font-medium text-muted-foreground mb-1">Health Condition</label>
              <Select value={filters.healthCondition} onValueChange={(value) => handleFilterChange('healthCondition', value as PlantHealthCondition | 'all')}>
                <SelectTrigger id="healthCondition"><SelectValue placeholder="Select health condition" /></SelectTrigger>
                <SelectContent>
                  {healthConditionOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="locationFilter" className="block text-sm font-medium text-muted-foreground mb-1">Location</label>
              <Input
                id="locationFilter"
                placeholder="Filter by location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="familyCategoryFilter" className="block text-sm font-medium text-muted-foreground mb-1">Family Category</label>
              <Input
                id="familyCategoryFilter"
                placeholder="Filter by family"
                value={filters.familyCategory}
                onChange={(e) => handleFilterChange('familyCategory', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label htmlFor="sortKey" className="block text-sm font-medium text-muted-foreground mb-1">Sort By</label>
                    <Select value={sortConfig.key} onValueChange={(value) => handleSortChange(value as SortConfig['key'])}>
                        <SelectTrigger id="sortKey"><SelectValue placeholder="Select sort key" /></SelectTrigger>
                        <SelectContent>
                        {sortOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <label htmlFor="sortDirection" className="block text-sm font-medium text-muted-foreground mb-1">Direction</label>
                    <Select value={sortConfig.direction} onValueChange={(value) => handleSortDirectionChange(value as 'asc' | 'desc')}>
                        <SelectTrigger id="sortDirection"><SelectValue placeholder="Select direction" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
