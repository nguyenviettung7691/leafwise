'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth hook

export default function ConfirmSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromParams = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromParams);
  const [code, setCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();
  const { confirmSignUp } = useAuth(); // Get confirmSignUp from auth context

  // Update email state if the query parameter changes
  useEffect(() => {
    if (emailFromParams && emailFromParams !== email) {
      setEmail(emailFromParams);
    }
  }, [emailFromParams, email]);

  const handleConfirmSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!email || !code) {
      toast({
        title: t('common.error'),
        description: 'Please enter email and confirmation code',
        variant: 'destructive',
      });
      return;
    }

    setIsConfirming(true);
    try {
      // Call confirmSignUp from auth context
      await confirmSignUp(email, code);

      toast({
        title: t('confirmSignupPage.confirmSuccessToastTitle'),
        description: t('confirmSignupPage.confirmSuccessToastDescription'),
      });
      // Router push to login is handled in confirmSignUp
    } catch (error: any) {
      console.error("Confirmation failed:", error);
      let errorMessage = t("confirmSignupPage.confirmErrorToastDescription");

      // Add specific error handling for common confirmation errors
      if (error.name === 'CodeMismatchException') {
        errorMessage = t("authErrors.codeMismatch");
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = t("authErrors.expiredCode");
      } else if (error.name === 'LimitExceededException') {
        errorMessage = t("authErrors.limitExceeded");
      } else if (error.name === 'TooManyRequestsException') {
        errorMessage = t("authErrors.tooManyRequests");
      }

      toast({
        title: t("confirmSignupPage.confirmErrorToastTitle"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast({
        title: t("common.error"),
        description: "Email address is missing.", // Consider adding i18n key for this
        variant: "destructive",
      });
      return;
    }
    setIsResending(true);
    try {
      // TODO: Implement resendSignUpCode in AuthContext if needed
      // For now, user must use the confirmation code sent to their email
      toast({
        title: t('common.info'),
        description: 'Please check your email for the confirmation code',
      });
    } catch (error: any) {
      console.error("Resend code failed:", error);
      let errorMessage = t("confirmSignupPage.resendErrorToastDescription");

      // Add specific error handling for resend errors
      if (error.name === 'LimitExceededException') {
        errorMessage = t("authErrors.limitExceeded");
      } else if (error.name === 'TooManyRequestsException') {
        errorMessage = t("authErrors.tooManyRequests");
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = t("authErrors.userNotFound"); // Although unlikely here, good to handle
      }

      toast({
        title: t("confirmSignupPage.resendErrorToastTitle"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">{t('confirmSignupPage.title')}</CardTitle>
          <CardDescription>
            {t('confirmSignupPage.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConfirmSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('common.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isConfirming}
                required
              />
            </div>

            {/* Confirmation Code Input */}
            <div className="space-y-2">
              <Label htmlFor="code">{t('confirmSignupPage.confirmationCodeLabel')}</Label>
              <Input
                id="code"
                type="text"
                placeholder={t('confirmSignupPage.confirmationCodePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isConfirming}
                required
              />
            </div>

            {/* Confirm Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isConfirming || !email || !code}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('confirmSignupPage.confirmingButton')}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('confirmSignupPage.confirmButton')}
                </>
              )}
            </Button>

            {/* Resend Code Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isResending || isConfirming}
              onClick={handleResendCode}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('confirmSignupPage.resendingButton')}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('confirmSignupPage.resendButton')}
                </>
              )}
            </Button>
          </form>
          {/* Footer Links */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {t('confirmSignupPage.noCodeLabel')}
            </span>
            <Link
              href="/register"
              className="ml-2 text-primary hover:underline font-medium"
            >
              {t('confirmSignupPage.registerAgainLink')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}