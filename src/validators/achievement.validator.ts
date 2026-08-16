import { z } from 'zod'

export const getFeedQuerySchema = z.object({
  limit: z.string().optional().transform(Number).default('20'),
  offset: z.string().optional().transform(Number).default('0'),
})

export type GetFeedQuery = z.infer<typeof getFeedQuerySchema>