import { z } from "zod";

export const TurfConfigSchema = z.object({
	workers: z.number().min(1).default(2),
	baseBranch: z.string().default("main"),
	stagingBranch: z.string().default("staging"),
	coordDir: z.string().default(".coord"),
});

export type TurfConfig = z.infer<typeof TurfConfigSchema>;

export const DEFAULT_CONFIG: TurfConfig = {
	workers: 2,
	baseBranch: "main",
	stagingBranch: "staging",
	coordDir: ".coord",
};
