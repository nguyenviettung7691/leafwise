
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import type { Plant, PlantFormData, PlantPhoto } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlantData } from '@/contexts/PlantDataContext'; // Import PlantDataContext

export default function EditPlantPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { t } = useLanguage();
  const { getPlantById, updatePlant } = usePlantData(); // Use PlantDataContext

  const [plant, setPlant] = useState<Plant | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<PlantFormData> | undefined>(undefined);
  const [galleryPhotos, setGalleryPhotos] = useState<PlantPhoto[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const foundPlant = getPlantById(id); // Get plant from context
      if (foundPlant) {
        setPlant(foundPlant);
        setGalleryPhotos(foundPlant.photos || []);
        
        setInitialFormData({
          commonName: foundPlant.commonName,
          scientificName: foundPlant.scientificName || '',
          familyCategory: foundPlant.familyCategory || '',
          ageEstimateYears: foundPlant.ageEstimateYears,
          healthCondition: foundPlant.healthCondition,
          location: foundPlant.location || '',
          customNotes: foundPlant.customNotes || '',
          diagnosedPhotoDataUrl: foundPlant.primaryPhotoUrl || null, 
        });
      } else {
        notFound(); // Or redirect if preferred
      }
    }
    setIsLoadingPage(false);
  }, [id, getPlantById]);

  const handleUpdatePlant = async (data: PlantFormData) => {
    if (!plant) {
        toast({ title: t('common.error'), description: t('editPlantPage.toastErrorFindingPlant'), variant: 'destructive'});
        return;
    }
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

    let newPrimaryPhotoUrl = data.diagnosedPhotoDataUrl;
    let updatedPhotos = [...plant.photos];

    if (data.primaryPhoto && data.primaryPhoto[0]) {
        newPrimaryPhotoUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(data.primaryPhoto![0]);
        });

        // If a new photo was uploaded and URL successfully created, add/update it in the gallery
        if (newPrimaryPhotoUrl) {
          const existingPhotoIndex = updatedPhotos.findIndex(p => p.url === newPrimaryPhotoUrl);
          if (existingPhotoIndex === -1) { // New photo to add to gallery
            updatedPhotos.unshift({
                id: `p-${plant.id}-new-${Date.now()}`,
                url: newPrimaryPhotoUrl,
                dateTaken: new Date().toISOString(),
                healthCondition: data.healthCondition, // Use form's health for new photo
                diagnosisNotes: "Primary photo updated via edit form (new upload)."
            });
          }
          // If it exists, it's just being re-selected as primary, no change to gallery item needed here.
        }
    }

    const updatedPlantData: Plant = {
      ...plant,
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory || '',
      ageEstimate: data.ageEstimateYears ? `${data.ageEstimateYears} ${t('diagnosePage.resultDisplay.ageUnitYears', { count: data.ageEstimateYears })}` : undefined,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      primaryPhotoUrl: newPrimaryPhotoUrl || plant.primaryPhotoUrl, 
      photos: updatedPhotos,
      // plantingDate, lastCaredDate, careTasks are preserved from the original plant object
    };
  
    updatePlant(plant.id, updatedPlantData); // Use context function to update plant

    toast({
      title: t('editPlantPage.toastPlantUpdatedTitle'),
      description: t('editPlantPage.toastPlantUpdatedDescription', { plantName: data.commonName }),
    });
    
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

  if (!plant) { // Should be caught by initial loading and notFound(), but as a safeguard
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
          formTitle={t('editPlantPage.formTitle')}
          formDescription={t('editPlantPage.formDescription', { plantName: plant.commonName })}
          submitButtonText={t('editPlantPage.submitButtonText')}
          hideInternalHeader={false} // Show the form's own header here
        />
      </div>
    </AppLayout>
  );
}
