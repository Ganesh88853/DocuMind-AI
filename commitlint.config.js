// =============================================================================
// DocuMind AI — Commitlint Configuration
// =============================================================================
// Enforces Conventional Commits standard:
// https://www.conventionalcommits.org/
//
// Format:  <type>(<optional scope>): <description>
//
// Types:
//   feat     — New feature
//   fix      — Bug fix
//   docs     — Documentation only
//   style    — Formatting, no logic change
//   refactor — Code change without feature/fix
//   test     — Adding or updating tests
//   ci       — CI/CD configuration changes
//   build    — Build system or dependencies
//   chore    — Maintenance tasks
//   perf     — Performance improvement
//   revert   — Revert a previous commit
//   security — Security fix or hardening
//
// Examples:
//   feat(auth): add refresh token rotation
//   fix(upload): handle PDF files > 10MB correctly
//   docs(readme): update Docker quickstart
//   ci(tests): add migration integrity check
//   build(deps): bump fastapi from 0.115.5 to 0.115.6
// =============================================================================

module.exports = {
  extends: ["@commitlint/config-conventional"],

  rules: {
    // ── Type rules ────────────────────────────────────────────────────────
    "type-enum": [
      2,
      "always",
      [
        "feat",      // New feature
        "fix",       // Bug fix
        "docs",      // Documentation
        "style",     // Formatting only
        "refactor",  // Refactoring
        "test",      // Tests
        "ci",        // CI/CD
        "build",     // Build / dependencies
        "chore",     // Maintenance
        "perf",      // Performance
        "revert",    // Reverts
        "security",  // Security
      ],
    ],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],

    // ── Scope rules ───────────────────────────────────────────────────────
    "scope-case": [2, "always", "lower-case"],

    // ── Subject rules ─────────────────────────────────────────────────────
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-max-length": [2, "always", 100],

    // ── Body rules ────────────────────────────────────────────────────────
    "body-max-line-length": [1, "always", 120], // Warning (not error) for long lines

    // ── Header rules ──────────────────────────────────────────────────────
    "header-max-length": [2, "always", 120],
  },

  // Prompt configuration for interactive commitlint
  prompt: {
    settings: {},
    messages: {
      skip: "(press enter to skip)",
      max: "(max %d chars)",
      min: "(min %d chars)",
    },
    questions: {
      type: {
        description: "Select the type of change that you're committing",
        enum: {
          feat:     { description: "A new feature",                              emoji: "✨" },
          fix:      { description: "A bug fix",                                  emoji: "🐛" },
          docs:     { description: "Documentation only changes",                 emoji: "📝" },
          style:    { description: "Formatting, no logic change",                emoji: "🎨" },
          refactor: { description: "Refactor without feature or fix",            emoji: "♻️"  },
          test:     { description: "Adding or updating tests",                   emoji: "🧪" },
          ci:       { description: "CI/CD configuration changes",                emoji: "⚙️"  },
          build:    { description: "Build system or dependency changes",         emoji: "🔨" },
          chore:    { description: "Maintenance tasks",                          emoji: "🔧" },
          perf:     { description: "Performance improvement",                    emoji: "🚀" },
          revert:   { description: "Revert a previous commit",                   emoji: "⏪" },
          security: { description: "Security fix or hardening",                  emoji: "🔒" },
        },
      },
    },
  },
};
