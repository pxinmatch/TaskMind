import type { Task } from "@/lib/task-parser";

/** Shape of a Prisma Task row (subset we care about). */
interface DbTask {
  id: string;
  title: string;
  due: Date | null;
  priority: string;
  tags: string;
  repeat: string;
  done: boolean;
  createdAt: Date;
}

/** Convert a DB row into the client-side Task DTO. */
export function serializeTask(t: DbTask): Task {
  return {
    id: t.id,
    title: t.title,
    dueISO: t.due ? t.due.toISOString() : null,
    priority: t.priority as Task["priority"],
    tags: t.tags ? t.tags.split(",").filter(Boolean) : [],
    repeat: t.repeat as Task["repeat"],
    done: t.done,
    createdAt: t.createdAt.getTime(),
  };
}
