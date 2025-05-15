
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PlantGrid } from '@/components/plants/PlantGrid';
import { Button } from '@/components/ui/button';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantHealthCondition } from '@/types';
import { PlusCircle, Loader2, Search as SearchIcon, Filter as FilterIcon, X, RotateCcw } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { parseISO, compareAsc } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

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

  const hasActiveFilters = filters.searchTerm ||
                           filters.ageRange !== 'all' ||
                           filters.healthCondition !== 'all' ||
                           filters.location ||
                           filters.familyCategory;
  
  const isDefaultSort = sortConfig.key === initialSortConfigState.key && sortConfig.direction === initialSortConfigState.direction;


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
        <Accordion type="single" collapsible className="w-full" defaultValue="filter-sort-panel">
          <AccordionItem value="filter-sort-panel" className="border-b-0">
            <AccordionTrigger className="hover:no-underline px-6 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg">
              <div className="flex justify-between items-center w-full">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FilterIcon className="h-5 w-5 text-primary" />
                  Filter &amp; Sort Plants
                </CardTitle>
                {/* AccordionTrigger adds its own chevron */}
              </div>
            </AccordionTrigger>
            
            {(hasActiveFilters || !isDefaultSort) && (
              <div className="flex flex-wrap gap-2 px-6 py-3 border-t border-b bg-muted/30">
                {filters.searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                    Search: "{filters.searchTerm}"
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleFilterChange('searchTerm', '')} aria-label="Clear search term">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </Badge>
                )}
                {filters.ageRange !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                    Age: {ageRangeOptions.find(o => o.value === filters.ageRange)?.label}
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleFilterChange('ageRange', 'all')} aria-label="Clear age filter">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </Badge>
                )}
                {filters.healthCondition !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                    Health: {healthConditionOptions.find(o => o.value === filters.healthCondition)?.label}
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleFilterChange('healthCondition', 'all')} aria-label="Clear health filter">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </Badge>
                )}
                {filters.location && (
                  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                    Location: "{filters.location}"
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleFilterChange('location', '')} aria-label="Clear location filter">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </Badge>
                )}
                {filters.familyCategory && (
                  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                    Family: "{filters.familyCategory}"
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleFilterChange('familyCategory', '')} aria-label="Clear family filter">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </Badge>
                )}
                {!isDefaultSort && (
                  <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                    Sort: {sortOptions.find(opt => opt.value === sortConfig.key)?.label} ({sortConfig.direction === 'asc' ? 'Asc' : 'Desc'})
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => setSortConfig(initialSortConfigState)} aria-label="Reset sort">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}

            <AccordionContent className="pt-0">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <div> {/* Column 1: Search */}
                    <h3 className="text-md font-semibold mb-2 text-foreground/90">Search</h3>
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Name, location, family..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div> {/* Column 2: Filter By */}
                    <h3 className="text-md font-semibold mb-2 text-foreground/90">Filter By</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="ageRange" className="block text-sm font-medium text-muted-foreground mb-1">Age Range</Label>
                        <Select value={filters.ageRange} onValueChange={(value) => handleFilterChange('ageRange', value)}>
                          <SelectTrigger id="ageRange"><SelectValue placeholder="Select age range" /></SelectTrigger>
                          <SelectContent>
                            {ageRangeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="healthCondition" className="block text-sm font-medium text-muted-foreground mb-1">Health Condition</Label>
                        <Select value={filters.healthCondition} onValueChange={(value) => handleFilterChange('healthCondition', value as PlantHealthCondition | 'all')}>
                          <SelectTrigger id="healthCondition"><SelectValue placeholder="Select health condition" /></SelectTrigger>
                          <SelectContent>
                            {healthConditionOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="locationFilter" className="block text-sm font-medium text-muted-foreground mb-1">Location</Label>
                        <Input
                          id="locationFilter"
                          placeholder="Filter by location"
                          value={filters.location}
                          onChange={(e) => handleFilterChange('location', e.target.value)}
                        />
                      </div>
                      <div> 
                        <Label htmlFor="familyCategoryFilter" className="block text-sm font-medium text-muted-foreground mb-1">Family Category</Label>
                        <Input
                          id="familyCategoryFilter"
                          placeholder="Filter by family"
                          value={filters.familyCategory}
                          onChange={(e) => handleFilterChange('familyCategory', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div> {/* Column 3: Sort By */}
                    <h3 className="text-md font-semibold mb-2 text-foreground/90">Sort By</h3>
                    <div className="space-y-3">
                      <div>
                          <Label htmlFor="sortKey" className="block text-sm font-medium text-muted-foreground mb-1">Sort Field</Label>
                          <Select value={sortConfig.key} onValueChange={(value) => handleSortKeyChange(value as SortConfig['key'])}>
                              <SelectTrigger id="sortKey"><SelectValue placeholder="Select sort key" /></SelectTrigger>
                              <SelectContent>
                              {sortOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label htmlFor="sortDirection" className="block text-sm font-medium text-muted-foreground mb-1">Direction</Label>
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
                </div>
                
                <Separator className="my-3" />

                <div className="flex justify-end pt-1">
                    <Button variant="outline" onClick={handleResetAll} size="sm">
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset All Filters
                    </Button>
                </div>
              </CardContent>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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

