/* eslint-disable @typescript-eslint/no-explicit-any */
const securitySchemes = {
  cookieAuth: {
    type: "apiKey",
    in: "cookie",
    name: "authjs.session-token",
    description: "Session cookie set by NextAuth after signing in.",
  },
};

const errorSchema = {
  type: "object",
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;

const userRefSchema = {
  type: "object",
  properties: {
    _id: { type: "string", format: "uuid", description: "Supabase uuid (or legacy Mongo ObjectId during transition)" },
    username: { type: "string" },
    name: { type: "string" },
    image: { type: "string", nullable: true },
  },
} as const;

export const openApiSpec: Record<string, any> = {
  openapi: "3.0.3",
  info: {
    title: "Setups Works Lab API",
    version: "2.1.0",
    description:
      "REST API for Setups Works Lab — an AI-powered coding practice platform. All protected endpoints require an active session cookie obtained via `/api/auth/signin`.",
    contact: { name: "Setups Works Lab", email: "nitheeraj1@gmail.com" },
    license: { name: "MIT" },
  },
  servers: [{ url: "/api", description: "Current server" }],
  tags: [
    { name: "Auth", description: "Registration and authentication" },
    { name: "Questions", description: "DSA problem bank" },
    { name: "Challenges", description: "Frontend / UI challenges" },
    { name: "Submissions", description: "Code execution and submissions" },
    { name: "Execute", description: "Run code without submitting" },
    { name: "Contests", description: "Coding contests and leaderboards" },
    { name: "Discussions", description: "Per-problem community forum" },
    { name: "Bookmarks", description: "Save problems and challenges" },
    { name: "Notes", description: "Private per-problem notes" },
    { name: "Follow", description: "Follow users and activity feed" },
    { name: "Weakness", description: "Category-level performance analysis" },
    { name: "Daily Plan", description: "AI-generated daily problem set" },
    { name: "Revision", description: "Spaced repetition (SM-2)" },
    { name: "Search", description: "Global search" },
    { name: "Interview", description: "Mock interview question queue" },
    { name: "AI", description: "AI-powered tools + saved run history (credit-metered)" },
    { name: "Compiler", description: "Standalone multi-language code runner" },
    { name: "Billing", description: "AI credit usage and invoices" },
    { name: "Subscription", description: "Plans, trials and Razorpay checkout" },
    { name: "Onboarding", description: "First-run preferences" },
    { name: "Feedback", description: "Bug reports and feature requests" },
    { name: "Beta", description: "Beta program signup" },
    { name: "Coupons", description: "Discount codes" },
    { name: "Account", description: "Account management" },
    { name: "Blog", description: "AI-generated feature blog" },
    { name: "Careers", description: "Open roles and applications" },
    { name: "Admin", description: "Admin-only endpoints (role: admin)" },
  ],
  components: {
    securitySchemes,
    schemas: {
      Error: errorSchema,
      UserRef: userRefSchema,
      Question: {
        type: "object",
        properties: {
          _id: { type: "string", format: "uuid", description: "Supabase uuid (or legacy Mongo ObjectId during transition)" },
          slug: { type: "string" },
          title: { type: "string" },
          difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          acceptanceRate: { type: "number", nullable: true },
          isPublished: { type: "boolean" },
        },
      },
      Discussion: {
        type: "object",
        properties: {
          _id: { type: "string", format: "uuid", description: "Supabase uuid (or legacy Mongo ObjectId during transition)" },
          title: { type: "string" },
          content: { type: "string" },
          kind: { type: "string", enum: ["discussion", "solution", "question", "editorial"] },
          author: { $ref: "#/components/schemas/UserRef" },
          tags: { type: "array", items: { type: "string" } },
          language: { type: "string", nullable: true },
          upvotes: { type: "array", items: { type: "string" } },
          downvotes: { type: "array", items: { type: "string" } },
          views: { type: "integer" },
          isPinned: { type: "boolean" },
          aiSummary: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Bookmark: {
        type: "object",
        properties: {
          _id: { type: "string", format: "uuid", description: "Supabase uuid (or legacy Mongo ObjectId during transition)" },
          kind: { type: "string", enum: ["question", "challenge"] },
          list: { type: "string" },
          question: { $ref: "#/components/schemas/Question", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Note: {
        type: "object",
        properties: {
          _id: { type: "string", format: "uuid", description: "Supabase uuid (or legacy Mongo ObjectId during transition)" },
          content: { type: "string" },
          isPrivate: { type: "boolean" },
          tags: { type: "array", items: { type: "string" } },
          question: { $ref: "#/components/schemas/Question", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SpacedRepetitionCard: {
        type: "object",
        properties: {
          _id: { type: "string", format: "uuid", description: "Supabase uuid (or legacy Mongo ObjectId during transition)" },
          question: { $ref: "#/components/schemas/Question" },
          interval: { type: "integer", description: "Days until next review" },
          repetitions: { type: "integer" },
          easeFactor: { type: "number" },
          nextReview: { type: "string", format: "date-time" },
          lastReview: { type: "string", format: "date-time", nullable: true },
        },
      },
      Submission: {
        type: "object",
        properties: {
          _id: { type: "string", format: "uuid", description: "Supabase uuid (or legacy Mongo ObjectId during transition)" },
          status: { type: "string", enum: ["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", "Compilation Error"] },
          language: { type: "string" },
          runtime: { type: "number", nullable: true },
          memory: { type: "number", nullable: true },
          xpAwarded: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      WeaknessItem: {
        type: "object",
        properties: {
          category: { type: "string" },
          attempted: { type: "integer" },
          accepted: { type: "integer" },
          rate: { type: "number", description: "Acceptance rate 0–100" },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    /* ── AUTH ─────────────────────────────────────────── */
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                  username: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User created", content: { "application/json": { schema: { type: "object", properties: { user: { type: "object", properties: { id: { type: "string" }, email: { type: "string" }, name: { type: "string" } } } } } } } },
          "400": { description: "Validation error or email taken", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset email",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
            },
          },
        },
        responses: {
          "200": { description: "If the email exists, a reset link is sent (always returns 200 to avoid account enumeration)" },
          "400": { description: "Invalid email" },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using a token from the reset email",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string", description: "Token from the password-reset email link" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password updated" },
          "400": { description: "Invalid or expired token" },
        },
      },
    },

    /* ── BETA ─────────────────────────────────────────── */
    "/beta/join": {
      get: {
        tags: ["Beta"],
        summary: "Get remaining beta spots",
        security: [],
        responses: {
          "200": { description: "Spots left", content: { "application/json": { schema: { type: "object", properties: { spotsLeft: { type: "integer" } } } } } },
        },
      },
      post: {
        tags: ["Beta"],
        summary: "Sign up for the beta with a new account",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "username", "email", "password"],
                properties: {
                  name: { type: "string" },
                  username: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Beta account created" },
          "400": { description: "Validation error" },
          "409": { description: "Beta full or email taken" },
        },
      },
    },
    "/beta/apply": {
      post: {
        tags: ["Beta"],
        summary: "Claim a beta spot for the signed-in user",
        responses: {
          "200": { description: "Beta claim result", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, spotsLeft: { type: "integer" }, error: { type: "string", nullable: true } } } } } },
          "401": { description: "Unauthenticated" },
          "404": { description: "User not found" },
        },
      },
    },

    /* ── ONBOARDING ──────────────────────────────────── */
    "/onboarding": {
      post: {
        tags: ["Onboarding"],
        summary: "Save first-run onboarding preferences",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["goal", "level", "topics", "dailyGoal"],
                properties: {
                  goal: { type: "string", description: "Primary learning goal" },
                  level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                  topics: { type: "array", items: { type: "string" } },
                  companies: { type: "array", items: { type: "string" } },
                  dailyGoal: { type: "integer", description: "Target problems per day" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Preferences saved" },
          "400": { description: "Missing required fields" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── FEEDBACK ────────────────────────────────────── */
    "/feedback": {
      post: {
        tags: ["Feedback"],
        summary: "Submit feedback (emailed to the team)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "title", "description"],
                properties: {
                  type: { type: "string", enum: ["bug", "feature", "issue"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  email: { type: "string", format: "email", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Feedback sent" },
          "400": { description: "Validation error" },
        },
      },
    },

    /* ── COMPILER ────────────────────────────────────── */
    "/compiler": {
      post: {
        tags: ["Compiler"],
        summary: "Run code in any supported language with custom stdin",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["language", "code"],
                properties: {
                  language: { type: "string", example: "python" },
                  code: { type: "string" },
                  stdin: { type: "string", nullable: true, description: "Standard input passed to the program" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Execution result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    stdout: { type: "string" },
                    stderr: { type: "string" },
                    exitCode: { type: "integer", nullable: true },
                    runtime: { type: "number", nullable: true, description: "Milliseconds" },
                    memory: { type: "number", nullable: true, description: "Kilobytes" },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid JSON, unsupported language, or validation error" },
          "401": { description: "Unauthenticated" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },

    /* ── QUESTIONS ────────────────────────────────────── */
    "/questions": {
      get: {
        tags: ["Questions"],
        summary: "List / filter problems",
        security: [],
        parameters: [
          { name: "difficulty", in: "query", schema: { type: "string", enum: ["Easy", "Medium", "Hard"] } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "tag", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["solved", "attempted", "unsolved"] }, description: "Filter by user solve status (requires auth)" },
        ],
        responses: {
          "200": {
            description: "Paginated question list",
            content: { "application/json": { schema: { allOf: [{ type: "object", properties: { questions: { type: "array", items: { $ref: "#/components/schemas/Question" } } } }, { $ref: "#/components/schemas/Error" }] } } },
          },
        },
      },
    },
    "/questions/categories": {
      get: {
        tags: ["Questions"],
        summary: "Get all question categories",
        security: [],
        responses: {
          "200": { description: "Array of category strings", content: { "application/json": { schema: { type: "object", properties: { categories: { type: "array", items: { type: "string" } } } } } } },
        },
      },
    },
    "/questions/contribute": {
      post: {
        tags: ["Questions"],
        summary: "Submit a community question contribution",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description", "difficulty", "category"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                  category: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Contribution created (pending review)" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── CHALLENGES ──────────────────────────────────── */
    "/challenges": {
      get: {
        tags: ["Challenges"],
        summary: "List frontend / UI challenges",
        parameters: [
          { name: "tech", in: "query", schema: { type: "string" } },
          { name: "difficulty", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "Challenge list" },
        },
      },
    },
    "/challenges/submit": {
      post: {
        tags: ["Challenges"],
        summary: "Submit a frontend challenge solution",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["challengeId", "code"],
                properties: {
                  challengeId: { type: "string", format: "uuid", example: "4569ca41-dcdd-4869-9803-5772e1647f45" },
                  code: { type: "object", description: "Map of filename → file content" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Submission result with pass/fail and AI feedback" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── EXECUTE ─────────────────────────────────────── */
    "/execute": {
      post: {
        tags: ["Execute"],
        summary: "Run code against sample test cases (no submission)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["questionId", "language", "code"],
                properties: {
                  questionId: { type: "string", format: "uuid", example: "4569ca41-dcdd-4869-9803-5772e1647f45" },
                  language: { type: "string", example: "javascript" },
                  code: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Run result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    passed: { type: "integer" },
                    total: { type: "integer" },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          passed: { type: "boolean" },
                          input: { type: "string" },
                          expected: { type: "string" },
                          output: { type: "string" },
                          runtime: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid request or unsupported language" },
          "401": { description: "Unauthenticated" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },

    /* ── SUBMISSIONS ─────────────────────────────────── */
    "/submissions": {
      post: {
        tags: ["Submissions"],
        summary: "Submit code for final judging (all test cases, persisted, awards XP)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["questionId", "language", "code"],
                properties: {
                  questionId: { type: "string", format: "uuid", example: "4569ca41-dcdd-4869-9803-5772e1647f45" },
                  language: { type: "string", example: "python" },
                  code: { type: "string" },
                  contestId: { type: "string", nullable: true, description: "Attach to a contest if present" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Submission verdict",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    submission: { $ref: "#/components/schemas/Submission" },
                    passed: { type: "integer" },
                    total: { type: "integer" },
                    xpAwarded: { type: "integer" },
                    newBadges: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error" },
          "401": { description: "Unauthenticated" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },

    /* ── CONTESTS ────────────────────────────────────── */
    "/contests": {
      get: {
        tags: ["Contests"],
        summary: "List contests",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["upcoming", "active", "ended"] } },
        ],
        responses: {
          "200": { description: "Contest list" },
        },
      },
    },
    "/contests/{slug}/join": {
      post: {
        tags: ["Contests"],
        summary: "Join a contest",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Joined successfully" },
          "404": { description: "Contest not found" },
          "409": { description: "Already joined" },
        },
      },
    },
    "/contests/{slug}/leaderboard": {
      get: {
        tags: ["Contests"],
        summary: "Get contest leaderboard",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Ranked leaderboard entries" },
        },
      },
    },

    /* ── DISCUSSIONS ─────────────────────────────────── */
    "/discussions": {
      get: {
        tags: ["Discussions"],
        summary: "List discussions",
        security: [],
        parameters: [
          { name: "question", in: "query", schema: { type: "string" }, description: "Filter by question ID" },
          { name: "kind", in: "query", schema: { type: "string", enum: ["discussion", "solution", "question", "editorial"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          "200": {
            description: "Paginated discussions",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/Error" },
                    { type: "object", properties: { discussions: { type: "array", items: { $ref: "#/components/schemas/Discussion" } }, total: { type: "integer" }, page: { type: "integer" }, pages: { type: "integer" } } },
                  ],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Discussions"],
        summary: "Create a new discussion thread",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  questionId: { type: "string", format: "uuid", nullable: true, example: "4569ca41-dcdd-4869-9803-5772e1647f45" },
                  kind: { type: "string", enum: ["discussion", "solution", "question", "editorial"], default: "discussion" },
                  tags: { type: "array", items: { type: "string" } },
                  language: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Discussion created" },
          "400": { description: "Missing title or content" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/discussions/{id}": {
      get: {
        tags: ["Discussions"],
        summary: "Get a single discussion with replies",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Discussion with populated author and replies" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        tags: ["Discussions"],
        summary: "Delete a discussion (author or admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Deleted" },
          "403": { description: "Forbidden" },
          "404": { description: "Not found" },
        },
      },
    },
    "/discussions/{id}/vote": {
      post: {
        tags: ["Discussions"],
        summary: "Toggle upvote / downvote on a discussion",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: { type: { type: "string", enum: ["up", "down"] } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated vote counts" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/discussions/{id}/reply": {
      post: {
        tags: ["Discussions"],
        summary: "Add a reply to a discussion",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: { content: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "201": { description: "Reply added" },
          "400": { description: "Empty content" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/discussions/{id}/reply/{replyId}": {
      delete: {
        tags: ["Discussions"],
        summary: "Delete a reply (author or admin only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "replyId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Reply deleted" },
          "403": { description: "Forbidden" },
          "404": { description: "Not found" },
        },
      },
    },
    "/discussions/{id}/ai-summary": {
      post: {
        tags: ["Discussions"],
        summary: "Generate an AI summary for a discussion thread",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "AI summary", content: { "application/json": { schema: { type: "object", properties: { summary: { type: "string" } } } } } },
          "401": { description: "Unauthenticated" },
          "404": { description: "Not found" },
        },
      },
    },

    /* ── BOOKMARKS ───────────────────────────────────── */
    "/bookmarks": {
      get: {
        tags: ["Bookmarks"],
        summary: "Get current user's bookmarks",
        parameters: [
          { name: "kind", in: "query", schema: { type: "string", enum: ["question", "challenge"] } },
          { name: "list", in: "query", schema: { type: "string" }, description: "Filter by list name (e.g. Saved)" },
        ],
        responses: {
          "200": { description: "Bookmark list", content: { "application/json": { schema: { type: "object", properties: { bookmarks: { type: "array", items: { $ref: "#/components/schemas/Bookmark" } } } } } } },
          "401": { description: "Unauthenticated" },
        },
      },
      post: {
        tags: ["Bookmarks"],
        summary: "Add a bookmark",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["kind", "id"],
                properties: {
                  kind: { type: "string", enum: ["question", "challenge"] },
                  id: { type: "string", description: "Question or challenge ID" },
                  list: { type: "string", default: "Saved" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Bookmark created" },
          "200": { description: "Bookmark already exists (idempotent)" },
          "401": { description: "Unauthenticated" },
        },
      },
      delete: {
        tags: ["Bookmarks"],
        summary: "Remove a bookmark",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["kind", "id"],
                properties: {
                  kind: { type: "string", enum: ["question", "challenge"] },
                  id: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Deleted", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── NOTES ───────────────────────────────────────── */
    "/notes": {
      get: {
        tags: ["Notes"],
        summary: "Get current user's notes",
        parameters: [
          { name: "question", in: "query", schema: { type: "string" }, description: "Filter by question ID" },
        ],
        responses: {
          "200": { description: "Notes list", content: { "application/json": { schema: { type: "object", properties: { notes: { type: "array", items: { $ref: "#/components/schemas/Note" } } } } } } },
          "401": { description: "Unauthenticated" },
        },
      },
      post: {
        tags: ["Notes"],
        summary: "Create a note",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string" },
                  questionId: { type: "string", format: "uuid", nullable: true, example: "4569ca41-dcdd-4869-9803-5772e1647f45" },
                  isPrivate: { type: "boolean", default: true },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Note created" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/notes/{id}": {
      patch: {
        tags: ["Notes"],
        summary: "Update a note",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  isPrivate: { type: "boolean" },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated note" },
          "403": { description: "Forbidden (not owner)" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        tags: ["Notes"],
        summary: "Delete a note",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Deleted" },
          "403": { description: "Forbidden" },
        },
      },
    },

    /* ── FOLLOW ──────────────────────────────────────── */
    "/follow": {
      get: {
        tags: ["Follow"],
        summary: "Get feed, followers or following",
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["feed", "followers", "following"] }, description: "Default: feed" },
          { name: "userId", in: "query", schema: { type: "string" }, description: "Required for followers/following of another user" },
        ],
        responses: {
          "200": { description: "List of users or activity items" },
          "401": { description: "Unauthenticated" },
        },
      },
      post: {
        tags: ["Follow"],
        summary: "Follow a user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: { userId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "201": { description: "Now following" },
          "409": { description: "Already following" },
          "401": { description: "Unauthenticated" },
        },
      },
      delete: {
        tags: ["Follow"],
        summary: "Unfollow a user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: { userId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Unfollowed" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── WEAKNESS ────────────────────────────────────── */
    "/weakness": {
      get: {
        tags: ["Weakness"],
        summary: "Analyze acceptance rate per category and get recommendations",
        responses: {
          "200": {
            description: "Weakness analysis",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    analysis: { type: "array", items: { $ref: "#/components/schemas/WeaknessItem" } },
                    weakAreas: { type: "array", items: { $ref: "#/components/schemas/WeaknessItem" } },
                    strongAreas: { type: "array", items: { $ref: "#/components/schemas/WeaknessItem" } },
                    recommendations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string" },
                          reason: { type: "string" },
                          priority: { type: "string", enum: ["high", "medium"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── DAILY PLAN ──────────────────────────────────── */
    "/daily-plan": {
      get: {
        tags: ["Daily Plan"],
        summary: "Get today's personalized 3-problem plan",
        responses: {
          "200": {
            description: "Daily plan",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    plan: {
                      type: "array",
                      maxItems: 3,
                      items: {
                        type: "object",
                        properties: {
                          question: { $ref: "#/components/schemas/Question" },
                          reason: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── REVISION (spaced repetition) ───────────────── */
    "/revision": {
      get: {
        tags: ["Revision"],
        summary: "Get due review cards (SM-2 spaced repetition)",
        responses: {
          "200": {
            description: "Due cards",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cards: { type: "array", items: { $ref: "#/components/schemas/SpacedRepetitionCard" } },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
      post: {
        tags: ["Revision"],
        summary: "Record a review (updates SM-2 interval)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["cardId", "quality"],
                properties: {
                  cardId: { type: "string" },
                  quality: { type: "integer", minimum: 0, maximum: 5, description: "SM-2 quality rating: 0=blackout, 5=perfect recall" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated card with new interval and nextReview date" },
          "401": { description: "Unauthenticated" },
        },
      },
      put: {
        tags: ["Revision"],
        summary: "Add a question to the revision deck (upsert)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["questionId"],
                properties: { questionId: { type: "string", format: "uuid", example: "4569ca41-dcdd-4869-9803-5772e1647f45" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Card added or already exists" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── SEARCH ──────────────────────────────────────── */
    "/search": {
      get: {
        tags: ["Search"],
        summary: "Global search across problems and challenges",
        security: [],
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["all", "questions", "challenges"] }, description: "Default: all" },
        ],
        responses: {
          "200": { description: "Search results", content: { "application/json": { schema: { type: "object", properties: { questions: { type: "array", items: { $ref: "#/components/schemas/Question" } }, challenges: { type: "array" } } } } } },
        },
      },
    },

    /* ── INTERVIEW ───────────────────────────────────── */
    "/interview/questions": {
      get: {
        tags: ["Interview"],
        summary: "Get a queue of mock interview questions",
        parameters: [
          { name: "difficulty", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "count", in: "query", schema: { type: "integer", default: 5 } },
        ],
        responses: {
          "200": { description: "Question queue for mock interview" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── AI ──────────────────────────────────────────── */
    "/ai/chat": {
      post: {
        tags: ["AI"],
        summary: "AI Mentor — get contextual hints, debugging help, complexity analysis",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["questionId", "message"],
                properties: {
                  questionId: { type: "string", format: "uuid", example: "4569ca41-dcdd-4869-9803-5772e1647f45" },
                  message: { type: "string" },
                  code: { type: "string", nullable: true, description: "Current editor code for context" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "AI reply", content: { "application/json": { schema: { type: "object", properties: { reply: { type: "string" } } } } } },
          "401": { description: "Unauthenticated" },
          "429": { description: "Rate limit" },
        },
      },
    },
    "/ai/roadmap": {
      post: {
        tags: ["AI"],
        summary: "AI Roadmap Generator — generate a phased learning roadmap from a career goal",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["goal"],
                properties: { goal: { type: "string", example: "Get a SWE job at a FAANG company in 6 months" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Structured roadmap",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    roadmap: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        estimatedWeeks: { type: "integer" },
                        phases: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              phase: { type: "integer" },
                              title: { type: "string" },
                              weeks: { type: "string" },
                              topics: { type: "array", items: { type: "string" } },
                              resources: { type: "array", items: { type: "string" } },
                              milestone: { type: "string" },
                            },
                          },
                        },
                        dsaTopics: { type: "array", items: { type: "string" } },
                        tips: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/resume": {
      post: {
        tags: ["AI"],
        summary: "AI Resume Analyzer — ATS score and improvement suggestions",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resumeText"],
                properties: {
                  resumeText: { type: "string", description: "Plain text resume content" },
                  targetRole: { type: "string", nullable: true, example: "Senior Software Engineer" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "ATS analysis",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    analysis: {
                      type: "object",
                      properties: {
                        atsScore: { type: "integer", minimum: 0, maximum: 100 },
                        missingKeywords: { type: "array", items: { type: "string" } },
                        suggestions: { type: "array", items: { type: "string" } },
                        strengths: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/project-review": {
      post: {
        tags: ["AI"],
        summary: "AI Project Reviewer — review a GitHub repository",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["repoUrl"],
                properties: {
                  repoUrl: { type: "string", format: "uri", example: "https://github.com/user/repo" },
                  description: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Code quality report with scores per dimension" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/code-review": {
      post: {
        tags: ["AI"],
        summary: "AI Code Reviewer — score code on correctness, readability, performance",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "language"],
                properties: {
                  code: { type: "string" },
                  language: { type: "string" },
                  problemTitle: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Code review scores",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    review: {
                      type: "object",
                      properties: {
                        overallScore: { type: "integer", minimum: 0, maximum: 10 },
                        correctness: { type: "integer" },
                        readability: { type: "integer" },
                        performance: { type: "integer" },
                        bestPractices: { type: "integer" },
                        feedback: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/study-plan": {
      post: {
        tags: ["AI"],
        summary: "AI Study Planner — generate a multi-week study plan",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["goal", "weeks", "hoursPerDay"],
                properties: {
                  goal: { type: "string", example: "Crack a FAANG interview in 8 weeks" },
                  weeks: { type: "integer", minimum: 1, maximum: 24 },
                  hoursPerDay: { type: "number", minimum: 0.5, maximum: 8 },
                  currentLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Weekly study plan with daily tasks" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/pair-program": {
      post: {
        tags: ["AI"],
        summary: "AI Pair Programmer — streaming SSE real-time coding assistant",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: { type: "string" },
                  code: { type: "string", nullable: true },
                  language: { type: "string", nullable: true },
                  history: {
                    type: "array",
                    description: "Prior conversation turns",
                    items: {
                      type: "object",
                      properties: {
                        role: { type: "string", enum: ["user", "assistant"] },
                        content: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Server-Sent Events stream of AI tokens",
            content: { "text/event-stream": { schema: { type: "string", description: "SSE stream. Each data: chunk contains a text delta. data: [DONE] signals completion." } } },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/learning-coach": {
      get: {
        tags: ["AI"],
        summary: "AI Learning Coach — personalized coaching based on solve history",
        responses: {
          "200": {
            description: "Coaching report",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    coaching: {
                      type: "object",
                      properties: {
                        readinessScore: { type: "integer", minimum: 0, maximum: 100 },
                        level: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
                        weeklyGoal: { type: "string" },
                        focusTopics: { type: "array", items: { type: "string" } },
                        strengths: { type: "array", items: { type: "string" } },
                        nextMilestone: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/complexity": {
      post: {
        tags: ["AI"],
        summary: "Complexity Visualizer — time and space complexity breakdown",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "language"],
                properties: {
                  code: { type: "string" },
                  language: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Complexity analysis",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    analysis: {
                      type: "object",
                      properties: {
                        timeComplexity: { type: "string", example: "O(n log n)" },
                        spaceComplexity: { type: "string", example: "O(n)" },
                        explanation: { type: "string" },
                        loopBreakdown: { type: "array", items: { type: "object", properties: { description: { type: "string" }, complexity: { type: "string" } } } },
                        optimizationTips: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/contest-gen": {
      post: {
        tags: ["AI"],
        summary: "AI Contest Generator — generate a custom coding contest",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["theme", "difficulty", "count"],
                properties: {
                  theme: { type: "string", example: "Graph algorithms" },
                  difficulty: { type: "string", enum: ["Easy", "Medium", "Hard", "Mixed"] },
                  count: { type: "integer", minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Generated contest with problems",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    contest: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        problems: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              description: { type: "string" },
                              difficulty: { type: "string" },
                              examples: { type: "array", items: { type: "object" } },
                              hints: { type: "array", items: { type: "string" } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/generate-questions": {
      post: {
        tags: ["AI"],
        summary: "Generate DSA questions from a topic (admin-assisted or user-facing)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["topic"],
                properties: {
                  topic: { type: "string" },
                  difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                  count: { type: "integer", default: 3 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Generated questions array" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/ai/interview-feedback": {
      post: {
        tags: ["AI"],
        summary: "Get AI feedback on a mock interview performance",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["questionId", "code", "language", "timeTakenSeconds"],
                properties: {
                  questionId: { type: "string", format: "uuid", example: "4569ca41-dcdd-4869-9803-5772e1647f45" },
                  code: { type: "string" },
                  language: { type: "string" },
                  timeTakenSeconds: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Interview performance feedback" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    "/ai/history": {
      get: {
        tags: ["AI"],
        summary: "List saved AI tool runs for the current user",
        parameters: [
          { name: "tool", in: "query", schema: { type: "string" }, description: "Filter by tool key (e.g. resume, roadmap, code-review)" },
        ],
        responses: {
          "200": { description: "Saved runs", content: { "application/json": { schema: { type: "object", properties: { runs: { type: "array", items: { type: "object", properties: { _id: { type: "string", format: "uuid", description: "Supabase uuid (or legacy Mongo ObjectId during transition)" }, tool: { type: "string" }, title: { type: "string" }, input: {}, result: {}, createdAt: { type: "string", format: "date-time" } } } } } } } } },
          "401": { description: "Unauthenticated" },
        },
      },
      post: {
        tags: ["AI"],
        summary: "Save or update an AI tool run (upsert by id)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tool", "result"],
                properties: {
                  tool: { type: "string", description: "Tool key" },
                  title: { type: "string", default: "Untitled" },
                  input: { description: "Arbitrary tool input payload" },
                  result: { description: "Arbitrary tool result payload" },
                  id: { type: "string", nullable: true, description: "Existing run id to update; omit to create" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Run saved" },
          "400": { description: "Missing tool or result" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── BILLING ─────────────────────────────────────── */
    "/billing/usage": {
      get: {
        tags: ["Billing"],
        summary: "Get AI credit usage and subscription history",
        responses: {
          "200": {
            description: "Usage and payment history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    plan: { type: "string", enum: ["free", "go", "plus"] },
                    usage: {
                      type: "object",
                      properties: {
                        period: { type: "string", example: "2026-06", description: "YYYY-MM" },
                        used: { type: "integer" },
                        allowance: { type: "integer", nullable: true, description: "null for unlimited" },
                        remaining: { type: "integer", nullable: true },
                        unlimited: { type: "boolean" },
                      },
                    },
                    history: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          plan: { type: "string" },
                          billingCycle: { type: "string" },
                          amount: { type: "number" },
                          currency: { type: "string" },
                          periodStart: { type: "string", format: "date-time", nullable: true },
                          periodEnd: { type: "string", format: "date-time", nullable: true },
                          paymentId: { type: "string", nullable: true },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/billing/invoice/{id}": {
      get: {
        tags: ["Billing"],
        summary: "Download a printable HTML invoice for a paid subscription",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Subscription id" }],
        responses: {
          "200": { description: "HTML invoice document", content: { "text/html": { schema: { type: "string" } } } },
          "400": { description: "Invalid invoice id" },
          "401": { description: "Unauthenticated" },
          "404": { description: "Invoice not found or not owned by user" },
        },
      },
    },

    /* ── SUBSCRIPTION ────────────────────────────────── */
    "/subscription/create-order": {
      post: {
        tags: ["Subscription"],
        summary: "Create a Razorpay order for a plan upgrade",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["plan", "cycle"],
                properties: {
                  plan: { type: "string", enum: ["go", "plus"] },
                  cycle: { type: "string", enum: ["monthly", "yearly"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Razorpay order created", content: { "application/json": { schema: { type: "object", properties: { orderId: { type: "string" }, amount: { type: "number" }, currency: { type: "string" }, keyId: { type: "string" } } } } } },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/subscription/create-subscription": {
      post: {
        tags: ["Subscription"],
        summary: "Create a recurring Razorpay subscription (auto-pay)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["plan", "cycle"],
                properties: {
                  plan: { type: "string", enum: ["go", "plus"] },
                  cycle: { type: "string", enum: ["monthly", "yearly"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Subscription created", content: { "application/json": { schema: { type: "object", properties: { subscriptionId: { type: "string" }, key: { type: "string" }, plan: { type: "string" }, cycle: { type: "string" } } } } } },
          "401": { description: "Unauthenticated" },
          "429": { description: "Rate limited" },
          "503": { description: "Payments not configured" },
        },
      },
    },
    "/subscription/webhook": {
      post: {
        tags: ["Subscription"],
        summary: "Razorpay webhook (signature-verified, no session). Handles subscription.charged, activated, cancelled, halted, completed and payment.failed.",
        security: [],
        responses: {
          "200": { description: "Acknowledged (also returned for duplicate deliveries)" },
          "400": { description: "Invalid signature or body" },
          "500": { description: "Handler error (Razorpay will retry)" },
        },
      },
    },
    "/subscription/verify": {
      post: {
        tags: ["Subscription"],
        summary: "Verify a Razorpay payment and activate the plan",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["razorpayOrderId", "razorpayPaymentId", "razorpaySignature"],
                properties: {
                  razorpayOrderId: { type: "string" },
                  razorpayPaymentId: { type: "string" },
                  razorpaySignature: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Payment verified, plan activated" },
          "400": { description: "Signature verification failed" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/subscription/start-trial": {
      post: {
        tags: ["Subscription"],
        summary: "Start a free trial",
        responses: {
          "200": { description: "Trial started" },
          "401": { description: "Unauthenticated" },
          "409": { description: "Trial already used" },
        },
      },
    },
    "/coupons/validate": {
      post: {
        tags: ["Coupons"],
        summary: "Preview a coupon's discount for a plan + cycle (does not redeem)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "plan", "cycle"],
                properties: {
                  code: { type: "string" },
                  plan: { type: "string", enum: ["go", "plus"] },
                  cycle: { type: "string", enum: ["monthly", "yearly"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Valid coupon", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, code: { type: "string" }, discount: { type: "number" }, finalAmount: { type: "number" } } } } } },
          "422": { description: "Invalid/expired/ineligible coupon", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, reason: { type: "string" } } } } } },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/careers/apply": {
      post: {
        tags: ["Careers"],
        summary: "Apply for an open role",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role", "name", "email", "message"],
                properties: {
                  role: { type: "string", description: "Career slug" },
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string", nullable: true },
                  link: { type: "string", format: "uri", nullable: true },
                  message: { type: "string", minLength: 20 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Application received (confirmation emailed)" },
          "400": { description: "Validation error" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/admin/careers": {
      get: {
        tags: ["Admin"],
        summary: "List job applications (admin)",
        parameters: [
          { name: "role", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "new", "reviewing", "shortlisted", "rejected"] } },
        ],
        responses: { "200": { description: "Applications + status counts" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/careers/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update an application's status (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["new", "reviewing", "shortlisted", "rejected"] } } } } } },
        responses: { "200": { description: "Updated" }, "403": { description: "Admin only" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete an application (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Admin only" } },
      },
    },
    "/account": {
      delete: {
        tags: ["Account"],
        summary: "Permanently delete the signed-in user's account and all their data",
        responses: {
          "200": { description: "Account deleted (client should sign out)" },
          "401": { description: "Unauthenticated" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/subscription/cancel": {
      post: {
        tags: ["Subscription"],
        summary: "Cancel the current subscription",
        responses: {
          "200": { description: "Subscription cancelled" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    /* ── ADMIN ───────────────────────────────────────── */
    "/admin/settings": {
      get: {
        tags: ["Admin"],
        summary: "Get site configuration (admin)",
        responses: { "200": { description: "Current site config" }, "403": { description: "Admin only" } },
      },
      put: {
        tags: ["Admin"],
        summary: "Update site configuration (admin)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Settings saved" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/settings/test": {
      post: {
        tags: ["Admin"],
        summary: "Test a service connection — SMTP, Groq, Supabase, Redis, Judge0, Piston, Paiza, Razorpay (admin)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["service"], properties: { service: { type: "string", example: "smtp" } } } } },
        },
        responses: { "200": { description: "Connection test result" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/questions": {
      get: {
        tags: ["Admin"],
        summary: "List all questions (admin)",
        responses: {
          "200": { description: "All questions with draft status" },
          "403": { description: "Admin only" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a new question (admin)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          "201": { description: "Question created" },
          "403": { description: "Admin only" },
        },
      },
    },
    "/admin/questions/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update a question (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Updated" }, "403": { description: "Admin only" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a question (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/questions/bulk": {
      post: {
        tags: ["Admin"],
        summary: "Bulk import questions from JSON array (admin)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { questions: { type: "array", items: { type: "object" } } } } } },
        },
        responses: { "200": { description: "Import results" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/questions/generate": {
      post: {
        tags: ["Admin"],
        summary: "AI-generate and auto-save questions (admin)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { topic: { type: "string" }, count: { type: "integer" }, difficulty: { type: "string" } } } } } },
        responses: { "200": { description: "Generated and saved" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/questions/export": {
      get: {
        tags: ["Admin"],
        summary: "Export all questions as JSON (admin)",
        responses: { "200": { description: "JSON file download" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List all users with stats (admin)",
        responses: { "200": { description: "User list" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/users/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update user role or status (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { role: { type: "string", enum: ["user", "admin"] } } } } } },
        responses: { "200": { description: "Updated" }, "403": { description: "Admin only" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Permanently delete a user and their owned data (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "User and owned data deleted" },
          "400": { description: "Invalid id or attempting to delete self" },
          "403": { description: "Admin only" },
          "404": { description: "Not found" },
        },
      },
    },
    "/admin/challenges": {
      get: { tags: ["Admin"], summary: "List all challenges (admin)", responses: { "200": { description: "Challenge list" }, "403": { description: "Admin only" } } },
      post: { tags: ["Admin"], summary: "Create a challenge (admin)", requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "201": { description: "Created" }, "403": { description: "Admin only" } } },
    },
    "/admin/challenges/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update a challenge (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Updated" }, "403": { description: "Admin only" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a challenge (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/contests": {
      get: { tags: ["Admin"], summary: "List all contests (admin)", responses: { "200": { description: "Contests" }, "403": { description: "Admin only" } } },
      post: { tags: ["Admin"], summary: "Create a contest (admin)", requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "201": { description: "Created" }, "403": { description: "Admin only" } } },
    },
    "/admin/contests/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update a contest (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Updated" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/submissions": {
      get: { tags: ["Admin"], summary: "List all submissions (admin)", responses: { "200": { description: "Submission list" }, "403": { description: "Admin only" } } },
    },
    "/admin/feedback": {
      get: {
        tags: ["Admin"],
        summary: "List feedback submissions (admin)",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "new", "read", "resolved"] } },
          { name: "type", in: "query", schema: { type: "string", enum: ["all", "feature", "bug", "issue"] } },
        ],
        responses: { "200": { description: "Feedback items + status counts" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/feedback/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update feedback status (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["new", "read", "resolved"] } } } } } },
        responses: { "200": { description: "Updated" }, "403": { description: "Admin only" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete feedback (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/analytics": {
      get: { tags: ["Admin"], summary: "Platform-wide analytics (admin)", responses: { "200": { description: "Aggregated stats" }, "403": { description: "Admin only" } } },
    },
    "/admin/billing": {
      get: {
        tags: ["Admin"],
        summary: "All users' plan, AI credit usage and payment totals (admin)",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search name, email or username" },
          { name: "plan", in: "query", schema: { type: "string", enum: ["all", "free", "go", "plus"] } },
        ],
        responses: {
          "200": { description: "Per-user billing rows + platform revenue/usage summary" },
          "403": { description: "Admin only" },
        },
      },
    },
    "/admin/prompts": {
      get: { tags: ["Admin"], summary: "List AI prompt templates (admin)", responses: { "200": { description: "Prompt templates" }, "403": { description: "Admin only" } } },
    },
    "/blog/cover/{slug}": {
      get: {
        tags: ["Blog"],
        summary: "Get a blog post's cover image",
        security: [],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Image binary", content: { "image/*": { schema: { type: "string", format: "binary" } } } },
          "404": { description: "Not found" },
        },
      },
    },
    "/admin/blog": {
      get: { tags: ["Admin"], summary: "List blog posts (admin)", responses: { "200": { description: "Posts" }, "403": { description: "Admin only" } } },
      post: {
        tags: ["Admin"],
        summary: "Create a blog post (admin)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["title", "coverImage"], properties: { title: { type: "string" }, description: { type: "string" }, content: { type: "string" }, tags: { type: "array", items: { type: "string" } }, seoTitle: { type: "string" }, seoDescription: { type: "string" }, seoKeywords: { type: "string" }, coverImage: { type: "string", description: "data:image/...;base64,..." }, status: { type: "string", enum: ["draft", "published"] } } } } },
        },
        responses: { "201": { description: "Created" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/blog/generate": {
      post: {
        tags: ["Admin"],
        summary: "Generate a draft blog post from a feature screenshot (vision AI, admin)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["image"], properties: { image: { type: "string", description: "data:image/...;base64,..." }, hint: { type: "string" } } } } },
        },
        responses: { "200": { description: "Generated title, description, tags, content and SEO" }, "403": { description: "Admin only" }, "503": { description: "AI not configured" } },
      },
    },
    "/admin/blog/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update a blog post (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Updated" }, "403": { description: "Admin only" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a blog post (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/coupons": {
      get: {
        tags: ["Admin"],
        summary: "List coupons (admin)",
        responses: { "200": { description: "Coupon list" }, "403": { description: "Admin only" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a coupon (admin)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "type", "value"],
                properties: {
                  code: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string", enum: ["percent", "flat"] },
                  value: { type: "number", description: "Percent (0–100) or flat rupees" },
                  minAmount: { type: "number" },
                  maxRedemptions: { type: "integer", description: "-1 = unlimited" },
                  oncePerUser: { type: "boolean" },
                  plans: { type: "array", items: { type: "string", enum: ["go", "plus"] } },
                  expiresAt: { type: "string", format: "date", nullable: true },
                  active: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" }, "409": { description: "Code already exists" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/coupons/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update a coupon (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Updated" }, "403": { description: "Admin only" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a coupon (admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/features": {
      get: {
        tags: ["Admin"],
        summary: "Get the feature catalog + current access matrix (admin)",
        responses: {
          "200": { description: "Catalog and resolved access map (featureId -> minimum plan)" },
          "403": { description: "Admin only" },
        },
      },
      put: {
        tags: ["Admin"],
        summary: "Save the minimum plan per feature; drives pricing + locks (admin)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { access: { type: "object", additionalProperties: { type: "string", enum: ["free", "go", "plus"] } } } } } },
        },
        responses: { "200": { description: "Saved; feature-access cache revalidated" }, "403": { description: "Admin only" } },
      },
    },
  },
};
