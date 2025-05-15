
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import type { PlantFormData, Plant } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { mockPlants } from '@/lib/mock-data'; // Import mockPlants

export default function NewPlantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewPlant = async (data: PlantFormData) => {
    setIsSaving(true);
    
    // Simulate a short delay for saving
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newPlantId = `mock-plant-${Date.now()}`;
    let newPhotoUrl: string | undefined = undefined;

    if (data.primaryPhoto && data.primaryPhoto[0]) {
      const file = data.primaryPhoto[0];
      // Convert file to data URL for mock storage
      newPhotoUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => {
          console.error("Error reading file for data URL:", error);
          resolve(undefined); // Resolve with undefined if error
        }
        reader.readAsDataURL(file);
      });
    } else if (data.diagnosedPhotoDataUrl) { // Though less likely for "new plant" flow
      newPhotoUrl = data.diagnosedPhotoDataUrl;
    }
    
    const newPlant: Plant = {
      id: newPlantId,
      commonName: data.commonName,
      scientificName: data.scientificName || undefined, // Ensure it's undefined if empty, not just ''
      familyCategory: data.familyCategory,
      ageEstimate: data.ageEstimateYears ? `${data.ageEstimateYears} years` : undefined,
      // ageEstimateYears: data.ageEstimateYears, // Keep this if your Plant type still has it directly
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      primaryPhotoUrl: newPhotoUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName)}`,
      photos: newPhotoUrl ? [{
        id: `p-${newPlantId}-initial-${Date.now()}`,
        url: newPhotoUrl,
        dateTaken: new Date().toISOString(),
        healthCondition: data.healthCondition,
        diagnosisNotes: 'Manually added plant.',
      }] : [],
      careTasks: [],
      plantingDate: new Date().toISOString(),
    };

    mockPlants.unshift(newPlant); // Add to the beginning of the mock data array

    toast({
      title: 'Plant Added!',
      description: `${newPlant.commonName} has been added to My Plants.`,
    });
    setIsSaving(false);
    router.push(`/plants/${newPlantId}`); // Navigate to the new plant's detail page
  };

  const handleCancelNewPlant = () => {
    router.push('/');
  };

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}>
      <div className="max-w-2xl mx-auto">
        {isSaving ? (
          <div className="flex justify-center items-center h-full min-h-[300px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">Saving plant...</p>
          </div>
        ) : (
          <SavePlantForm
            onSave={handleSaveNewPlant}
            onCancel={handleCancelNewPlant}
            isLoading={isSaving}
            formTitle="Add New Plant"
            formDescription="Manually input the details for new plant."
            submitButtonText="Add Plant"
          />
        )}
      </div>
    </AppLayout>
  );
}
