import type { Manifest } from "@/lib/manifest";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export const appComponents: Record<string, ComponentType<{ manifest: Manifest }>> = {
  bomzh: dynamic(() => import("./bomzh/app")),
  okotis: dynamic(() => import("./okotis/app")),
};
