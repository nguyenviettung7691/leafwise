
'use client';

import type { PlantFormData, PlantHealthCondition, PlantPhoto } from '@/types';
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
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Leaf, UploadCloud, Save, Edit, ImageOff, Loader2, Camera } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIndexedDbImage } from '@/hooks/useIndexedDbImage';
import { compressImage } from '@/lib/image-utils'; // Import compressImage

const primaryPhotoSchema = typeof window !== 'undefined'
  ? z.instanceof(FileList).optional().nullable()
  : z.any().optional().nullable();

const plantFormSchema = z.object({
  commonName: z.string().min(1, { message: "Common name is required." }),
  scientificName: z.string().optional(),
  familyCategory: z.string().min(1, { message: "Family category is required." }),
  ageEstimateYears: z.coerce.number().min(0, "Age must be a positive number.").optional().nullable(),
  healthCondition: z.enum(['healthy', 'needs_attention', 'sick', 'unknown'], {
    required_error: "Health condition is required.",
  }),
  location: z.string().optional(),
  customNotes: z.string().optional(),
  primaryPhoto: primaryPhotoSchema,
  diagnosedPhotoDataUrl: z.string().optional().nullable(), // Will hold compressed data URL or IDB key
});

type SavePlantFormValues = z.infer<typeof plantFormSchema>;

interface SavePlantFormProps {
  initialData?: Partial<PlantFormData>;
  galleryPhotos?: PlantPhoto[];
  onSave: (data: PlantFormData) => Promise<void>;
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
  onClick: () => void;
}

