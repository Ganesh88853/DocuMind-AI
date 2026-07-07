/**
 * LoginPage — premium authentication form with Zod validation,
 * React Hook Form, animated feedback, and dark mode support.
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Brain, ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { authService } from '@services/authService';
import { useAuthStore } from '@store/authStore';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Login Page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const { mutate: login, isPending, error, isError } = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data);
      navigate(from, { replace: true });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login({ email: data.email, password: data.password });
  };

  // Extract readable error message from Axios error
  const errorMessage = (() => {
    if (!isError) return null;
    const err = error as { response?: { data?: { detail?: string } } };
    return err?.response?.data?.detail ?? 'Something went wrong. Please try again.';
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-[#020617] px-4 py-16 relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-400/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-400/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
              Sign in to access your document workspace
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-950/30"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              id="login-email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="jane@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-surface-700 dark:text-surface-300"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-surface-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`input-base pl-10 pr-10 ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-3 cursor-pointer group" htmlFor="remember-me">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800"
                {...register('rememberMe')}
              />
              <span className="text-sm text-surface-600 dark:text-surface-400 group-hover:text-surface-900 dark:group-hover:text-surface-200 transition-colors">
                Remember me for 7 days
              </span>
            </label>

            <Button
              id="login-submit"
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              isLoading={isPending}
              disabled={isPending}
            >
              {isPending ? 'Signing in…' : 'Sign In'}
              {!isPending && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
            <span className="text-xs text-surface-400">or</span>
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-surface-500 dark:text-surface-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>

        {/* Bottom note */}
        <p className="mt-6 text-center text-xs text-surface-400 dark:text-surface-500">
          By signing in, you agree to our{' '}
          <a href="#" className="underline hover:text-surface-600 dark:hover:text-surface-300">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-surface-600 dark:hover:text-surface-300">
            Privacy Policy
          </a>
        </p>
      </motion.div>
    </div>
  );
}
