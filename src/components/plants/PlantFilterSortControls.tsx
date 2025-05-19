
'use client';

import type { PlantHealthCondition } from '@/types'; // Assuming PlantHealthCondition is in types
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Search as SearchIcon, Filter as FilterIcon, X, RotateCcw } from 'lucide-react';

// Define these types here or import if they are in a central types file and used elsewhere
export interface Filters {
  searchTerm: string;
  ageRange: string;
  location: string;
  familyCategory: string;
  healthCondition: PlantHealthCondition | 'all';
}

export interface SortConfig {
  key: string; // Using string for key to allow 'nextCareDate' etc.
  direction: 'asc' | 'desc';
}

interface PlantFilterSortControlsProps {
  filters: Filters;
  sortConfig: SortConfig;
  initialFiltersState: Filters; // To check if a filter is active
  initialSortConfigState: SortConfig; // To check if sort is non-default
  ageRangeOptions: { value: string; label: string }[];
  healthConditionOptions: { value: PlantHealthCondition | 'all'; label: string }[];
  sortOptions: { value: SortConfig['key']; label: string }[];
  onFilterChange: (filterName: keyof Filters, value: string) => void;
  onSortKeyChange: (key: SortConfig['key']) => void;
  onSortDirectionChange: (direction: 'asc' | 'desc') => void;
  onResetAll: () => void;
}

export function PlantFilterSortControls({
  filters,
  sortConfig,
  initialFiltersState,
  initialSortConfigState,
  ageRangeOptions,
  healthConditionOptions,
  sortOptions,
  onFilterChange,
  onSortKeyChange,
  onSortDirectionChange,
  onResetAll,
}: PlantFilterSortControlsProps) {
  const hasActiveFilters = filters.searchTerm ||
                           filters.ageRange !== initialFiltersState.ageRange ||
                           filters.healthCondition !== initialFiltersState.healthCondition ||
                           filters.location ||
                           filters.familyCategory;
  
  const isDefaultSort = sortConfig.key === initialSortConfigState.key && sortConfig.direction === initialSortConfigState.direction;

  return (
    <Card className="mb-6 shadow-md">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filter-sort-panel" className="border-b-0">
          <AccordionTrigger className="hover:no-underline px-6 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg">
            <div className="flex justify-between items-center w-full">
              <CardTitle className="text-xl flex items-center gap-2">
                <FilterIcon className="h-5 w-5 text-primary" />
                Filter &amp; Sort Plants
              </CardTitle>
            </div>
          </AccordionTrigger>
          
          {(hasActiveFilters || !isDefaultSort) && (
            <div className="flex flex-wrap gap-2 px-6 py-3 border-t border-b bg-muted/30">
              {filters.searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  Search: "{filters.searchTerm}"
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('searchTerm', '')} aria-label="Clear search term">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {filters.ageRange !== initialFiltersState.ageRange && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  Age: {ageRangeOptions.find(o => o.value === filters.ageRange)?.label}
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('ageRange', initialFiltersState.ageRange)} aria-label="Clear age filter">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {filters.healthCondition !== initialFiltersState.healthCondition && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  Health: {healthConditionOptions.find(o => o.value === filters.healthCondition)?.label}
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('healthCondition', initialFiltersState.healthCondition)} aria-label="Clear health filter">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {filters.location && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  Location: "{filters.location}"
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('location', '')} aria-label="Clear location filter">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {filters.familyCategory && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  Family: "{filters.familyCategory}"
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('familyCategory', '')} aria-label="Clear family filter">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {!isDefaultSort && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  Sort: {sortOptions.find(opt => opt.value === sortConfig.key)?.label} ({sortConfig.direction === 'asc' ? 'Asc' : 'Desc'})
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => {
                      onSortKeyChange(initialSortConfigState.key as SortConfig['key']);
                      onSortDirectionChange(initialSortConfigState.direction);
                    }} aria-label="Reset sort">
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
                      onChange={(e) => onFilterChange('searchTerm', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div> {/* Column 2: Filter By */}
                  <h3 className="text-md font-semibold mb-2 text-foreground/90">Filter By</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="healthCondition" className="block text-sm font-medium text-muted-foreground mb-1">Health Condition</Label>
                      <Select value={filters.healthCondition} onValueChange={(value) => onFilterChange('healthCondition', value as PlantHealthCondition | 'all')}>
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
                        onChange={(e) => onFilterChange('location', e.target.value)}
                      />
                    </div>
                    <div> 
                      <Label htmlFor="familyCategoryFilter" className="block text-sm font-medium text-muted-foreground mb-1">Family Category</Label>
                      <Input
                        id="familyCategoryFilter"
                        placeholder="Filter by family"
                        value={filters.familyCategory}
                        onChange={(e) => onFilterChange('familyCategory', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ageRange" className="block text-sm font-medium text-muted-foreground mb-1">Age Range</Label>
                      <Select value={filters.ageRange} onValueChange={(value) => onFilterChange('ageRange', value)}>
                        <SelectTrigger id="ageRange"><SelectValue placeholder="Select age range" /></SelectTrigger>
                        <SelectContent>
                          {ageRangeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div> {/* Column 3: Sort By */}
                  <h3 className="text-md font-semibold mb-2 text-foreground/90">Sort By</h3>
                  <div className="space-y-3">
                    <div>
                        <Label htmlFor="sortKey" className="block text-sm font-medium text-muted-foreground mb-1">Sort Field</Label>
                        <Select value={sortConfig.key} onValueChange={(value) => onSortKeyChange(value as SortConfig['key'])}>
                            <SelectTrigger id="sortKey"><SelectValue placeholder="Select sort key" /></SelectTrigger>
                            <SelectContent>
                            {sortOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="sortDirection" className="block text-sm font-medium text-muted-foreground mb-1">Direction</Label>
                        <Select value={sortConfig.direction} onValueChange={(value) => onSortDirectionChange(value as 'asc' | 'desc')}>
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
                  <Button variant="outline" onClick={onResetAll} size="sm">
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset All Filters
                  </Button>
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
