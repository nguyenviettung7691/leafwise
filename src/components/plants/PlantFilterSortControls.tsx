
'use client';

import type { PlantHealthCondition } from '@/types'; 
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Search as SearchIcon, Filter as FilterIcon, X, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface Filters {
  searchTerm: string;
  ageRange: string;
  location: string;
  familyCategory: string;
  healthCondition: PlantHealthCondition | 'all';
}

export interface SortConfig {
  key: string; 
  direction: 'asc' | 'desc';
}

interface PlantFilterSortControlsProps {
  filters: Filters;
  sortConfig: SortConfig;
  initialFiltersState: Filters; 
  initialSortConfigState: SortConfig; 
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
  const { t } = useLanguage();

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
                {t('myPlantsPage.filterSortCard.title')}
              </CardTitle>
            </div>
          </AccordionTrigger>
          
          {(hasActiveFilters || !isDefaultSort) && (
            <div className="flex flex-wrap gap-2 px-6 py-3 border-t border-b bg-muted/30">
              {filters.searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  {t('myPlantsPage.filterSortCard.searchChipPrefix', { term: filters.searchTerm })}
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('searchTerm', '')} aria-label={t('myPlantsPage.filterSortCard.clearSearchLabel')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {filters.ageRange !== initialFiltersState.ageRange && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  {t('myPlantsPage.filterSortCard.ageChipPrefix', { label: ageRangeOptions.find(o => o.value === filters.ageRange)?.label || filters.ageRange })}
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('ageRange', initialFiltersState.ageRange)} aria-label={t('myPlantsPage.filterSortCard.clearAgeLabel')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {filters.healthCondition !== initialFiltersState.healthCondition && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  {t('myPlantsPage.filterSortCard.healthChipPrefix', { label: healthConditionOptions.find(o => o.value === filters.healthCondition)?.label || filters.healthCondition })}
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('healthCondition', initialFiltersState.healthCondition)} aria-label={t('myPlantsPage.filterSortCard.clearHealthLabel')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {filters.location && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  {t('myPlantsPage.filterSortCard.locationChipPrefix', { location: filters.location })}
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('location', '')} aria-label={t('myPlantsPage.filterSortCard.clearLocationLabel')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {filters.familyCategory && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  {t('myPlantsPage.filterSortCard.familyChipPrefix', { family: filters.familyCategory })}
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onFilterChange('familyCategory', '')} aria-label={t('myPlantsPage.filterSortCard.clearFamilyLabel')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
              {!isDefaultSort && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  {t('myPlantsPage.filterSortCard.sortChipPrefix', { 
                    label: sortOptions.find(opt => opt.value === sortConfig.key)?.label || sortConfig.key, 
                    direction: sortConfig.direction === 'asc' ? t('myPlantsPage.filterSortCard.ascending') : t('myPlantsPage.filterSortCard.descending') 
                  })}
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => {
                      onSortKeyChange(initialSortConfigState.key as SortConfig['key']);
                      onSortDirectionChange(initialSortConfigState.direction);
                    }} aria-label={t('myPlantsPage.filterSortCard.resetSortLabel')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Badge>
              )}
            </div>
          )}

          <AccordionContent className="pt-0">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div> 
                  <h3 className="text-md font-semibold mb-2 text-foreground/90">{t('myPlantsPage.filterSortCard.searchGroupTitle')}</h3>
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder={t('myPlantsPage.filterSortCard.searchPlaceholder')}
                      value={filters.searchTerm}
                      onChange={(e) => onFilterChange('searchTerm', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div> 
                  <h3 className="text-md font-semibold mb-2 text-foreground/90">{t('myPlantsPage.filterSortCard.filterByGroupTitle')}</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="healthCondition" className="block text-sm font-medium text-muted-foreground mb-1">{t('myPlantsPage.filterSortCard.healthConditionLabel')}</Label>
                      <Select value={filters.healthCondition} onValueChange={(value) => onFilterChange('healthCondition', value as PlantHealthCondition | 'all')}>
                        <SelectTrigger id="healthCondition"><SelectValue placeholder={t('myPlantsPage.filterSortCard.selectHealthCondition')} /></SelectTrigger>
                        <SelectContent>
                          {healthConditionOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="locationFilter" className="block text-sm font-medium text-muted-foreground mb-1">{t('myPlantsPage.filterSortCard.locationFilterLabel')}</Label>
                      <Input
                        id="locationFilter"
                        placeholder={t('myPlantsPage.filterSortCard.locationFilterPlaceholder')}
                        value={filters.location}
                        onChange={(e) => onFilterChange('location', e.target.value)}
                      />
                    </div>
                    <div> 
                      <Label htmlFor="familyCategoryFilter" className="block text-sm font-medium text-muted-foreground mb-1">{t('myPlantsPage.filterSortCard.familyCategoryFilterLabel')}</Label>
                      <Input
                        id="familyCategoryFilter"
                        placeholder={t('myPlantsPage.filterSortCard.familyCategoryFilterPlaceholder')}
                        value={filters.familyCategory}
                        onChange={(e) => onFilterChange('familyCategory', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ageRange" className="block text-sm font-medium text-muted-foreground mb-1">{t('myPlantsPage.filterSortCard.ageRangeLabel')}</Label>
                      <Select value={filters.ageRange} onValueChange={(value) => onFilterChange('ageRange', value)}>
                        <SelectTrigger id="ageRange"><SelectValue placeholder={t('myPlantsPage.filterSortCard.selectAgeRange')} /></SelectTrigger>
                        <SelectContent>
                          {ageRangeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div> 
                  <h3 className="text-md font-semibold mb-2 text-foreground/90">{t('myPlantsPage.filterSortCard.sortByGroupTitle')}</h3>
                  <div className="space-y-3">
                    <div>
                        <Label htmlFor="sortKey" className="block text-sm font-medium text-muted-foreground mb-1">{t('myPlantsPage.filterSortCard.sortFieldLabel')}</Label>
                        <Select value={sortConfig.key} onValueChange={(value) => onSortKeyChange(value as SortConfig['key'])}>
                            <SelectTrigger id="sortKey"><SelectValue placeholder={t('myPlantsPage.filterSortCard.selectSortKey')} /></SelectTrigger>
                            <SelectContent>
                            {sortOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="sortDirection" className="block text-sm font-medium text-muted-foreground mb-1">{t('myPlantsPage.filterSortCard.directionLabel')}</Label>
                        <Select value={sortConfig.direction} onValueChange={(value) => onSortDirectionChange(value as 'asc' | 'desc')}>
                            <SelectTrigger id="sortDirection"><SelectValue placeholder={t('myPlantsPage.filterSortCard.selectDirection')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asc">{t('myPlantsPage.filterSortCard.ascending')}</SelectItem>
                                <SelectItem value="desc">{t('myPlantsPage.filterSortCard.descending')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-3" />

              <div className="flex justify-end pt-1">
                  <Button variant="outline" onClick={onResetAll} size="sm">
                      <RotateCcw className="mr-2 h-4 w-4" /> {t('myPlantsPage.filterSortCard.resetAllButton')}
                  </Button>
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

    