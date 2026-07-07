/**
 * ForgotPasswordPage — UI-only page for requesting a password reset.
 * Backend integration will be added in a future milestone.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Brain, Mail, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (_data: ForgotFormData) => {
    // Simulate network request — backend integration in future milestone
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-[#020617] px-4 py-16 relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="card-base p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 group mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow-sm">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                <span className="gradient-text">DocuMind</span>
                <span className="text-surface-700 dark:text-surface-200"> AI</span>
              </span>
            </Link>

            {!submitted ? (
              <>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  Forgot your password?
                </h1>
                <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
                  Enter your email and we'll send you a reset link.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  Check your email
                </h1>
                <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
                  We've sent a reset link to{' '}
                  <span className="font-semibold text-surface-700 dark:text-surface-300">
                    {getValues('email')}
                  </span>
                </p>
              </>
            )}
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <Input
                id="forgot-email"
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Button
                id="forgot-submit"
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending…' : 'Send Reset Link'}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-surface-500 dark:text-surface-400">
                Didn't receive the email? Check your spam folder, or{' '}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors"
                >
                  try again
                </button>
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
