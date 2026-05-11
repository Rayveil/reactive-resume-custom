import { cn } from "@/utils/cn";

function Select({ ...props }: any) {
  return <div {...props} />;
}

function SelectTrigger({ className, ...props }: any) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

function SelectValue({ ...props }: any) {
  return <span {...props} />;
}

function SelectContent({ ...props }: any) {
  return <div {...props} />;
}

function SelectItem({ ...props }: any) {
  return <div {...props} />;
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
