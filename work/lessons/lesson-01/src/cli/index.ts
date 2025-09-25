import { JsonDriver } from "../storage/JsonDriver";
import { v4 as uuidv4 } from "uuid";
import { AppState, TodoItem } from "../model/types";
import { TodoItemSchema } from "../model/schemas";
import path from "path";

const DB_PATH = path.join(process.env.HOME || process.env.USERPROFILE || ".", ".todo-tui-db.json");
const driver = new JsonDriver(DB_PATH);

async function loadState(): Promise<AppState> {
  try {
    return await driver.load();
  } catch {
    // If DB doesn't exist, initialize
    return { todos: {}, lists: {}, order: [], version: 1 };
  }
}

async function saveState(state: AppState) {
  await driver.save(state);
}

function printTodo(todo: TodoItem) {
  console.log(`[${todo.id}] ${todo.title} (${todo.status})${todo.due ? " due:" + todo.due : ""}`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const state = await loadState();

  switch (cmd) {
    case "add": {
      const [title, ...opts] = args;
      if (!title) {
        console.error("Usage: add <title> [options]");
        process.exit(1);
      }
      const id = uuidv4();
      const now = new Date().toISOString();
      const todo: TodoItem = {
        id,
        title,
        status: "open",
        createdAt: now,
        updatedAt: now,
        priority: 0,
        tags: [],
      };
      // Optionally parse --due, --priority, --tags, etc.
      TodoItemSchema.parse(todo); // Validate
      state.todos[id] = todo;
      state.order.push(id);
      await saveState(state);
      console.log("Added:", todo.title);
      break;
    }
    case "list": {
      // Optionally filter by status, tag, etc.
      const todos = Object.values(state.todos);
      if (todos.length === 0) {
        console.log("No todos.");
        break;
      }
      for (const todo of todos) {
        printTodo(todo);
      }
      break;
    }
    case "complete": {
      const [id] = args;
      if (!id || !state.todos[id]) {
        console.error("Usage: complete <id>");
        process.exit(1);
      }
      state.todos[id].status = "done";
      state.todos[id].completedAt = new Date().toISOString();
      state.todos[id].updatedAt = new Date().toISOString();
      await saveState(state);
      console.log("Completed:", state.todos[id].title);
      break;
    }
    case "remove": {
      const [id] = args;
      if (!id || !state.todos[id]) {
        console.error("Usage: remove <id>");
        process.exit(1);
      }
      delete state.todos[id];
      state.order = state.order.filter((tid) => tid !== id);
      await saveState(state);
      console.log("Removed todo", id);
      break;
    }
    case "edit": {
      const [id, field, ...valueArr] = args;
      if (!id || !field || !state.todos[id]) {
        console.error("Usage: edit <id> <field> <value>");
        process.exit(1);
      }
      const value = valueArr.join(" ");
      if (field === "title") state.todos[id].title = value;
      else if (field === "status") state.todos[id].status = value as any;
      else if (field === "due") state.todos[id].due = value;
      else if (field === "priority") state.todos[id].priority = Number(value) as any;
      else if (field === "tags") state.todos[id].tags = value.split(",");
      else {
        console.error("Unknown field:", field);
        process.exit(1);
      }
      state.todos[id].updatedAt = new Date().toISOString();
      TodoItemSchema.parse(state.todos[id]); // Validate
      await saveState(state);
      console.log("Edited:", id, field, "=", value);
      break;
    }
    default:
      console.log(`Usage:
  add <title> [options]         Add new todo
  list [filters]                List todos
  complete <id>                 Mark todo as complete
  remove <id>                   Delete a todo
  edit <id> <field> <value>     Edit todo property
`);
      process.exit(1);
  }
}

main();