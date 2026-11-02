import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * OpenAPI 3.1 description of Setups Works Lab's public/applicant-facing API.
 * Rendered interactively at /api-docs (Swagger UI). Most endpoints require a
 * logged-in session cookie (NextAuth); admin endpoints require an admin role.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const spec = {
    openapi: "3.1.0",
    info: {
      title: `${APP_NAME} API`,
      version: APP_VERSION,
      description:
        "Public and member-facing endpoints for Setups Works Lab. Authentication uses the NextAuth session cookie set on sign-in; there is no separate API key. Admin endpoints additionally require an admin account.",
      contact: { name: "Setups Works Lab", email: "info@setups.works", url: "https://labs.setups.works" },
    },
    servers: [{ url: "https://labs.setups.works", description: "Production" }],
    tags: [
      { name: "Careers", description: "Job listings and applications" },
      { name: "QA", description: "QA contributor program and bug reports" },
      { name: "Feedback", description: "Product feedback" },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "__Secure-next-auth.session-token",
          description: "NextAuth session cookie, set automatically after sign-in.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string", example: "Authentication required" } },
        },
        Ok: {
          type: "object",
          properties: { ok: { type: "boolean", example: true } },
        },
        JobApplication: {
          type: "object",
          required: ["role", "name", "email", "phone", "location", "experience"],
          properties: {
            role: { type: "string", example: "qa-testing", description: "Role slug" },
            name: { type: "string", minLength: 2, maxLength: 100 },
            email: { type: "string", format: "email" },
            phone: { type: "string", minLength: 5, maxLength: 30 },
            location: { type: "string", example: "Chennai, India" },
            experience: { type: "string", example: "1–3 years" },
            linkedin: { type: "string", format: "uri" },
            github: { type: "string", format: "uri" },
            portfolio: { type: "string", format: "uri" },
            company: { type: "string" },
            resumeUrl: { type: "string", format: "uri", description: "URL returned by /api/careers/upload" },
            resumeName: { type: "string" },
            message: { type: "string", maxLength: 4000 },
          },
        },
        QaApplication: {
          type: "object",
          required: ["motivation"],
          properties: {
            motivation: { type: "string", minLength: 20, maxLength: 2000 },
            focusAreas: { type: "array", items: { type: "string" }, example: ["Compiler", "AI Tools"] },
            experience: { type: "string", maxLength: 2000 },
            github: { type: "string", format: "uri" },
          },
        },
        BugReport: {
          type: "object",
          required: ["title", "steps"],
          properties: {
            title: { type: "string", minLength: 5, maxLength: 160 },
            area: { type: "string", example: "Compiler" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"], default: "medium" },
            steps: { type: "string", minLength: 10, maxLength: 4000 },
            expected: { type: "string", maxLength: 2000 },
            actual: { type: "string", maxLength: 2000 },
            environment: { type: "string", example: "Chrome 149, macOS" },
            url: { type: "string", format: "uri" },
            screenshotUrl: { type: "string", format: "uri" },
          },
        },
        Feedback: {
          type: "object",
          required: ["type", "title", "description"],
          properties: {
            type: { type: "string", enum: ["feature", "bug", "issue"] },
            title: { type: "string" },
            description: { type: "string", minLength: 10 },
            email: { type: "string", format: "email" },
          },
        },
      },
    },
    paths: {
      "/api/careers/apply": {
        post: {
          tags: ["Careers"],
          summary: "Submit a job application",
          description: "Stores an application, emails the team, and sends the applicant a confirmation. Rate-limited.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/JobApplication" } } },
          },
          responses: {
            200: { description: "Application received", content: { "application/json": { schema: { $ref: "#/components/schemas/Ok" } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/careers/upload": {
        post: {
          tags: ["Careers"],
          summary: "Upload a résumé",
          description: "Multipart upload (field `file`, PDF/DOC up to 4 MB). Returns a public Blob URL to pass as `resumeUrl` on /api/careers/apply.",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] },
              },
            },
          },
          responses: {
            200: {
              description: "Uploaded",
              content: { "application/json": { schema: { type: "object", properties: { url: { type: "string", format: "uri" }, name: { type: "string" } } } } },
            },
            413: { description: "File too large (>4 MB)" },
            415: { description: "Unsupported file type" },
            503: { description: "Upload not configured" },
          },
        },
      },
      "/api/qa/apply": {
        post: {
          tags: ["QA"],
          summary: "Apply to the QA contributor program",
          security: [{ sessionCookie: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/QaApplication" } } } },
          responses: {
            200: { description: "Application submitted (status: pending)" },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            409: { description: "Already applied" },
          },
        },
      },
      "/api/qa/me": {
        get: {
          tags: ["QA"],
          summary: "Get my QA status and reported bugs",
          security: [{ sessionCookie: [] }],
          responses: {
            200: {
              description: "Membership status + bugs",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      contributor: { type: "object", nullable: true, properties: { status: { type: "string", enum: ["pending", "approved", "rejected"] } } },
                      bugs: { type: "array", items: { type: "object" } },
                    },
                  },
                },
              },
            },
            401: { description: "Not authenticated" },
          },
        },
      },
      "/api/qa/bugs": {
        post: {
          tags: ["QA"],
          summary: "Report a bug",
          description: "Requires an approved QA contributor session.",
          security: [{ sessionCookie: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BugReport" } } } },
          responses: {
            200: { description: "Bug created", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, id: { type: "string" } } } } } },
            403: { description: "Not an approved QA contributor" },
          },
        },
      },
      "/api/feedback": {
        post: {
          tags: ["Feedback"],
          summary: "Send product feedback",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Feedback" } } } },
          responses: {
            200: { description: "Feedback recorded" },
            400: { description: "Validation error" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
