import rateLimit from "express-rate-limit";

// The public Lead Form intake endpoint has no auth by design (TDD §17) — a
// rate limiter is the actual first line of defense against abuse, alongside
// input validation. 20 requests per 15 minutes per IP is generous for a
// human filling out a form, tight for a script.
export const publicLeadIntakeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
