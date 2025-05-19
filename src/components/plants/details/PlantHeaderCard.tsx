
'use client';

import Image from 'next/image';
import type { Plant, PlantHealthCondition } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Edit, Trash2, Loader2, Expand, HeartPulse } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import React from 'react';
import { differenceInDays, differenceInMonths, differenceInYears, parseISO, isValid } from 'date-fns';

const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

interface PlantHeaderCardProps {
  plant: Plant;
  onEditPlant: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

const getCaredForDuration = (plantingDate?: string): string | null => {
  if (!plantingDate) return null;
  const startDate = parseISO(plantingDate);
  if (!isValid(startDate)) return null;

  const now = new Date();
  const years = differenceInYears(now, startDate);
  if (years > 0) return `Cared for ${years} year${years > 1 ? 's' : ''}`;

  const months = differenceInMonths(now, startDate);
  if (months > 0) return `Cared for ${months} month${months > 1 ? 's' : ''}`;

  const days = differenceInDays(now, startDate);
  if (days >= 0) return `Cared for ${days} day${days !== 1 ? 's' : ''}`; // Handle 0 days

  return null;
};


export function PlantHeaderCard({
  plant,
  onEditPlant,
  onConfirmDelete,
  isDeleting,
}: PlantHeaderCardProps) {
  const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false);
  const caredForDuration = getCaredForDuration(plant.plantingDate);

  return (
    <Card className="overflow-hidden shadow-xl">
      <CardHeader className="relative p-0">
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogTrigger asChild>
            <div className="aspect-video w-full overflow-hidden bg-muted cursor-pointer group">
              <Image
                src={plant.primaryPhotoUrl || 'https://placehold.co/800x450.png'}
                alt={plant.commonName}
                width={800}
                height={450}
                className="object-cover w-full h-full"
                data-ai-hint="plant detail"
                priority
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <Expand className="h-12 w-12 text-white" />
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-2 sm:p-4">
            <DialogHeader className="sr-only">
              <DialogTitle>{plant.commonName} - Full Size</DialogTitle>
            </DialogHeader>
            <Image
              src={plant.primaryPhotoUrl || 'https://placehold.co/1200x675.png'}
              alt={`${plant.commonName} - full size`}
              width={1200}
              height={675}
              className="rounded-md object-contain max-h-[80vh] w-full"
              data-ai-hint="plant detail"
            />
            <DialogClose asChild>
              <Button variant="outline" className="absolute top-4 right-4 sm:hidden">Close</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/70 to-transparent">
          <CardTitle className="text-3xl font-bold text-white">{plant.commonName}</CardTitle>
          {plant.scientificName && <CardDescription className="text-lg text-gray-200 italic">{plant.scientificName}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-3"> {/* Reduced space-y-6 to space-y-3 */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`capitalize ${healthConditionStyles[plant.healthCondition]}`}>
              {plant.healthCondition.replace('_', ' ')}
            </Badge>
            {caredForDuration && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <HeartPulse className="h-3.5 w-3.5 text-primary/80" />
                {caredForDuration}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={onEditPlant} aria-label="Edit Plant">
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" aria-label="Delete Plant" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently (simulate) delete your plant
                    "{plant.commonName}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
