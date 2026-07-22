import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about our custom font-size scale.
 *
 * The scale is named `text-micro | label | body | title | display`. Out of the
 * box tailwind-merge only knows Tailwind's default sizes (`text-sm`, `text-lg`,
 * ...), so it files ours under text-COLOUR instead — and then "resolves" the
 * non-existent conflict by dropping the real colour class that came before it.
 *
 * That silently turned `bg-accent text-white ... text-body` into an indigo
 * button with dark text, and `text-title ... text-ink` into an uncoloured
 * heading. Registering the scale here fixes every such pair at once.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "micro",
            "label",
            "body",
            "amount",
            "title",
            "display",
            "hero",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCAD(amount: number, locale: "en" | "zh" = "en"): string {
  const formatter = new Intl.NumberFormat(
    locale === "zh" ? "zh-CN" : "en-CA",
    {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    },
  );
  return formatter.format(amount);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

/**
 * 把 |amount| < threshold 的小残值 snap 到 exactly 0.
 *
 * 用于 refundOrOwing 显示场景: 优化器的 zero_owing 策略用 Math.ceil 取整供款,
 * 产生 (0, $1) 的小残值. formatCAD 的 maximumFractionDigits=0 会把 $0.50+ 四舍五入
 * 显示成 "$1 refund / owing", 跟"零目标"语义矛盾.
 *
 * 在显示层 snap 而不是引擎层, 保持精确数据 (TaxBreakdown.refundOrOwing) 不变.
 * 见 TICKET-022.
 */
export function snapNearZero(amount: number, threshold = 1): number {
  return Math.abs(amount) < threshold ? 0 : amount;
}
