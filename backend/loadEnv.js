import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
dotenv.config({ path: rootEnv });
