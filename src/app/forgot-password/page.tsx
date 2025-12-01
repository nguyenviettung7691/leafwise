'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { forgotPassword, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  // If already authenticated, redirect to home
  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      // Navigation is handled within the forgotPassword function
    } catch (error) {
      console.error('Forgot password failed:', error);
      // Toast for error is handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">{t('forgotPasswordPage.title')}</CardTitle>
          <CardDescription>{t('forgotPasswordPage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('forgotPasswordPage.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('forgotPasswordPage.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('forgotPasswordPage.emailHint')}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-5 w-5" />
              )}
              {t('forgotPasswordPage.sendCodeButton')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('forgotPasswordPage.backToLoginText')}{' '}
            <ProgressBarLink href="/login" className="font-medium text-primary hover:underline">
              {t('forgotPasswordPage.backToLoginLink')}
            </ProgressBarLink>
          </p>

          <div className="mt-4 text-center">
            <ProgressBarLink href="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center group">
              <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              {t('common.backHome')}
            </ProgressBarLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}