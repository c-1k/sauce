import { z } from "zod";

export const CieloConfigSchema = z.object({
	workers: z.number().min(1).default(2),
	baseBranch: z.string().default("main"),
	stagingBranch: z.string().default("staging"),
	coordDir: z.string().default(".coord"),
});

export type CieloConfig = z.infer<typeof CieloConfigSchema>;

export const DEFAULT_CONFIG: CieloConfig = {
	workers: 2,
	baseBranch: "main",
	stagingBranch: "staging",
	coordDir: ".coord",
};
