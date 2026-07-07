/**
 * LandingPage — Premium SaaS landing page for DocuMind AI.
 * Sections: Hero, Features, How It Works, Testimonials, FAQ, Footer.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowRight,
  Brain,
  Zap,
  Shield,
  MessageSquare,
  FileText,
  BarChart3,
  Star,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Globe,
  Lock,
} from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';

// ─── Animation Helpers ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Features Data ────────────────────────────────────────────────────────────

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Understanding',
    description: 'Our AI doesn\'t just search — it understands context, intent, and meaning across all your documents.',
    color: 'from-brand-500 to-brand-600',
    glow: 'shadow-brand-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Natural Language Queries',
    description: 'Ask questions in plain English. Get precise answers pulled from your document library instantly.',
    color: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/20',
  },
  {
    icon: Zap,
    title: 'Lightning Fast Results',
    description: 'Semantic search across thousands of pages in milliseconds. No more endless scrolling.',
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, SOC2 compliance, and zero data retention. Your documents stay private.',
    color: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/20',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'Understand how your team uses documents. Surface insights and identify knowledge gaps.',
    color: 'from-rose-500 to-pink-500',
    glow: 'shadow-rose-500/20',
  },
  {
    icon: Globe,
    title: 'Multi-Format Support',
    description: 'PDF, DOCX, XLSX, PPTX, images, and more. One unified interface for all document types.',
    color: 'from-sky-500 to-blue-500',
    glow: 'shadow-sky-500/20',
  },
];

// ─── Steps Data ───────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    title: 'Upload Your Documents',
    description: 'Drag and drop any file type. DocuMind AI instantly processes, indexes, and understands every page.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Ask Any Question',
    description: 'Type your question in natural language — just like texting a colleague who has read everything.',
    icon: MessageSquare,
  },
  {
    number: '03',
    title: 'Get Precise Answers',
    description: 'Receive cited, accurate answers with direct links to the exact passages in your documents.',
    icon: CheckCircle2,
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Head of Legal, NovaTech',
    avatar: 'SC',
    content: 'DocuMind AI has transformed how our legal team handles contracts. What used to take hours now takes minutes. The AI understands legal nuance better than I expected.',
    rating: 5,
    color: 'from-brand-500 to-accent-500',
  },
  {
    name: 'Marcus Rodriguez',
    role: 'CTO, BuildFast Inc.',
    avatar: 'MR',
    content: 'We processed 50,000 pages of technical documentation in minutes. The accuracy is remarkable — it finds connections across documents that would take a human days.',
    rating: 5,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Priya Sharma',
    role: 'Research Director, HealthFirst',
    avatar: 'PS',
    content: 'Game changer for our research team. We can now query five years of clinical studies in seconds. DocuMind AI has genuinely accelerated our research pipeline.',
    rating: 5,
    color: 'from-violet-500 to-purple-500',
  },
];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const faqs = [
  {
    question: 'What file types does DocuMind AI support?',
    answer: 'DocuMind AI supports PDF, DOCX, XLSX, PPTX, TXT, MD, images (PNG, JPG), and more. We\'re continuously adding support for additional formats.',
  },
  {
    question: 'How secure are my documents?',
    answer: 'Your documents are encrypted at rest and in transit using AES-256 and TLS 1.3. We are SOC 2 Type II compliant and never use your documents to train our AI models.',
  },
  {
    question: 'How accurate are the AI answers?',
    answer: 'DocuMind AI provides source-cited answers, allowing you to verify every response. Our accuracy benchmarks consistently exceed 95% across diverse document types.',
  },
  {
    question: 'Can I use DocuMind AI for my entire team?',
    answer: 'Yes. Our Team and Enterprise plans support unlimited users with role-based permissions, shared document libraries, and centralized billing.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes — start free with 50 pages and 100 queries per month. No credit card required. Upgrade anytime to unlock unlimited documents and queries.',
  },
];

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div variants={fadeUp} custom={index}>
      <button
        id={`faq-item-${index}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between py-5 text-left group"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-surface-900 dark:text-surface-50 pr-4 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-surface-400 group-hover:text-brand-500 transition-colors"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
          {answer}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-50 via-brand-50/30 to-accent-50/30 dark:from-[#020617] dark:via-brand-950/20 dark:to-accent-950/20" />

        {/* Decorative blobs */}
        <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-300/10 blur-3xl" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative section-container text-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50/80 px-4 py-2 text-sm font-medium text-brand-700 backdrop-blur-sm dark:border-brand-800/60 dark:bg-brand-950/60 dark:text-brand-300 mb-8"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Introducing DocuMind AI — Now in Beta
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance"
          >
            <span className="text-surface-900 dark:text-surface-50 block">Stop Searching.</span>
            <span className="gradient-text block mt-1">Start Asking.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-surface-600 dark:text-surface-300 leading-relaxed text-balance"
          >
            Your AI-powered document assistant that understands your files.
            Ask questions in plain English and get precise, cited answers instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              variant="gradient"
              size="xl"
              className="w-full sm:w-auto group"
              asChild
            >
              <Link to="/dashboard">
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="w-full sm:w-auto"
              asChild
            >
              <a href="#how-it-works">
                See How It Works
              </a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-xs text-surface-400 dark:text-surface-500"
          >
            Free forever for individuals • No credit card required
          </motion.p>

          {/* Hero UI Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className="relative mt-20 mx-auto max-w-5xl"
          >
            <div className="relative rounded-2xl border border-surface-200/60 bg-white/80 shadow-2xl backdrop-blur-sm dark:border-surface-700/60 dark:bg-surface-900/80 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b border-surface-100 dark:border-surface-800 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="ml-4 h-5 flex-1 rounded-lg bg-surface-100 dark:bg-surface-800 max-w-xs" />
              </div>

              {/* Mock UI Content */}
              <div className="grid grid-cols-4 min-h-[360px]">
                {/* Sidebar mock */}
                <div className="col-span-1 border-r border-surface-100 dark:border-surface-800 p-4 space-y-2">
                  {['Dashboard', 'Documents', 'Favorites', 'Search'].map((item, i) => (
                    <div
                      key={item}
                      className={`h-8 rounded-lg flex items-center gap-2 px-2 ${i === 0 ? 'bg-brand-50 dark:bg-brand-950/50' : ''}`}
                    >
                      <div className={`h-3 w-3 rounded ${i === 0 ? 'bg-brand-400' : 'bg-surface-200 dark:bg-surface-700'}`} />
                      <div className={`h-2 rounded flex-1 ${i === 0 ? 'bg-brand-200 dark:bg-brand-800' : 'bg-surface-100 dark:bg-surface-800'}`} />
                    </div>
                  ))}
                </div>

                {/* Main mock */}
                <div className="col-span-3 p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { color: 'bg-brand-100 dark:bg-brand-950/50', accent: 'bg-brand-400' },
                      { color: 'bg-emerald-100 dark:bg-emerald-950/50', accent: 'bg-emerald-400' },
                      { color: 'bg-amber-100 dark:bg-amber-950/50', accent: 'bg-amber-400' },
                    ].map((card, i) => (
                      <div key={i} className={`rounded-xl p-3 ${card.color}`}>
                        <div className={`h-6 w-6 rounded-lg ${card.accent} mb-2`} />
                        <div className="h-2 bg-surface-900/10 dark:bg-white/10 rounded w-3/4 mb-1" />
                        <div className="h-4 bg-surface-900/20 dark:bg-white/20 rounded w-1/2 font-bold" />
                      </div>
                    ))}
                  </div>

                  {/* Chat-like AI interaction */}
                  <div className="rounded-xl border border-surface-100 dark:border-surface-800 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-surface-200 dark:bg-surface-700 rounded w-11/12" />
                        <div className="h-2.5 bg-surface-200 dark:bg-surface-700 rounded w-4/5" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 justify-end">
                      <div className="flex-1 space-y-1.5 text-right">
                        <div className="h-2.5 bg-brand-100 dark:bg-brand-950 rounded w-3/4 ml-auto" />
                      </div>
                      <div className="h-7 w-7 rounded-full bg-surface-200 dark:bg-surface-700 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Document list */}
                  <div className="space-y-2">
                    {[85, 70, 90].map((w, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-surface-100 dark:border-surface-800 p-2.5">
                        <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                          <div className="h-3 w-3 rounded-sm bg-red-400" />
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded mb-1" style={{ width: `${w}%` }} />
                          <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Glow underneath */}
            <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-brand-500/20 to-accent-500/20 blur-3xl rounded-3xl" />
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white dark:bg-surface-900">
        <div className="section-container">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 mb-4">
                Features
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-surface-50 text-balance">
                Everything you need to master your documents
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-surface-500 dark:text-surface-400 leading-relaxed">
                DocuMind AI combines cutting-edge AI with an intuitive interface to give you superpowers over your document library.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <motion.div key={feature.title} variants={fadeUp}>
                  <Card hover className="h-full group">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg ${feature.glow} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-surface-50 dark:bg-[#020617]">
        <div className="section-container">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="inline-block rounded-full bg-accent-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-700 dark:bg-accent-950/60 dark:text-accent-300 mb-4">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-surface-50 text-balance">
                Up and running in three steps
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-surface-500 dark:text-surface-400">
                From upload to insight in under 60 seconds. No training required.
              </p>
            </motion.div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Connector line (desktop) */}
              <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-px bg-gradient-to-r from-brand-300 to-accent-300 dark:from-brand-700 dark:to-accent-700" />

              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  variants={fadeUp}
                  custom={index}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow-sm">
                      <step.icon className="h-7 w-7 text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600 shadow-md ring-2 ring-brand-100 dark:bg-surface-800 dark:text-brand-400 dark:ring-brand-900">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400 mb-2">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-surface-500 dark:text-surface-400 max-w-xs leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 bg-white dark:bg-surface-900">
        <div className="section-container">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 mb-4">
                Testimonials
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-surface-50 text-balance">
                Trusted by teams who move fast
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-surface-500 dark:text-surface-400">
                From legal to engineering, DocuMind AI helps professionals across every industry.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <motion.div key={testimonial.name} variants={fadeUp} custom={index}>
                  <Card hover className="h-full flex flex-col">
                    <div className="flex items-center gap-1 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed flex-1 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.color} text-xs font-bold text-white`}>
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-surface-50 dark:bg-[#020617]">
        <div className="section-container">
          <AnimatedSection>
            <motion.div
              variants={fadeUp}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-accent-600 px-8 py-16 text-center shadow-glow-lg"
            >
              {/* Background decoration */}
              <div className="absolute top-0 left-0 h-full w-full opacity-10">
                <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-white blur-3xl" />
                <div className="absolute bottom-10 right-10 h-60 w-60 rounded-full bg-white blur-3xl" />
              </div>

              <div className="relative">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-6">
                  <Lock className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white text-balance mb-4">
                  Start for free today
                </h2>
                <p className="text-brand-100 max-w-xl mx-auto mb-8">
                  Join thousands of professionals who use DocuMind AI to get more from their documents.
                  No credit card. No setup. Just answers.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-brand-700 hover:bg-brand-50"
                    asChild
                  >
                    <Link to="/dashboard">
                      Start Free — No Card Required
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-white dark:bg-surface-900">
        <div className="section-container">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 mb-4">
                FAQ
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-surface-50 text-balance">
                Frequently asked questions
              </h2>
            </motion.div>

            <div className="mx-auto max-w-3xl divide-y divide-surface-200 dark:divide-surface-700">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={faq.question}
                  question={faq.question}
                  answer={faq.answer}
                  index={index}
                />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
