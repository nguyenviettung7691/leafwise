
'use client';

import type { PlantFormData, PlantPhoto, SavePlantFormValues } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import NextImage from 'next/image';
import React, { useState, useEffect, useRef } from 'react';
import { Leaf, Save, Edit, ImageOff, Loader2, Camera, ImageIcon, UploadCloud } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useS3Image } from '@/hooks/useS3Image';
import { compressImage, PLACEHOLDER_DATA_URI } from '@/lib/image-utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';

interface SavePlantFormProps {
  initialData?: Partial<PlantFormData>;
  galleryPhotos?: PlantPhoto[];
  // Modified onSave signature to accept File objects
  onSave: (data: Omit<SavePlantFormValues, 'primaryPhoto'>, primaryPhotoFile?: File | null, photosToDelete?: string[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  formTitle?: string;
  formDescription?: string;
  submitButtonText?: string;
  hideInternalHeader?: boolean;
}

interface GalleryPhotoThumbnailProps {
  photo: PlantPhoto;
  isSelected: boolean;
  userId?: string;
  onClick: () => void;
}

const GalleryPhotoThumbnail: React.FC<GalleryPhotoThumbnailProps> = ({ photo, isSelected, userId, onClick }) => {
  const { imageUrl, isLoading: isLoadingImage, error: imageError } = useS3Image(photo.url, userId);

  return (
    <button
      type="button"
      key={photo.id}
      className={cn(
        "flex-shrink-0 rounded-md w-20 h-20 overflow-hidden border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-muted flex items-center justify-center",
        isSelected ? "border-primary ring-2 ring-primary ring-offset-1" : "border-transparent hover:border-muted-foreground/50"
      )}
      onClick={onClick}
    >
      {isLoadingImage ? (
        <Skeleton className="w-full h-full" />
      ) : imageError || !imageUrl ? (
        <ImageOff size={24} className="text-muted-foreground" />
      ) : (
        <NextImage
          src={imageUrl}
          alt={`Gallery photo ${photo.id}`}
          width={80}
          height={80}
          placeholder="blur"
          blurDataURL={PLACEHOLDER_DATA_URI}
          className="object-cover w-full h-full"
          data-ai-hint="plant gallery thumbnail"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80.png?text=Error';}}
        />
      )}
    </button>
  );
};


export function SavePlantForm({
  initialData,
  galleryPhotos,
  onSave,
  onCancel,
  isLoading,
  formTitle,
  formDescription,
  submitButtonText,
  hideInternalHeader = false,
}: SavePlantFormProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isStandalone = usePWAStandalone();

  const plantFormSchema = z.object({
    commonName: z.string().min(1, { message: t('savePlantForm.validation.commonNameRequired') }),
    scientificName: z.string().optional(),
    familyCategory: z.string().min(1, { message: t('savePlantForm.validation.familyCategoryRequired') }),
    ageEstimateYears: z.coerce.number().min(0, {message: t('savePlantForm.validation.agePositive')}).optional().nullable(),
    healthCondition: z.enum(['healthy', 'needs_attention', 'sick', 'unknown'], {
      required_error: t('savePlantForm.validation.healthConditionRequired'),
    }),
    location: z.string().optional(),
    customNotes: z.string().optional(),
    primaryPhoto: typeof window !== 'undefined' ? z.instanceof(FileList).optional().nullable() : z.any().optional().nullable(),
    diagnosedPhotoDataUrl: z.string().optional().nullable(),
  });

  type SavePlantFormValues = z.infer<typeof plantFormSchema>;

  const form = useForm<SavePlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      commonName: initialData?.commonName || '',
      scientificName: initialData?.scientificName || '',
      familyCategory: initialData?.familyCategory || '',
      ageEstimateYears: initialData?.ageEstimateYears !== undefined ? initialData.ageEstimateYears : undefined,
      healthCondition: initialData?.healthCondition || 'unknown',
      location: initialData?.location || '',
      customNotes: initialData?.customNotes || '',
      primaryPhoto: null, // Always reset file input part
      diagnosedPhotoDataUrl: initialData?.diagnosedPhotoDataUrl || null, // This will be the initial primaryPhotoUrl (S3 key or data URL)
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null); // Data URL of a *newly uploaded* image
  const [selectedGalleryPhotoUrl, setSelectedGalleryPhotoUrl] = useState<string | null>(null); // S3 key of a *selected gallery* image
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { imageUrl: displayImageUrl, isLoading: isLoadingDisplayImage } = useS3Image(
    imagePreview ? undefined : (selectedGalleryPhotoUrl ?? initialData?.diagnosedPhotoDataUrl ?? undefined),
    user?.id
  );
  
  useEffect(() => {
    form.reset({
      commonName: initialData?.commonName || '',
      scientificName: initialData?.scientificName || '',
      familyCategory: initialData?.familyCategory || '',
      ageEstimateYears: initialData?.ageEstimateYears !== undefined ? initialData.ageEstimateYears : undefined,
      healthCondition: initialData?.healthCondition || 'unknown',
      location: initialData?.location || '',
      customNotes: initialData?.customNotes || '',
      primaryPhoto: null, // Always reset file input part
      diagnosedPhotoDataUrl: initialData?.diagnosedPhotoDataUrl || null, // This will be the initial primaryPhotoUrl (S3 key or data URL)
    });

    if (initialData?.diagnosedPhotoDataUrl) {
      if (initialData.diagnosedPhotoDataUrl.startsWith('data:image/')) {
        setImagePreview(initialData.diagnosedPhotoDataUrl);
        setSelectedGalleryPhotoUrl(null);
      } else if (initialData.diagnosedPhotoDataUrl.startsWith('http')) {
         setImagePreview(initialData.diagnosedPhotoDataUrl);
         setSelectedGalleryPhotoUrl(null);
      }
      else {
        setSelectedGalleryPhotoUrl(initialData.diagnosedPhotoDataUrl);
        setImagePreview(null);
      }
    } else {
      setImagePreview(null);
      setSelectedGalleryPhotoUrl(null);
    }
  }, [initialData, form.reset]);


  const onSubmit = async (data: SavePlantFormValues) => {
    const primaryPhotoFile = data.primaryPhoto && data.primaryPhoto.length > 0 ? data.primaryPhoto[0] : null;

    // Prepare the data to pass to the parent's onSave function
    // This includes all form fields except the FileList 'primaryPhoto'
    const formDataToPass: Omit<SavePlantFormValues, 'primaryPhoto'> = {
        commonName: data.commonName,
        scientificName: data.scientificName,
        familyCategory: data.familyCategory,
        ageEstimateYears: data.ageEstimateYears,
        healthCondition: data.healthCondition,
        location: data.location,
        customNotes: data.customNotes,
        diagnosedPhotoDataUrl: data.diagnosedPhotoDataUrl, // Include diagnosedPhotoDataUrl
    };

    // Call the onSave prop with the prepared data and the file
    // The type of formDataToPass now matches the first parameter of onSave
    await onSave(formDataToPass, primaryPhotoFile);
  };

  const currentFormTitle = formTitle || t('savePlantForm.formTitle');
  const currentFormDescription = formDescription || t('savePlantForm.formDescription');
  const currentSubmitButtonText = submitButtonText || t('savePlantForm.submitButtonText');
  const FormIcon = initialData && Object.keys(initialData).length > 0 && !initialData.diagnosedPhotoDataUrl ? Edit : Leaf;

  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleChooseFromGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleGalleryPhotoSelect = (photo: PlantPhoto) => {
    setImagePreview(null); // Clear direct upload preview
    setSelectedGalleryPhotoUrl(photo.url); // Set the S3 key of the selected gallery photo
    form.setValue('diagnosedPhotoDataUrl', photo.url, { shouldDirty: true, shouldValidate: true });
    form.setValue('primaryPhoto', null); // Clear the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input element
    }
  };

