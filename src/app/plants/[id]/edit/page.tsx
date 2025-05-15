
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SavePlantForm } from '@/components/plants/SavePlantForm'; // Import the reusable form

export default function EditPlantPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<PlantFormData> | undefined>(undefined);
  const [isLoadingPage, setIsLoadingPage] = useState(true); // Renamed to avoid conflict with form's isLoading
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const foundPlant = mockPlants.find(p => p.id === id);
      if (foundPlant) {
        setPlant(foundPlant);
        
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
          familyCategory: foundPlant.familyCategory || '', // Ensure this is populated
          ageEstimateYears: ageYears,
          healthCondition: foundPlant.healthCondition,
          location: foundPlant.location || '',
          customNotes: foundPlant.customNotes || '',
          diagnosedPhotoDataUrl: foundPlant.primaryPhotoUrl || null, // Use existing photo as initial
        });
      } else {
        notFound();
      }
    }
    setIsLoadingPage(false);
  }, [id]);

  const handleUpdatePlant = async (data: PlantFormData) => {
    setIsSaving(true);
    // Simulate API call to update the plant
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real app, you would update the plant data in your backend.
    const plantIndex = mockPlants.findIndex(p => p.id === id);
    if (plantIndex !== -1 && plant) {
        // This is a mock update.
        console.log('Updated plant data (simulated):', { id: plant.id, ...data });
        // To see changes locally in mock data for the current session (won't persist):
        // This logic would actually be handled by your data layer / state management in a real app
        // For now, we just simulate the save and redirect.
        // If a new photo was uploaded (data.primaryPhoto is a FileList), update it.
        // Otherwise, keep the existing (data.diagnosedPhotoDataUrl which was plant.primaryPhotoUrl).
        const newPhotoUrl = data.primaryPhoto?.[0] 
            ? URL.createObjectURL(data.primaryPhoto[0]) 
            : data.diagnosedPhotoDataUrl; // which was initial plant.primaryPhotoUrl

        // mockPlants[plantIndex] = { 
        //     ...mockPlants[plantIndex], 
        //     commonName: data.commonName,
        //     scientificName: data.scientificName,
        //     familyCategory: data.familyCategory,
        //     ageEstimate: data.ageEstimateYears ? `${data.ageEstimateYears} years` : mockPlants[plantIndex].ageEstimate, // Reconstruct string for mock
        //     healthCondition: data.healthCondition,
        //     location: data.location,
        //     customNotes: data.customNotes,
        //     primaryPhotoUrl: newPhotoUrl || mockPlants[plantIndex].primaryPhotoUrl,
        // };
    }
    
    toast({
      title: 'Plant Updated!',
      description: `${data.commonName} has been (simulated) updated.`,
    });
    setIsSaving(false);
    router.push(`/plants/${id}`); 
  };

  if (isLoadingPage || !initialFormData) {
    return (
      <AppLayout navItemsConfig={APP_NAV_CONFIG}>
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
    <AppLayout navItemsConfig={APP_NAV_CONFIG}>
      <div className="max-w-2xl mx-auto">
        <SavePlantForm
          initialData={initialFormData}
          onSave={handleUpdatePlant}
          onCancel={() => router.push(`/plants/${id}`)}
          isLoading={isSaving}
          formTitle="Edit Plant"
          submitButtonText="Update Plant"
        />
      </div>
    </AppLayout>
  );
}
