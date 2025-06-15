
'use client';

import type { FormEvent, ChangeEvent, RefObject } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Sparkles, Stethoscope, Camera, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';
import { PLACEHOLDER_DATA_URI } from '@/lib/image-utils';

interface DiagnosisUploadFormProps {
  isLoadingDiagnosis: boolean;
  previewUrl: string | null;
  description: string;
  onDescriptionChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmitDiagnosis: (event: FormEvent) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  isFileSelected: boolean;
}

export function DiagnosisUploadForm({
  isLoadingDiagnosis,
  previewUrl,
  description,
  onDescriptionChange,
  onFileChange,
  onSubmitDiagnosis,
  fileInputRef,
  isFileSelected,
}: DiagnosisUploadFormProps) {
  const { t } = useLanguage();
  const isStandalone = usePWAStandalone();

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

  return (
    <Card className="shadow-xl w-full sm:max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Stethoscope className="h-7 w-7 text-primary" />
          {t('diagnosePage.uploadForm.title')}
        </CardTitle>
        <CardDescription>{t('diagnosePage.uploadForm.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmitDiagnosis} className="space-y-6">
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">
              {t('diagnosePage.uploadForm.imageUploadLabel')}
            </Label>
            {isStandalone ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-6 text-base"
                  onClick={handleTakePhoto}
                >
                  <Camera className="mr-2 h-5 w-5" />
                  {t('diagnosePage.uploadForm.takePhotoPWA')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-6 text-base"
                  onClick={handleChooseFromGallery}
                >
                  <ImageIcon className="mr-2 h-5 w-5" />
                  {t('diagnosePage.uploadForm.chooseFromGalleryPWA')}
                </Button>
              </div>
            ) : (
              <label
                htmlFor="plant-image-diagnose-desktop"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-border border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center text-center">
                  {isLoadingDiagnosis && previewUrl === null && !isFileSelected ? (
                     <Loader2 className="w-10 h-10 mb-3 text-muted-foreground animate-spin" />
                  ) : !previewUrl ? (
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                  ) : null}
                  {!previewUrl && (
                    <>
                      <p className="mb-1 text-sm text-muted-foreground">
                        <span className="font-semibold">{t('diagnosePage.uploadForm.uploadAreaTextDesktop')}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{t('diagnosePage.uploadForm.uploadAreaHintDesktop')}</p>
                    </>
                  )}
                  {previewUrl && <p className="text-sm text-muted-foreground">{t('diagnosePage.uploadForm.changeImageHintDesktop')}</p>}
                </div>
                <Input
                  id="plant-image-diagnose-desktop"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={onFileChange}
                />
              </label>
            )}
          </div>

          {previewUrl && (
            <div className="mt-4 p-2 border rounded-md bg-muted/50 flex justify-center">
              <Image
                src={previewUrl}
                alt={t('diagnosePage.uploadForm.imagePreviewAlt')}
                width={250}
                height={250}
                placeholder="blur"
                blurDataURL={PLACEHOLDER_DATA_URI}
                className="rounded-md object-contain max-h-[250px] shadow-md"
                data-ai-hint="plant user-uploaded"
              />
            </div>
          )}

          <div>
            <Label htmlFor="plant-description" className="block text-sm font-medium text-foreground mb-1">
              {t('diagnosePage.uploadForm.notesLabel')}
            </Label>
            <Textarea
              id="plant-description"
              placeholder={t('diagnosePage.uploadForm.descriptionPlaceholder')}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isLoadingDiagnosis || !isFileSelected} className="w-full text-base py-3 mt-8">
            {isLoadingDiagnosis ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('diagnosePage.uploadForm.submitButtonLoading')}</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" />{t('diagnosePage.uploadForm.submitButton')}</>
            )}
          </Button>
        </form>
      </CardContent>

      <Input
        id="plant-image-diagnose-hidden"
        ref={isStandalone ? fileInputRef : null} // Only assign ref if in PWA mode and using this hidden input
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={onFileChange}
      />
    </Card>
  );
}

    