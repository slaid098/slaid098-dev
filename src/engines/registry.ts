import type { Engine, EngineName } from "@/lib/manifest";
import { staticEngine } from "./static";

const registry: Partial<Record<EngineName, Engine>> = {
  static: staticEngine,
};

export function getEngine(name: EngineName | undefined): Engine {
  return registry[name ?? "static"] ?? staticEngine;
}
