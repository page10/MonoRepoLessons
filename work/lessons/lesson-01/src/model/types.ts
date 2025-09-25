import { z } from "zod";

export type UUID = string;
export type Priority = 0 | 1 | 2 | 3;
export type Status = "open" | "done" | "archived" | "deleted";

export interface Subtask {
  id: UUID;
  title: string;
  status: Status;
  order: number;
}

export interface Recurrence {
  rule: "daily" | "weekly" | "monthly" | "custom";
  interval?: number;
  byWeekday?: number[];
  byMonthDay?: number[];
  until?: string;
}

export interface TodoItem {
  id: UUID;
  title: string;
  description?: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  due?: string;
  deferUntil?: string;
  priority: Priority;
  tags: string[];
  listId?: UUID;
  subtasks?: Subtask[];
  recurrence?: Recurrence;
  estimateMinutes?: number;
  links?: string[];
  metadata?: Record<string, string | number | boolean>;
}

export interface List {
  id: UUID;
  name: string;
  color?: string;
  order: number;
  archived?: boolean;
}

export interface AppState {
  todos: Record<UUID, TodoItem>;
  lists: Record<UUID, List>;
  order: UUID[];
  version: number;
}