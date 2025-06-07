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
import { confirmSignUp, resendSignUpCode } from '@aws-amplify/auth'; // Import Auth functions

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

  // Update email state if the query parameter changes
  useEffect(() => {
    if (emailFromParams && emailFromParams !== email) {
      setEmail(emailFromParams);
    }
  }, [emailFromParams, email]);


  const handleConfirmSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsConfirming(true);
    try {
      // Call Amplify confirmSignUp
      await confirmSignUp({ username: email, confirmationCode: code });

      toast({
        title: t("confirmSignupPage.confirmSuccessToastTitle"),
        description: t("confirmSignupPage.confirmSuccessToastDescription"),
      });
      router.push('/login'); // Redirect to login after successful confirmation
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
      // Call Amplify resendSignUpCode
      await resendSignUpCode({ username: email });

      toast({
        title: t("confirmSignupPage.resendSuccessToastTitle"),
        description: t("confirmSignupPage.resendSuccessToastDescription", { email }),
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

  const isLoading = isConfirming || isResending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">{t('confirmSignupPage.title')}</CardTitle>
          <CardDescription>
            {t('confirmSignupPage.description', { email })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConfirmSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">{t('confirmSignupPage.codeLabel')}</Label>
              <Input
                id="code"
                type="text"
                placeholder={t('confirmSignupPage.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isConfirming ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5" />
              )}
              {t('confirmSignupPage.confirmButton')}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {isResending ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                 <Mail className="mr-2 h-4 w-4" />
              )}
              {t('confirmSignupPage.resendCodeLink')}
            </Button>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('confirmSignupPage.backToLoginLink')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}