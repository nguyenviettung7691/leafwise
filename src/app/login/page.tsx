
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      // Navigation is handled within the login function
    } catch (error) {
      console.error("Login failed:", error);
      // Toast for error is handled in AuthContext or can be added here
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">{t('loginPage.title')}</CardTitle>
          <CardDescription>{t('loginPage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('loginPage.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('loginPage.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('loginPage.passwordLabel')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'} // Toggle type
                  placeholder={t('loginPage.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10" // Add padding for the button
                />
                <Button
                  type="button" // Important: prevent form submission
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                  onClick={() => setShowPassword(!showPassword)} // Toggle state
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              {t('loginPage.signInButton')}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('loginPage.noAccountText')}{' '}
            <ProgressBarLink href="/register" className="font-medium text-primary hover:underline">
              {t('loginPage.signUpLink')}
            </ProgressBarLink>
          </p>
          <div className="mt-4 text-center">
            <ProgressBarLink href="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center group">
              <ArrowLeft className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              {t('loginPage.backToHomepageLink')}
            </ProgressBarLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
