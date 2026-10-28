import { z } from 'zod';

/** MongoDB ObjectId as 24-character hex string */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/, 'Invalid ObjectId format');

/** UUID v4 string */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');
