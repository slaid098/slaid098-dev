import type { Manifest } from "@/lib/manifest";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export const appComponents: Record<string, ComponentType<{ manifest: Manifest }>> = {
  hobo: dynamic(() => import("./hobo/app")),
};