  let previewDisplayUrl: string | null = null;
  if (imagePreview) {
    previewDisplayUrl = imagePreview;
  } else if (selectedGalleryPhotoUrl) {
    previewDisplayUrl = displayImageUrl;
  } else if (initialData?.diagnosedPhotoDataUrl) {
    previewDisplayUrl = displayImageUrl;
  }

  const isDisplayLoading = isLoadingDisplayImage || isCompressing;

  return (
    <Card className={cn("shadow-lg animate-in fade-in-50", hideInternalHeader ? "border-0 shadow-none" : "")}>
      {!hideInternalHeader && (
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FormIcon className="h-6 w-6 text-primary" />
            {currentFormTitle}
          </CardTitle>
          {currentFormDescription && <CardDescription>{currentFormDescription}</CardDescription>}
        </CardHeader>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className={cn("space-y-6", hideInternalHeader ? "pt-0" : "")}>
            {isDisplayLoading ? (
              <div className="my-4 p-2 border rounded-md bg-muted/50 flex justify-center">
                <Skeleton className="w-[150px] h-[150px] rounded-md" />
              </div>
            ) : previewDisplayUrl ? (
              <div className="my-4 p-2 border rounded-md bg-muted/50 flex justify-center">
                <NextImage
                  src={previewDisplayUrl}
                  alt={t('savePlantForm.primaryPhotoLabel')}
                  width={150}
                  height={150}
                  placeholder="blur"
                  blurDataURL={PLACEHOLDER_DATA_URI}
                  className="rounded-md object-contain max-h-[150px] shadow-md"
                  data-ai-hint="plant user-provided"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x150.png?text=Error';}}
                />
              </div>
            ) : null }

            <FormField
              control={form.control}
              name="primaryPhoto"
              render={({ field: { onChange, onBlur, name, ref: formRefSetter } }) => (
                <FormItem>
                  <FormLabel>{t('savePlantForm.primaryPhotoLabel')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span></FormLabel>
                  <FormControl>
                    <div>
                      {isStandalone ? (
                        <div className="space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full py-6 text-base"
                            onClick={handleTakePhoto}
                            disabled={isCompressing}
                          >
                            {isCompressing && form.getValues('primaryPhoto')?.[0] ? (
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                              <Camera className="mr-2 h-5 w-5" />
                            )}
                            {t('savePlantForm.takePhotoPWA')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full py-6 text-base"
                            onClick={handleChooseFromGallery}
                            disabled={isCompressing}
                          >
                            {isCompressing && form.getValues('primaryPhoto')?.[0] ? (
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                              <ImageIcon className="mr-2 h-5 w-5" />
                            )}
                            {t('savePlantForm.chooseFromGalleryPWA')}
                          </Button>
                        </div>
                      ) : (
                        // Desktop version
                        <label
                            htmlFor="primaryPhoto-input-saveform"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/50"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {isCompressing ? <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" /> : <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" /> }
                                <p className="mb-1 text-sm text-muted-foreground">
                                    <span className="font-semibold">{t('savePlantForm.uploadAreaText')}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{t('savePlantForm.uploadAreaHint')}</p>
                                {(form.getValues('primaryPhoto')?.[0] && imagePreview && !isCompressing) && <p className="text-xs text-primary mt-1">{form.getValues('primaryPhoto')?.[0].name}</p>}
                            </div>
                            </label>
                      )}
                      {/* Hidden File Input, controlled by RHF and accessible via fileInputRef */}
                      <Input
                          id="primaryPhoto-input-saveform" // Consistent ID for desktop label's htmlFor
                          type="file"
                          className="hidden"
                          accept="image/png, image/jpeg, image/gif, image/webp"
                          name={name} // from RHF field
                          ref={(e) => {
                            formRefSetter(e); // RHF ref
                            if (e) (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e; // Our custom ref
                          }}
                          onBlur={onBlur} // from RHF field
                          onChange={async (e) => { // from RHF field, with our async logic
                              const files = e.target.files;
                              onChange(files); // This is field.onChange from RHF, updates form state
                              if (files && files[0]) {
                                  if (files[0].size > 5 * 1024 * 1024) {
                                      form.setError("primaryPhoto", { type: "manual", message: t('savePlantForm.validation.photoTooLargeError')});
                                      setImagePreview(null);
                                      setSelectedGalleryPhotoUrl(form.getValues('diagnosedPhotoDataUrl') || null);
                                      if (e.target) e.target.value = '';
                                      return;
                                  }
                                  form.clearErrors("primaryPhoto");
                                  setIsCompressing(true);
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                    try {
                                      const originalDataUrl = reader.result as string;
                                      const compressedDataUrl = await compressImage(originalDataUrl, { quality: 0.8, type: 'image/webp', maxWidth: 1920, maxHeight: 1920 });
                                      setImagePreview(compressedDataUrl);
                                      form.setValue('diagnosedPhotoDataUrl', compressedDataUrl, {shouldDirty: true});
                                      setSelectedGalleryPhotoUrl(null);
                                    } catch (err) {
                                      console.error("Error compressing image in SavePlantForm:", err);
                                      form.setError("primaryPhoto", { type: "manual", message: t('savePlantForm.validation.photoProcessingError')});
                                      setImagePreview(null);
                                      setSelectedGalleryPhotoUrl(form.getValues('diagnosedPhotoDataUrl') || null);
                                    } finally {
                                      setIsCompressing(false);
                                    }
                                  };
                                  reader.readAsDataURL(files[0]);
                              } else {
                                        setImagePreview(null);
                                        setSelectedGalleryPhotoUrl(form.getValues('diagnosedPhotoDataUrl') || null);
                                        form.setValue('diagnosedPhotoDataUrl', form.getValues('diagnosedPhotoDataUrl') || null);
                                    }
                                }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  {isStandalone && (form.getValues('primaryPhoto')?.[0] && imagePreview && !isCompressing) && (
                    <p className="text-xs text-primary mt-1 text-center">
                      {t('savePlantForm.selectedFileLabel')}: {form.getValues('primaryPhoto')?.[0].name}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {galleryPhotos && galleryPhotos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('savePlantForm.gallerySelectLabel')}</Label>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                  <div className="flex space-x-3 p-3">
                    {galleryPhotos.map((photo) => (
                      <GalleryPhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        // Check if this gallery photo's URL matches the currently selected/initial URL
                        isSelected={selectedGalleryPhotoUrl === photo.url && !imagePreview}
                        userId={user?.id}
                        onClick={() => handleGalleryPhotoSelect(photo)}
                      />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            <FormField
              control={form.control}
              name="commonName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('savePlantForm.commonNameLabel')} <span className="text-destructive text-xs align-super">{t('common.required')}</span></FormLabel>
                  <FormControl>
                    <Input placeholder={t('savePlantForm.commonNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scientificName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('savePlantForm.scientificNameLabel')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span></FormLabel>
                  <FormControl>
                    <Input placeholder={t('savePlantForm.scientificNamePlaceholder')} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="familyCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('savePlantForm.familyCategoryLabel')} <span className="text-destructive text-xs align-super">{t('common.required')}</span></FormLabel>
                  <FormControl>
                    <Input placeholder={t('savePlantForm.familyCategoryPlaceholder')} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ageEstimateYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('savePlantForm.ageEstimateYearsLabel')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span></FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder={t('savePlantForm.ageEstimateYearsPlaceholder')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="healthCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('savePlantForm.healthConditionLabel')} <span className="text-destructive text-xs align-super">{t('common.required')}</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('savePlantForm.healthConditionPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="healthy">{t('savePlantForm.healthOptions.healthy')}</SelectItem>
                      <SelectItem value="needs_attention">{t('savePlantForm.healthOptions.needs_attention')}</SelectItem>
                      <SelectItem value="sick">{t('savePlantForm.healthOptions.sick')}</SelectItem>
                      <SelectItem value="unknown">{t('savePlantForm.healthOptions.unknown')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('savePlantForm.locationLabel')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span></FormLabel>
                  <FormControl>
                    <Input placeholder={t('savePlantForm.locationPlaceholder')} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('savePlantForm.customNotesLabel')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('savePlantForm.customNotesPlaceholder')} {...field} rows={3} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isCompressing}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || isCompressing || (!form.formState.isDirty && !initialData) || (form.formState.isSubmitted && !form.formState.isValid) }>
              {(isLoading || isCompressing) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              {(isLoading || isCompressing) ? t('savePlantForm.savingButton') : currentSubmitButtonText}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}