
'use client';

import Image from 'next/image';
import type { Plant, PlantHealthCondition } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

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

export function PlantHeaderCard({
  plant,
  onEditPlant,
  onConfirmDelete,
  isDeleting,
}: PlantHeaderCardProps) {
  return (
    <Card className="overflow-hidden shadow-xl">
      <CardHeader className="relative p-0">
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={plant.primaryPhotoUrl || 'https://placehold.co/800x450.png'}
            alt={plant.commonName}
            width={800}
            height={450}
            className="object-cover w-full h-full"
            data-ai-hint="plant detail"
            priority
          />
        </div>
        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/70 to-transparent">
          <CardTitle className="text-3xl font-bold text-white">{plant.commonName}</CardTitle>
          {plant.scientificName && <CardDescription className="text-lg text-gray-200 italic">{plant.scientificName}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Badge variant="outline" className={`capitalize ${healthConditionStyles[plant.healthCondition]}`}>
              {plant.healthCondition.replace('_', ' ')}
            </Badge>
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
