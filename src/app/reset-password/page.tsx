'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromParams = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromParams);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { confirmForgotPassword, isLoading: authLoading, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  // If already authenticated, redirect to home
  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Update email state if the query parameter changes
  useEffect(() => {
    if (emailFromParams && emailFromParams !== email) {
      setEmail(emailFromParams);
    }
  }, [emailFromParams, email]);

  // Protect route: only allow access if coming from forgot-password
  // (user should have email in query params)
  useEffect(() => {
    if (!emailFromParams && !isSubmitting) {
      // If no email param and not mid-submit, redirect to forgot-password
      router.push('/forgot-password');
    }
  }, [emailFromParams, router, isSubmitting]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // Validate inputs
    if (!email || !code || !newPassword) {
      // Toast handled by AuthContext on error
      return;
    }

    if (newPassword.length < 6) {
      // Toast handled by AuthContext on error
      return;
    }

    if (newPassword !== confirmPassword) {
      // Toast handled by AuthContext on error
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmForgotPassword(email, code, newPassword);
      // Navigation is handled within the confirmForgotPassword function
    } catch (error) {
      console.error('Password reset failed:', error);
      // Toast for error is handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting;
  const isPasswordMatching = newPassword && confirmPassword && newPassword === confirmPassword;
  const isFormValid = email && code && newPassword && confirmPassword && isPasswordMatching && newPassword.length >= 6;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Lock className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">{t('resetPasswordPage.title')}</CardTitle>
          <CardDescription>{t('resetPasswordPage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field - readonly */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('resetPasswordPage.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Verification Code field */}
            <div className="space-y-2">
              <Label htmlFor="code">{t('resetPasswordPage.codeLabel')}</Label>
              <Input
                id="code"
                type="text"
                placeholder={t('resetPasswordPage.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                {t('resetPasswordPage.codeHint')}
              </p>
            </div>

            {/* New Password field */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('resetPasswordPage.newPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('resetPasswordPage.newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('resetPasswordPage.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('resetPasswordPage.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {newPassword && confirmPassword && !isPasswordMatching && (
                <p className="text-xs text-destructive">
                  {t('resetPasswordPage.passwordMismatch')}
                </p>
              )}
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs text-destructive">
                  {t('resetPasswordPage.passwordTooShort')}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Lock className="mr-2 h-5 w-5" />
              )}
              {t('resetPasswordPage.resetButton')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('resetPasswordPage.backToLoginText')}{' '}
            <ProgressBarLink href="/login" className="font-medium text-primary hover:underline">
              {t('resetPasswordPage.backToLoginLink')}
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