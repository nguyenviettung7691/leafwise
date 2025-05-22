
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import type { Plant, PlantFormData, PlantPhoto } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlantData } from '@/contexts/PlantDataContext';

export default function EditPlantPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { t } = useLanguage();
  const { getPlantById, updatePlant } = usePlantData();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<PlantFormData> | undefined>(undefined);
  const [galleryPhotos, setGalleryPhotos] = useState<PlantPhoto[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const foundPlant = getPlantById(id);
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
        notFound();
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
    await new Promise(resolve => setTimeout(resolve, 1500));

    let finalPrimaryPhotoUrl: string;
    let updatedPhotos = [...plant.photos];

    if (data.diagnosedPhotoDataUrl && data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
      // New image uploaded via form, replace data URL with placeholder
      finalPrimaryPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`;
      // Add this new placeholder to gallery if it's truly a new image (not just a re-selection causing a data URL)
      // This logic assumes diagnosedPhotoDataUrl becomes a data URL ONLY IF a new file was selected via the "primaryPhoto" FileList input
      if (data.primaryPhoto && data.primaryPhoto[0]) { // Check if a new file was actually selected
         const existingPhotoIndex = updatedPhotos.findIndex(p => p.url === finalPrimaryPhotoUrl); // Unlikely to match placeholder
          if (existingPhotoIndex === -1) { 
            updatedPhotos.unshift({ 
              id: `p-${plant.id}-new-${Date.now()}`,
              url: finalPrimaryPhotoUrl, // Save placeholder URL
              dateTaken: new Date().toISOString(),
              healthCondition: data.healthCondition,
              diagnosisNotes: "Primary photo updated via edit form (new upload)."
            });
          }
      }
    } else if (data.diagnosedPhotoDataUrl) {
      // Existing placeholder or gallery selection
      finalPrimaryPhotoUrl = data.diagnosedPhotoDataUrl;
    } else {
      // No photo selected, or old one removed and no new one. Use a generic placeholder.
      finalPrimaryPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`;
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
      primaryPhotoUrl: finalPrimaryPhotoUrl, 
      photos: updatedPhotos,
    };
  
    updatePlant(plant.id, updatedPlantData);

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
          formTitle={t('editPlantPage.formTitle')}
          formDescription={t('editPlantPage.formDescription', { plantName: plant.commonName })}
          submitButtonText={t('editPlantPage.submitButtonText')}
          hideInternalHeader={false}
        />
      </div>
    </AppLayout>
  );
}
