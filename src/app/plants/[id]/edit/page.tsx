
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
  const [isLoading, setIsLoading] = useState(true);
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
          familyCategory: foundPlant.familyCategory || '',
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
    setIsLoading(false);
  }, [id]);

  const handleUpdatePlant = async (data: PlantFormData) => {
    setIsSaving(true);
    // Simulate API call to update the plant
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real app, you would update the plant data in your backend.
    // For this prototype, we'll find the plant in mockPlants and update it (this won't persist across reloads).
    const plantIndex = mockPlants.findIndex(p => p.id === id);
    if (plantIndex !== -1 && plant) {
        // This is a mock update. In a real app, this data would go to a backend.
        // And the primaryPhoto (FileList) would need to be uploaded.
        console.log('Updated plant data (simulated):', { id: plant.id, ...data });
        // To see changes locally in mock data for the current session (won't persist):
        // mockPlants[plantIndex] = { ...mockPlants[plantIndex], ...data, primaryPhotoUrl: data.primaryPhoto ? URL.createObjectURL(data.primaryPhoto[0]) : plant.primaryPhotoUrl };
    }
    
    toast({
      title: 'Plant Updated!',
      description: `${data.commonName} has been (simulated) updated.`,
    });
    setIsSaving(false);
    router.push(`/plants/${id}`); // Navigate back to the plant detail page
  };

  if (isLoading || !initialFormData) {
    return (
      <AppLayout navItemsConfig={APP_NAV_CONFIG}>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!plant) { // Should be caught by initialFormData check, but good for safety
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
        />
        {/* The SavePlantForm component now renders its own Card.
            If we want a specific title for the edit page container Card,
            we can wrap SavePlantForm in another Card here.
            For now, SavePlantForm's internal Card will be used.
            Its title is "Save to My Plants", which is generic enough for "Update" too.
            Alternatively, we can pass a title prop to SavePlantForm.
        */}
      </div>
    </AppLayout>
  );
}
