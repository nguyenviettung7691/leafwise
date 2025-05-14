
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants'; // Updated import
import { mockPlants } from '@/lib/mock-data';
import type { Plant } from '@/types';
import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, MapPin, Edit, Trash2, Droplets, Sun, Scissors, PauseCircle, PlayCircle, ImagePlus, Leaf, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const healthConditionStyles = {
  healthy: 'bg-green-100 text-green-800 border-green-300',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  sick: 'bg-red-100 text-red-800 border-red-300',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function PlantDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [plant, setPlant] = useState<Plant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  useEffect(() => {
    if (id) {
      const foundPlant = mockPlants.find(p => p.id === id);
      if (foundPlant) {
        setPlant(foundPlant);
      } else {
        console.error("Plant not found"); 
      }
    }
    setIsLoading(false);
  }, [id]);

  const handleToggleTaskPause = async (taskId: string) => {
    setLoadingTaskId(taskId);
    await new Promise(resolve => setTimeout(resolve, 1500));
  
    setPlant(prevPlant => {
      if (!prevPlant) return null;
      return {
        ...prevPlant,
        careTasks: prevPlant.careTasks.map(t =>
          t.id === taskId ? { ...t, isPaused: !t.isPaused } : t
        ),
      };
    });
  
    setLoadingTaskId(null);
  };

  const handleAddPhoto = async () => {
    setIsAddingPhoto(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAddingPhoto(false);
    alert("Add photo functionality (simulated)");
  };


  if (isLoading) {
    return (
      <AppLayout navItemsConfig={APP_NAV_CONFIG}> {/* Updated prop */}
        <div className="flex justify-center items-center h-full">
          <Leaf className="h-12 w-12 animate-spin text-primary"/>
        </div>
      </AppLayout>
    );
  }

  if (!plant) {
    notFound();
    return null;
  }
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}> {/* Updated prop */}
      <div className="max-w-4xl mx-auto">
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
              <CardDescription className="text-lg text-gray-200 italic">{plant.scientificName}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    {plant.species && <p className="text-sm text-muted-foreground">Species: {plant.species}</p>}
                    <Badge variant="outline" className={`capitalize mt-1 ${healthConditionStyles[plant.healthCondition]}`}>
                        {plant.healthCondition.replace('_', ' ')}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Age Estimate</p>
                  <p className="text-muted-foreground">{plant.ageEstimate || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Planting Date</p>
                  <p className="text-muted-foreground">{formatDate(plant.plantingDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-muted-foreground">{plant.location || 'Unknown'}</p>
                </div>
              </div>
            </div>
            
            {plant.customNotes && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{plant.customNotes}</p>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="font-semibold text-lg mb-3">Care Plan</h3>
              <div className="space-y-3">
                {plant.careTasks.map(task => (
                  <Card key={task.id} className="bg-secondary/30">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{task.name} <Badge variant="outline" className="ml-2 text-xs">{task.type}</Badge></p>
                        <p className="text-xs text-muted-foreground">
                          Frequency: {task.frequency || 'Ad-hoc'}
                          {task.nextDueDate && ` | Next: ${formatDate(task.nextDueDate)}`}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggleTaskPause(task.id)}
                        disabled={loadingTaskId === task.id}
                      >
                        {loadingTaskId === task.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            {task.isPaused ? <PlayCircle className="h-4 w-4 mr-1" /> : <PauseCircle className="h-4 w-4 mr-1" />}
                            {task.isPaused ? 'Resume' : 'Pause'}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                 <Button variant="outline" className="w-full mt-2">Modify Care Plan (Coming Soon)</Button>
              </div>
            </div>
            
            <Separator />

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Photo Journal</h3>
                <Button variant="outline" size="sm" onClick={handleAddPhoto} disabled={isAddingPhoto}>
                  {isAddingPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-2" /> Add Photo
                    </>
                  )}
                </Button>
              </div>
              {plant.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {plant.photos.map(photo => (
                    <div key={photo.id} className="group relative">
                      <Image src={photo.url} alt={`Plant photo from ${formatDate(photo.dateTaken)}`} width={200} height={200} className="rounded-md object-cover aspect-square shadow-sm" data-ai-hint="plant growth"/>
                      <div className="absolute bottom-0 left-0 w-full bg-black/50 text-white text-xs p-1 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatDate(photo.dateTaken)}
                        {photo.notes && <p className="truncate text-white/80">{photo.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No photos in the journal yet.</p>
              )}
            </div>

          </CardContent>
          <CardFooter className="p-6 bg-muted/30 border-t">
             <p className="text-xs text-muted-foreground">Last updated: {formatDate(new Date().toISOString())}</p>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
