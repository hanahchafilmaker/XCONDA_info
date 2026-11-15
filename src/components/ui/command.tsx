// Adapted from shadcn/ui (MIT). See LICENSE.shadcn.md.
import type { ComponentProps } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "../../utils/cn";

function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive data-slot="command" className={cn("flex min-h-0 w-full flex-col overflow-hidden bg-white text-neutral-950", className)} {...props} />;
}
function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return <CommandPrimitive.Input data-slot="command-input" className={cn("h-12 min-w-0 w-full bg-transparent text-base text-neutral-950 placeholder:text-neutral-500 focus-visible:outline-none", className)} {...props} />;
}
function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List data-slot="command-list" className={cn("min-h-0 max-h-[46dvh] scroll-py-2 overflow-x-hidden overflow-y-auto overscroll-contain p-2", className)} {...props} />;
}
function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return <CommandPrimitive.Item data-slot="command-item" className={cn("relative flex cursor-pointer select-none items-start gap-3 rounded-lg border border-transparent px-3 py-3 text-sm outline-none data-[selected=true]:border-volt-400/30 data-[selected=true]:bg-ink-880 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50", className)} {...props} />;
}

export { Command, CommandInput, CommandList, CommandItem };
