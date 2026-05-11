import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/utils/style";

function Card({ className, render, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    render,
    defaultTagName: "div",
    state: { slot: "card" },
    props: mergeProps({ className: cn("rounded-lg border bg-card p-4 shadow-sm", className) }, props),
  });
}

export { Card };
