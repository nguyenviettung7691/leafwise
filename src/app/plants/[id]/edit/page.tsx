
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
import { addImage as addIDBImage, dataURLtoBlob } from '@/lib/idb-helper'; // Renamed addImage
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function EditPlantPage() {
  const { user } = useAuth(); // Get user from AuthContext
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
    if (!plant || !user?.id) {
        toast({ title: t('common.error'), description: t('editPlantPage.toastErrorFindingPlant'), variant: 'destructive'});
        return;
    }
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    let finalPrimaryPhotoId: string | undefined = plant.primaryPhotoUrl;
    let updatedPhotos = [...plant.photos]; // Make a mutable copy

    if (data.diagnosedPhotoDataUrl && data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
      // New image uploaded via form, data.diagnosedPhotoDataUrl is a data URL from compressImage
      const blob = dataURLtoBlob(data.diagnosedPhotoDataUrl);
      if (blob) {
        const newPhotoId = `photo-${plant.id}-edited-${Date.now()}`;
        try {
          await addIDBImage(user.id, newPhotoId, blob); // Pass userId
          finalPrimaryPhotoId = newPhotoId; // This is the new IDB key
          // Add new photo to gallery if it's truly new (not just re-selection of same image data)
          // Since it's a new upload, it's always new to IDB.
          updatedPhotos.unshift({ 
            id: newPhotoId, // IDB key
            url: newPhotoId, // Store IDB key
            dateTaken: new Date().toISOString(),
            healthCondition: data.healthCondition, 
            diagnosisNotes: t('editPlantPage.primaryPhotoUpdatedNote') 
          });
        } catch (e) {
          console.error("Error saving edited primary photo to IDB:", e);
          toast({ title: t('common.error'), description: "Failed to save updated image.", variant: "destructive" });
          // Keep existing finalPrimaryPhotoId if save fails
        }
      } else {
        toast({ title: t('common.error'), description: "Failed to process updated image.", variant: "destructive" });
      }
    } else if (data.diagnosedPhotoDataUrl && data.diagnosedPhotoDataUrl !== plant.primaryPhotoUrl) {
      // Existing gallery photo selected (data.diagnosedPhotoDataUrl is an IDB key) or placeholder selected
      finalPrimaryPhotoId = data.diagnosedPhotoDataUrl;
    }
    // If data.diagnosedPhotoDataUrl is same as plant.primaryPhotoUrl, no change to finalPrimaryPhotoId needed
    // If data.diagnosedPhotoDataUrl is null/empty (photo was removed without replacement), it will try to save null.
    
    const updatedPlantData: Plant = {
      ...plant,
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory || '',
      ageEstimate: data.ageEstimateYears ? t('diagnosePage.resultDisplay.ageUnitYears', { count: data.ageEstimateYears }) : undefined,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      primaryPhotoUrl: finalPrimaryPhotoId, // This is now an IDB key or null/undefined
      photos: updatedPhotos, // This contains photos with their 'url' as IDB keys
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
