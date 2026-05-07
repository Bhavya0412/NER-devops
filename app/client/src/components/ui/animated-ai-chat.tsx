import * as React from "react";
import { useCallback, useEffect, useRef } from "react";

import { motion } from "framer-motion";
import { LoaderIcon, SendIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-3 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-slate-500 dark:placeholder:text-white/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
            className
          )}
          ref={ref}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="absolute inset-0 rounded-xl pointer-events-none ring-2 ring-offset-0 ring-violet-500/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export type AnimatedAIChatProps = {
  value: string;
  onChange: (next: string) => void;
  onAnalyze: () => void;
  isLoading?: boolean;
  header?: string;
  subheader?: string;
  placeholder?: string;
  toolbar?: React.ReactNode;
  status?: string;
  children?: React.ReactNode;
};

// Kept the original export name for drop-in usage, but this is now an
// "article input + analyze + results" panel (no chatbot behavior).
export function AnimatedAIChat({
  value,
  onChange,
  onAnalyze,
  isLoading,
  header = "Analyze an article",
  subheader = "Paste your text and run NER.",
  placeholder = "Paste your article here…",
  toolbar,
  status,
  children,
}: AnimatedAIChatProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 72, maxHeight: 220 });
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = React.useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const canAnalyze = Boolean(value.trim()) && !isLoading;

  return (
    <div className="lab-bg relative w-full overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal blur-[128px]" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal blur-[96px]" />
      </div>

      <div className="w-full max-w-2xl mx-auto relative">
        <motion.div
          className="relative z-10 space-y-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {header}
            </h1>
            <p className="text-sm text-slate-600 dark:text-white/50">{subheader}</p>
          </div>

          <motion.div
            className="relative glass rounded-2xl shadow-2xl"
            initial={{ scale: 0.99 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.05 }}
          >
            <div className="p-4">
              {toolbar ? (
                <div className="mb-3 flex items-center justify-end gap-2">{toolbar}</div>
              ) : null}
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canAnalyze) onAnalyze();
                  }
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={placeholder}
                containerClassName="w-full"
                className={cn(
                  "w-full",
                  "resize-none",
                  "bg-transparent",
                  "border-none",
                  "text-slate-900 dark:text-white/90",
                  "focus:outline-none",
                  "min-h-[72px]"
                )}
                style={{ overflow: "hidden" }}
                showRing={false}
              />
            </div>

            <div className="p-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="min-h-[1.25rem] text-xs text-slate-600 dark:text-white/50">
                {status ?? ""}
              </div>
              <motion.button
                type="button"
                onClick={onAnalyze}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={!canAnalyze}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  "flex items-center gap-2",
                  canAnalyze
                    ? "bg-slate-900 text-white hover:bg-slate-950 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                    : "bg-black/5 text-slate-500 dark:bg-white/5 dark:text-white/30"
                )}
              >
                {isLoading ? (
                  <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                <span>{isLoading ? "Analyzing" : "Analyze"}</span>
              </motion.button>
            </div>
          </motion.div>

          {children}
        </motion.div>
      </div>

      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
          animate={{ x: mousePosition.x - 400, y: mousePosition.y - 400 }}
          transition={{ type: "spring", damping: 25, stiffness: 150, mass: 0.5 }}
        />
      )}
    </div>
  );
}
