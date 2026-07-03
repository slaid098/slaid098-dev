import type { Engine, EngineName } from "@/lib/manifest";
import { clickerEngine } from "./clicker";
import { staticEngine } from "./static";

const registry: Partial<Record<EngineName, Engine>> = {
  static: staticEngine,
  clicker: clickerEngine,
};

export function getEngine(name: EngineName | undefined): Engine {
  return registry[name ?? "static"] ?? staticEngine;
}
