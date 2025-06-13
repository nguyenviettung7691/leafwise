
'use client';

import type { FormEvent, ChangeEvent, RefObject } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Stethoscope, Camera } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';
import { cn } from '@/lib/utils';
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

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Stethoscope className="h-7 w-7 text-primary" />
          {t('nav.diagnosePlant')}
        </CardTitle>
        <CardDescription>{t('diagnosePage.uploadForm.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmitDiagnosis} className="space-y-6">
          <div>
            <Label htmlFor="plant-image-diagnose" className="block text-sm font-medium text-foreground mb-1">
              {t('diagnosePage.uploadForm.imageLabel')}
            </Label>
            {isStandalone ? (
              <label
                htmlFor="plant-image-diagnose"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/50"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isLoadingDiagnosis && previewUrl === null ? ( // Show loader here only if image is processing immediately after selection
                     <Loader2 className="w-8 h-8 mb-2 text-muted-foreground animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                  )}
                  <p className="mb-1 text-sm text-muted-foreground">
                    <span className="font-semibold">{t('savePlantForm.uploadAreaTextPWA')}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t('savePlantForm.uploadAreaHint')}</p>
                </div>
                <Input
                  id="plant-image-diagnose"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={onFileChange}
                />
              </label>
            ) : (
              <Input
                id="plant-image-diagnose"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={onFileChange}
                className="file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            )}
          </div>

          {previewUrl && (
            <div className="mt-4 p-2 border rounded-md bg-muted/50 flex justify-center">
              <Image
                src={previewUrl}
                alt={t('diagnosePage.resultDisplay.imageAlt')}
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
              {t('diagnosePage.uploadForm.descriptionLabel')}
            </Label>
            <Textarea
              id="plant-description"
              placeholder={t('diagnosePage.uploadForm.descriptionPlaceholder')}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isLoadingDiagnosis || !isFileSelected} className="w-full text-base py-3">
            {isLoadingDiagnosis ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('diagnosePage.uploadForm.submitButtonLoading')}</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" />{t('diagnosePage.uploadForm.submitButton')}</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

    