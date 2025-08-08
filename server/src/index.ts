import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import { 
  createTaskInputSchema, 
  updateTaskInputSchema, 
  moveTaskInputSchema,
  reorderTasksInputSchema 
} from './schema';

// Import handlers
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { getTaskById } from './handlers/get_task_by_id';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { moveTask } from './handlers/move_task';
import { reorderTasks } from './handlers/reorder_tasks';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Task management endpoints
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),

  getTasks: publicProcedure
    .query(() => getTasks()),

  getTaskById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTaskById(input)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  deleteTask: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteTask(input)),

  // Drag and drop functionality
  moveTask: publicProcedure
    .input(moveTaskInputSchema)
    .mutation(({ input }) => moveTask(input)),

  reorderTasks: publicProcedure
    .input(reorderTasksInputSchema)
    .mutation(({ input }) => reorderTasks(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();