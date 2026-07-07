/**
 * RegisterPage — new account creation with password strength indicator,
 * Zod validation, React Hook Form, and consistent glassmorphism styling.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Brain, ArrowRight, Mail, Lock, User, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { authService } from '@services/authService';
import { useAuthStore } from '@store/authStore';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(255, 'Full name is too long'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/\d/, 'Must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, 'Must contain at least one special character'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Password Strength Indicator ─────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /\d/.test(pw) },
  { label: 'One special character', test: (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const passed = passwordRules.filter((r) => r.test(password)).length;
  const strength = passed <= 2 ? 'weak' : passed <= 4 ? 'fair' : 'strong';
  const colors = { weak: 'bg-red-500', fair: 'bg-amber-500', strong: 'bg-emerald-500' };
  const labels = { weak: 'Weak', fair: 'Fair', strong: 'Strong' };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= passed ? colors[strength] : 'bg-surface-200 dark:bg-surface-700'
              }`}
            />
          ))}
        </div>
        <span
          className={`text-xs font-semibold ${
            strength === 'weak'
              ? 'text-red-600 dark:text-red-400'
              : strength === 'fair'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {labels[strength]}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1">
        {passwordRules.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                ok
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-surface-400 dark:text-surface-500'
              }`}
            >
              <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${ok ? 'opacity-100' : 'opacity-30'}`} />
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  });

  const passwordValue = watch('password');

  const { mutate: registerUser, isPending, error, isError } = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setAuth(data);
      navigate('/dashboard', { replace: true });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerUser(data);
  };

  const errorMessage = (() => {
    if (!isError) return null;
    const err = error as { response?: { data?: { detail?: string } } };
    return err?.response?.data?.detail ?? 'Something went wrong. Please try again.';
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-[#020617] px-4 py-12 relative overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent-400/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-400/15 blur-3xl" />
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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
              Free forever for individuals — no credit card required
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              id="register-fullname"
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <Input
              id="register-email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="jane@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Password with strength indicator */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-password"
                className="block text-sm font-medium text-surface-700 dark:text-surface-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-surface-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
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
              <PasswordStrength password={passwordValue} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-confirm"
                className="block text-sm font-medium text-surface-700 dark:text-surface-300"
              >
                Confirm password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-surface-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="register-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className={`input-base pl-10 pr-10 ${errors.confirm_password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  {...register('confirm_password')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <Button
              id="register-submit"
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              isLoading={isPending}
              disabled={isPending}
            >
              {isPending ? 'Creating account…' : 'Create Account'}
              {!isPending && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
            <span className="text-xs text-surface-400">or</span>
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
          </div>

          <p className="text-center text-sm text-surface-500 dark:text-surface-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-surface-400 dark:text-surface-500">
          By creating an account, you agree to our{' '}
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