const GalleryPhotoThumbnail: React.FC<GalleryPhotoThumbnailProps> = ({ photo, isSelected, onClick }) => {
  const { imageUrl, isLoading: isLoadingImage, error: imageError } = useIndexedDbImage(photo.url);

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
        <Image
          src={imageUrl}
          alt={`Gallery photo ${photo.id}`}
          width={80}
          height={80}
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
  const { t } = useLanguage();
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
      primaryPhoto: null,
      diagnosedPhotoDataUrl: initialData?.diagnosedPhotoDataUrl || null,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null); // For newly uploaded file's data URL
  const [selectedGalleryPhotoId, setSelectedGalleryPhotoId] = useState<string | null>(null); // For IDB key from gallery
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // This hook is to display the initial image if it's from IDB (for edit mode)
  const { imageUrl: initialImageFromDb, isLoading: isLoadingInitialImage } = useIndexedDbImage(
    initialData?.diagnosedPhotoDataUrl && !initialData.diagnosedPhotoDataUrl.startsWith('data:image/')
      ? initialData.diagnosedPhotoDataUrl
      : undefined
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
      primaryPhoto: null,
      diagnosedPhotoDataUrl: initialData?.diagnosedPhotoDataUrl || null,
    });

    if (initialData?.diagnosedPhotoDataUrl) {
      if (initialData.diagnosedPhotoDataUrl.startsWith('data:image/')) {
        // This is likely a data URL from diagnosis preview, set it directly for the preview
        setImagePreview(initialData.diagnosedPhotoDataUrl);
        setSelectedGalleryPhotoId(null);
      } else {
        // This is likely an IDB key (from existing plant), set it for gallery selection
        setSelectedGalleryPhotoId(initialData.diagnosedPhotoDataUrl);
        setImagePreview(null); 
      }
    } else {
      setImagePreview(null);
      setSelectedGalleryPhotoId(null);
    }
  }, [initialData, form]);


  const onSubmit = async (data: SavePlantFormValues) => {
    const formDataToSave: PlantFormData = {
        ...data,
        primaryPhoto: data.primaryPhoto instanceof FileList ? data.primaryPhoto : null,
        // diagnosedPhotoDataUrl should already hold the compressed data URL or the selected gallery IDB key
        diagnosedPhotoDataUrl: imagePreview || selectedGalleryPhotoId, 
    };
    await onSave(formDataToSave);
  };

  const currentFormTitle = formTitle || t('savePlantForm.formTitle');
  const currentFormDescription = formDescription || t('savePlantForm.formDescription');
  const currentSubmitButtonText = submitButtonText || t('savePlantForm.submitButtonText');
  const FormIcon = initialData && Object.keys(initialData).length > 0 && !initialData.diagnosedPhotoDataUrl ? Edit : Leaf;


  const handleGalleryPhotoSelect = (photo: PlantPhoto) => {
    setImagePreview(null); // Clear any uploaded file preview
    setSelectedGalleryPhotoId(photo.url); // Set IDB key from gallery
    form.setValue('diagnosedPhotoDataUrl', photo.url, { shouldDirty: true, shouldValidate: true });
    form.setValue('primaryPhoto', null); // Clear FileList from form state
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input element
    }
  };
  
  let displayUrlForPreview: string | null = null;
  if (imagePreview) { // Prioritize newly uploaded & compressed image
    displayUrlForPreview = imagePreview;
  } else if (selectedGalleryPhotoId) { // Then gallery selection (which hook will resolve)
    displayUrlForPreview = initialImageFromDb; // Use the URL from the hook
  } else if (initialData?.diagnosedPhotoDataUrl && initialData.diagnosedPhotoDataUrl.startsWith('data:image/')) {
    // Initial data was a data URL (e.g. from diagnose page before saving)
    displayUrlForPreview = initialData.diagnosedPhotoDataUrl;
  }

  const isDisplayLoading = (isLoadingInitialImage && !!selectedGalleryPhotoId && !imagePreview) || isCompressing;
  
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
            ) : displayUrlForPreview ? (
              <div className="my-4 p-2 border rounded-md bg-muted/50 flex justify-center">
                <Image
                  src={displayUrlForPreview}
                  alt={t('savePlantForm.primaryPhotoLabel')}
                  width={150}
                  height={150}
                  className="rounded-md object-contain max-h-[150px] shadow-md"
                  data-ai-hint="plant user-provided"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x150.png?text=Error';}}
                />
              </div>
            ) : null }

            <FormField
              control={form.control}
              name="primaryPhoto"
              render={({ field: { onBlur, name, ref: formRefSetter } }) => ( // Removed field.onChange
                <FormItem>
                  <FormLabel>{t('savePlantForm.primaryPhotoLabel')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span></FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-center w-full">
                        <label
                            htmlFor="primaryPhoto-input"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/50"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {isCompressing ? <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" /> : <Camera className="w-8 h-8 mb-2 text-muted-foreground" /> }
                                <p className="mb-1 text-sm text-muted-foreground">
                                    <span className="font-semibold">{t('savePlantForm.uploadAreaText')}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{t('savePlantForm.uploadAreaHint')}</p>
                                {(form.getValues('primaryPhoto')?.[0] && imagePreview && !isCompressing) && <p className="text-xs text-primary mt-1">{form.getValues('primaryPhoto')?.[0].name}</p>}
                            </div>
                            <Input
                                id="primaryPhoto-input"
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                name={name}
                                ref={(e) => {
                                  formRefSetter(e);
                                  if (e) (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                                }}
                                onBlur={onBlur}
                                onChange={async (e) => { // Made async
                                    const files = e.target.files;
                                    form.setValue('primaryPhoto', files, { shouldValidate: true, shouldDirty: true }); // Update RHF state first
                                    if (files && files[0]) {
                                        if (files[0].size > 5 * 1024 * 1024) { // Increased limit for pre-compression
                                            form.setError("primaryPhoto", { type: "manual", message: t('diagnosePage.toasts.imageTooLargeDesc')});
                                            setImagePreview(null);
                                            if (selectedGalleryPhotoId) {
                                              form.setValue('diagnosedPhotoDataUrl', selectedGalleryPhotoId);
                                            } else if (initialData?.diagnosedPhotoDataUrl) {
                                              form.setValue('diagnosedPhotoDataUrl', initialData.diagnosedPhotoDataUrl);
                                            } else {
                                              form.setValue('diagnosedPhotoDataUrl', null);
                                            }
                                            e.target.value = '';
                                            return;
                                        }
                                        form.clearErrors("primaryPhoto");
                                        setIsCompressing(true);
                                        const reader = new FileReader();
                                        reader.onloadend = async () => {
                                          try {
                                            const originalDataUrl = reader.result as string;
                                            const compressedDataUrl = await compressImage(originalDataUrl, { quality: 0.75, type: 'image/jpeg', maxWidth: 1024, maxHeight: 1024 });
                                            setImagePreview(compressedDataUrl);
                                            form.setValue('diagnosedPhotoDataUrl', compressedDataUrl, {shouldDirty: true});
                                            setSelectedGalleryPhotoId(null); 
                                          } catch (err) {
                                            console.error("Error compressing image in SavePlantForm:", err);
                                            form.setError("primaryPhoto", { type: "manual", message: "Failed to process image."});
                                            setImagePreview(null);
                                          } finally {
                                            setIsCompressing(false);
                                          }
                                        };
                                        reader.readAsDataURL(files[0]);
                                    } else {
                                        setImagePreview(null);
                                        if (selectedGalleryPhotoId) {
                                            form.setValue('diagnosedPhotoDataUrl', selectedGalleryPhotoId);
                                        } else if (initialData?.diagnosedPhotoDataUrl) {
                                            form.setValue('diagnosedPhotoDataUrl', initialData.diagnosedPhotoDataUrl);
                                        } else {
                                             form.setValue('diagnosedPhotoDataUrl', null);
                                        }
                                    }
                                }}
                            />
                        </label>
                    </div>
                  </FormControl>
                  <FormMessage />
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
                        isSelected={selectedGalleryPhotoId === photo.url && !imagePreview}
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
