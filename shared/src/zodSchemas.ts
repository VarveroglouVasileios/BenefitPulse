import { z } from "zod";

export const ageRangeSchema = z.enum([
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
]);
export const incomeRangeSchema = z.enum([
  "<10k",
  "10-20k",
  "20-30k",
  "30-40k",
  "40-50k",
  "50k+",
]);
export const regionSchema = z.enum([
  "attiki",
  "thessaloniki",
  "crete",
  "peloponnese",
  "macedonia",
  "thrace",
  "epirus",
  "thessaly",
  "central_greece",
  "western_greece",
  "aegean_islands",
  "ionian_islands",
  "other",
]);

export const employmentStatusSchema = z.enum([
  "unemployed",
  "employed",
  "selfEmployed",
  "pensioner",
  "other",
]);

// ASEP Qualifications schemas
export const educationLevelSchema = z.enum(["ΠΕ", "ΤΕ", "ΔΕ", "ΥΕ"]);
export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const userDegreeSchema = z.object({
  level: educationLevelSchema,
  fieldCategory: z.string().optional(),
  degreeTitleFreeText: z.string().optional(),
  institution: z.string().optional(),
  graduationYear: z.number().int().min(1950).max(2100).optional(),
  isForeignDegree: z.boolean().optional(),
  doatapRecognized: z.boolean().optional(),
});

export const userLanguageSchema = z.object({
  language: z.string().min(2).max(10), // "EN", "FR", "DE", etc.
  cefrLevel: cefrLevelSchema,
});

export const userITSkillsSchema = z.object({
  hasBasicIT: z.boolean(),
  certs: z.array(z.string()).optional(),
});

export const userProfileSchema = z.object({
  ageRange: ageRangeSchema.optional(),
  incomeRange: incomeRangeSchema.optional(),
  employmentStatus: employmentStatusSchema.optional(),
  isStudent: z.boolean().optional(),
  region: regionSchema.optional(),
  // ASEP Qualifications (NEW)
  highestEducationLevel: educationLevelSchema.optional(),
  degrees: z.array(userDegreeSchema).optional(),
  languages: z.array(userLanguageSchema).optional(),
  itSkills: userITSkillsSchema.optional(),
  licenses: z.array(z.string()).optional(),
});

export const opportunityTypeSchema = z.enum([
  "subsidy",
  "voucher",
  "program",
  "public_call",
  "asep_competition",
  "manual",
]);

export const opportunityKindSchema = z.enum([
  "benefit",
  "voucher_pass",
  "service_info",
  // legacy kinds
  "program",
  "voucher",
  "service_page",
  "garbage",
]);

export const opportunitySchema = z.object({
  type: opportunityTypeSchema,
  kind: opportunityKindSchema.optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  officialUrl: z.string().url(),
  source: z.string().min(1),
  publishedAt: z.date(),
  deadlineAt: z.date().optional(),
  tags: z.array(z.string()).default([]),
  region: regionSchema.optional(),
  criteriaJson: z.record(z.any()),
  criteriaRulesJson: z.record(z.any()),
  criteriaUnknown: z.boolean().optional(),
  confidence: z.number().min(0).max(1),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const eventDataSchema = z.object({
  type: z.enum([
    "pageview",
    "opportunity_view",
    "official_click",
    "bookmark_add",
    "bookmark_remove",
  ]),
  path: z.string().optional(),
  opportunityId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  data: z.any().optional(),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .email("Μη έγκυρο email")
      .min(1, "Το email είναι υποχρεωτικό"),
    password: z
      .string()
      .min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες")
      .regex(
        /[A-Z]/,
        "Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα κεφαλαίο γράμμα"
      )
      .regex(
        /[a-z]/,
        "Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα πεζό γράμμα"
      )
      .regex(/[0-9]/, "Ο κωδικός πρέπει να περιέχει τουλάχιστον έναν αριθμό"),
    passwordConfirm: z
      .string()
      .min(1, "Η επιβεβαίωση κωδικού είναι υποχρεωτική"),
    firstName: z
      .string()
      .min(2, "Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες")
      .max(50, "Το όνομα δεν μπορεί να υπερβαίνει τους 50 χαρακτήρες")
      .regex(
        /^[Α-Ωα-ωΆ-Ώά-ώA-Za-z\s]+$/,
        "Το όνομα μπορεί να περιέχει μόνο γράμματα"
      ),
    lastName: z
      .string()
      .min(2, "Το επώνυμο πρέπει να έχει τουλάχιστον 2 χαρακτήρες")
      .max(50, "Το επώνυμο δεν μπορεί να υπερβαίνει τους 50 χαρακτήρες")
      .regex(
        /^[Α-Ωα-ωΆ-Ώά-ώA-Za-z\s]+$/,
        "Το επώνυμο μπορεί να περιέχει μόνο γράμματα"
      ),
    acceptTerms: z.boolean().refine((val: boolean) => val === true, {
      message: "Πρέπει να αποδεχτείτε τους όρους χρήσης",
    }),
  })
  .refine((data: any) => data.password === data.passwordConfirm, {
    message: "Οι κωδικοί δεν ταιριάζουν",
    path: ["passwordConfirm"],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .email("Μη έγκυρο email")
    .min(1, "Το email είναι υποχρεωτικό"),
  password: z.string().min(1, "Ο κωδικός είναι υποχρεωτικός"),
});
