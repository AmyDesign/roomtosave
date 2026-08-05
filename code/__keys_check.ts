/**
 * Dev-only i18n parity check.
 *
 * `t()` returns the key path itself when a lookup misses, so a string that
 * exists in `en` but not in `zh` does not crash — it renders
 * "otherIncome.investment.capitalGainsHint" as the label and looks like a
 * styling bug. With 190-odd keys across two locales that is easy to do and
 * hard to spot.
 *
 * Fails loudly on: keys present in one locale only, and empty strings.
 *
 *   npx esbuild ./__keys_check.ts --bundle --platform=node --format=cjs \
 *     --alias:@=./src --outfile=/tmp/keys.cjs && node /tmp/keys.cjs
 *
 * Not part of the build -- nothing imports it. Safe to delete.
 */
import { messages, type Locale } from "@/i18n/messages";

type Node = Record<string, unknown>;

function flatten(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Node).flatMap(([key, child]) =>
    child && typeof child === "object"
      ? flatten(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function lookup(locale: Locale, path: string): unknown {
  let cur: unknown = messages[locale];
  for (const seg of path.split(".")) cur = (cur as Node | undefined)?.[seg];
  return cur;
}

const locales = Object.keys(messages) as Locale[];
const keysByLocale = new Map(locales.map((l) => [l, flatten(messages[l])]));
const allKeys = [...new Set([...keysByLocale.values()].flat())].sort();

const problems: string[] = [];

for (const key of allKeys) {
  const missing = locales.filter((l) => !keysByLocale.get(l)!.includes(key));
  if (missing.length) {
    problems.push(`missing in ${missing.join(", ")}: ${key}`);
    continue;
  }
  const blank = locales.filter((l) => String(lookup(l, key)).trim() === "");
  if (blank.length) problems.push(`empty in ${blank.join(", ")}: ${key}`);
}

for (const locale of locales) {
  console.log(`${locale}: ${keysByLocale.get(locale)!.length} keys`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`\nall ${allKeys.length} keys present and non-empty in every locale`);
