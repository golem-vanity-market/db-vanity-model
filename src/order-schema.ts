import z from "zod";

export const ProblemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("leading-any"),
    length: z.number().min(8).max(40),
  }),
  z.object({
    type: z.literal("trailing-any"),
    length: z.number().min(8).max(40),
  }),
  z.object({
    type: z.literal("letters-heavy"),
    count: z.number().min(32).max(40),
  }),
  z.object({
    type: z.literal("numbers-heavy"),
  }),
  z.object({
    type: z.literal("snake-score-no-case"),
    count: z.number().min(15).max(39),
  }),
  z.object({
    type: z.literal("user-prefix"),
    specifier: z
      .string()
      .min(8)
      .max(42)
      .startsWith("0x")
      .regex(/^0x[0-9a-f]+$/i),
  }),
  z.object({
    type: z.literal("user-suffix"),
    specifier: z
      .string()
      .min(6)
      .max(40)
      .regex(/^[0-9a-f]+$/i),
  }),
  z.object({
    type: z.literal("user-mask"),
    specifier: z.string().length(42).startsWith("0x"),
  }),
]);

export const VanityRequestSchema = z.object({
  publicKey: z.union([
    z.string().startsWith("0x").length(132),
    z.string().startsWith("xpub"),
  ]),
  problems: z.array(ProblemSchema).refine((value) => value.length > 0, {
    message: "You have to select at least one item.",
  }),
  duration: z.enum(["5m", "15m", "30m", "1h", "4h", "12h", "24h"]),
});

export const VanityOrderSchema = z.object({
  requestId: z.string(),
  status: z.enum(["queue", "processing", "completed"]),
  created: z.iso.datetime(),
  duration: z.number(),
  valid: z.iso.datetime().nullable(),
  started: z.iso.datetime().nullable(),
  completed: z.iso.datetime().nullable(),
  pubKey: z.union([
    z.string().startsWith("0x").length(132),
    z.string().startsWith("xpub"),
  ]),
  budget: z.number(),
  cost: z.number(),
  work: z.number(),
  problems: z.array(ProblemSchema),
});

export const VanityOrderResultSchema = z.object({
  orderId: z.string(),
  provider: z.object({
    id: z.string().startsWith("0x").length(42),
    name: z.string(),
    walletAddress: z.string().startsWith("0x").length(42),
  }),
  proof: z.object({
    address: z.string().startsWith("0x").length(42),
    pubKey: z.union([
      z.string().startsWith("0x").length(132),
      z.string().startsWith("xpub"),
    ]),
    salt: z.string(),
  }),
});

export type VanityOrderResult = z.infer<typeof VanityOrderResultSchema>;

export type Problem = z.infer<typeof ProblemSchema>;
export type ProblemId = Problem["type"];

export const VanityRequestWithTimestampSchema = VanityRequestSchema.extend({
  timestamp: z.iso.datetime(),
});

export type VanityRequestWithTimestamp = z.infer<
  typeof VanityRequestWithTimestampSchema
>;
