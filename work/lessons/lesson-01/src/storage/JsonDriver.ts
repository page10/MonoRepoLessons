import fs from "fs-extra";
import { AppState } from "../model/types";
import { AppStateSchema } from "../model/schemas";

export class JsonDriver {
  constructor(private filePath: string) {}

  async load(): Promise<AppState> {
    if (!(await fs.pathExists(this.filePath))) {
      throw new Error("DB file not found");
    }
    const raw = await fs.readFile(this.filePath, "utf-8");
    const data = JSON.parse(raw);
    const parsed = AppStateSchema.parse(data);
    return parsed;
  }

  async save(state: AppState): Promise<void> {
    const tmpPath = this.filePath + ".tmp";
    const json = JSON.stringify(state, null, 2);
    await fs.writeFile(tmpPath, json, { encoding: "utf-8" });
    await fs.move(tmpPath, this.filePath, { overwrite: true });
  }
  
}


