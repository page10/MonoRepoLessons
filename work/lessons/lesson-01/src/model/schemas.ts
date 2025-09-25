import { z } from "zod";

export const SubtaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  status: z.enum(["open", "done", "archived", "deleted"]),
  order: z.number().int().nonnegative(),
});

export const RecurrenceSchema = z.object({
  rule: z.enum(["daily", "weekly", "monthly", "custom"]),
  interval: z.number().int().positive().optional(),
  byWeekday: z.array(z.number().int().min(0).max(6)).optional(),
  byMonthDay: z.array(z.number().int().min(1).max(31)).optional(),
  until: z.string().optional(),
});

export const TodoItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(20000).optional(),
  status: z.enum(["open", "done", "archived", "deleted"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  due: z.string().optional(),
  deferUntil: z.string().optional(),
  priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  tags: z.array(z.string().max(24).regex(/^[a-z0-9\-_]+$/)),
  listId: z.string().uuid().optional(),
  subtasks: z.array(SubtaskSchema).optional(),
  recurrence: RecurrenceSchema.optional(),
  estimateMinutes: z.number().int().positive().optional(),
  links: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const ListSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  color: z.string().optional(),
  order: z.number().int().nonnegative(),
  archived: z.boolean().optional(),
});

export const AppStateSchema = z.object({
  todos: z.record(z.string(), TodoItemSchema),
  lists: z.record(z.string(), ListSchema),
  order: z.array(z.string().uuid()),
  version: z.number().int(),
});