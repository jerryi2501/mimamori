import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui 標準ヘルパー: クラス名を安全に結合する */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
