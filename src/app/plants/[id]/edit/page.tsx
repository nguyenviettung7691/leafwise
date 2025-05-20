
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantFormData, PlantPhoto } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SavePlantForm } from '@/components/plants/SavePlantForm'; 

export default function EditPlantPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<PlantFormData> | undefined>(undefined);
  const [galleryPhotos, setGalleryPhotos] = useState<PlantPhoto[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const foundPlant = mockPlants.find(p => p.id === id);
      if (foundPlant) {
        setPlant(foundPlant);
        setGalleryPhotos(foundPlant.photos || []);
        
        let ageYears: number | undefined = undefined;
        if (foundPlant.ageEstimate) {
          const match = foundPlant.ageEstimate.match(/(\d+(\.\d+)?)/);
          if (match && match[1]) {
            ageYears = parseFloat(match[1]);
          }
        }

        setInitialFormData({
          commonName: foundPlant.commonName,
          scientificName: foundPlant.scientificName || '',
          familyCategory: foundPlant.familyCategory || '',
          ageEstimateYears: ageYears,
          healthCondition: foundPlant.healthCondition,
          location: foundPlant.location || '',
          customNotes: foundPlant.customNotes || '',
          diagnosedPhotoDataUrl: foundPlant.primaryPhotoUrl || null, 
        });
      } else {
        notFound();
      }
    }
    setIsLoadingPage(false);
  }, [id]);

  const handleUpdatePlant = async (data: PlantFormData) => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const plantIndex = mockPlants.findIndex(p => p.id === id);
    if (plantIndex !== -1 && plant) {
        let newPrimaryPhotoUrl = data.diagnosedPhotoDataUrl; // This will be the gallery selection or initial URL

        if (data.primaryPhoto && data.primaryPhoto[0]) {
            // A new file was uploaded, convert it to data URL
            newPrimaryPhotoUrl = await new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(data.primaryPhoto![0]);
            });
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
          primaryPhotoUrl: newPrimaryPhotoUrl || plant.primaryPhotoUrl, 
        };
      
        if (newPrimaryPhotoUrl && newPrimaryPhotoUrl !== plant.primaryPhotoUrl) {
            const existingPhotoIndex = mockPlants[plantIndex].photos.findIndex(p => p.url === newPrimaryPhotoUrl);
            if (existingPhotoIndex === -1) { // If it's a truly new photo (from upload)
                mockPlants[plantIndex].photos.unshift({
                    id: `p-${id}-new-${Date.now()}`,
                    url: newPrimaryPhotoUrl,
                    dateTaken: new Date().toISOString(),
                    healthCondition: data.healthCondition,
                    diagnosisNotes: "Primary photo updated via edit form (new upload)."
                });
            }
        }


        toast({
          title: 'Plant Updated!',
          description: `${data.commonName} has been (simulated) updated.`,
        });
    } else {
      toast({
        title: 'Error',
        description: 'Could not find plant to update.',
        variant: 'destructive'
      });
    }
    
    setIsSaving(false);
    router.push(`/plants/${id}`); 
  };

  if (isLoadingPage || !initialFormData) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!plant) { 
    return notFound();
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <SavePlantForm
          initialData={initialFormData}
          galleryPhotos={galleryPhotos}
          onSave={handleUpdatePlant}
          onCancel={() => router.push(`/plants/${id}`)}
          isLoading={isSaving}
          formTitle="Edit Plant"
          formDescription={`Update the details for ${plant.commonName}.`}
          submitButtonText="Update Plant"
        />
      </div>
    </AppLayout>
  );
}
