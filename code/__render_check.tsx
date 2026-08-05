/**
 * Dev-only render check for the employment step's box numbers.
 *
 * Renders StepEmployment for a non-Quebec and a Quebec return and prints, for
 * every field, the badge shown beside it and the value in it. Catches the two
 * things that are easy to get wrong here and invisible in a type check: a box
 * number rendering twice on one slip, and a field losing its badge entirely.
 *
 *   npx esbuild ./__render_check.tsx --bundle --platform=node --format=cjs \
 *     --jsx=automatic --loader:.css=empty --alias:@=./src \
 *     --outfile=/tmp/check.cjs && node /tmp/check.cjs
 *
 * Expected: outside Quebec one "22" on the T4 and no duplicate; in Quebec the
 * T4 keeps its federal "22" and the RL-1 keeps "E"; every Other-income field
 * either shows a badge or holds the column open with a spacer.
 *
 * Not part of the build -- nothing imports it. Safe to delete.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "@/i18n/I18nProvider";
import { StepEmployment } from "@/components/wizard/StepEmployment";
import { useFormStore } from "@/store/useFormStore";
import type { ProvinceCode, TaxYear } from "@/lib/tax";

/**
 * zustand renders from `getInitialState()` under SSR (zustand/index.js:21), so
 * `setState` alone is invisible to renderToStaticMarkup. Mutate the initial
 * state in place instead -- fine for a throwaway harness.
 */
function seed(province: ProvinceCode) {
  Object.assign(useFormStore.getInitialState().data, {
    province,
    taxYear: 2025 as TaxYear,
    income: {
      employment: {
        gross: 70000,
        // Split on purpose: outside Quebec the merged Box 22 field must show
        // the 11000 total, not either half.
        federalTaxWithheld: 7000,
        provincialTaxWithheld: 4000,
        cppContribution: 3800,
        cpp2Contribution: 396,
        eiPremium: 1000,
        ppipPremium: 494,
        cppPensionableEarnings: 70000,
      },
      benefits: { ei: { amount: 5000, isParental: false, taxWithheld: 400 } },
      selfEmployment: { netIncome: 12000 },
      investment: {
        interest: 100,
        eligibleDividends: 200,
        nonEligibleDividends: 300,
        capitalGains: 400,
        capitalLosses: 50,
      },
    },
  });
}

/** The always-on hint line, and the collapsed-section subtitle. */
const HINT = /class="mt-1\.5 text-micro leading-snug text-ink-muted">([^<]*)</;
const SUBTITLE = /class="mt-0\.5 block text-micro leading-snug text-ink-muted">([^<]*)</;

for (const province of ["ON", "QC"] as ProvinceCode[]) {
  seed(province);
  const html = renderToStaticMarkup(
    <I18nProvider>
      <StepEmployment />
    </I18nProvider>,
  );

  console.log(`\n========== ${province} ==========`);
  for (const card of html.split(/<section /).slice(1)) {
    const heading = card.match(/<h2[^>]*>([^<]*)/)?.[1] ?? "?";
    const meta = card.match(/text-white\/60"[^>]*>([^<]*)/)?.[1] ?? "";
    const seen = new Set<string>();
    console.log(`\n-- ${heading}  [${meta}]`);

    for (const row of card.split(/<div class="border-t border-line first:border-t-0">/).slice(1)) {
      const sub = row.match(SUBTITLE)?.[1];
      if (sub) console.log(`   · section note: ${sub}`);
    }

    for (const field of card.split(/<div class="min-w-0/).slice(1)) {
      const label = field.match(/<label[^>]*>([^<]*)/)?.[1] ?? "?";
      const badge = field.match(/text-badge-ink[^"]*">([^<]*)</)?.[1];
      const value = field.match(/value="([^"]*)"/)?.[1] ?? "";
      // No badge means the input runs full width -- expected on the fields that
      // come from a form rather than a numbered box.
      const slot = badge ?? "full";
      const dupe = badge && seen.has(badge) ? "  <-- DUPLICATE ON THIS SLIP" : "";
      if (badge) seen.add(badge);
      const hint = field.match(HINT)?.[1];
      const hasHelp = /aria-expanded="false"[^>]*aria-controls/.test(field);
      console.log(`   [${slot.padEnd(4)}] ${label.padEnd(34)} = ${value}${dupe}`);
      console.log(`          hint: ${hint ?? "*** MISSING ***"}${hasHelp ? "   [?]" : ""}`);
    }
  }
}
