"use client";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Mark } from "@/components/common/Logo";
import { Disclaimer } from "@/components/common/Disclaimer";
import { Wizard } from "@/components/wizard/Wizard";
import { useFormStore } from "@/store/useFormStore";
import { useI18n } from "@/i18n/I18nProvider";

export default function HomePage() {
  const { t } = useI18n();
  const taxYear = useFormStore((s) => s.data.taxYear);
  const province = useFormStore((s) => s.data.province);

  return (
    <main className="max-w-[960px] mx-auto px-6 pb-16 max-[640px]:px-3.5">
      {/*
        Compact bar rather than a large title block. Year and province drive
        every number on every page, so they belong in persistent chrome instead
        of only on step 1 -- and it gives the app an identity at the same time.
      */}
      <header className="flex items-center justify-between gap-4 py-5">
        {/*
          The mark gets real estate rather than being tucked in at label size.
          It's the one piece of identity on the page, and at 24px the fill line
          that carries the whole idea was too small to read as anything.
        */}
        <div className="flex items-center gap-3 min-w-0">
          <Mark size={30} className="shrink-0 text-prog" />
          <span className="truncate text-amount font-medium tracking-tight">
            {t("app.shortTitle")}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-label text-ink-secondary max-[640px]:hidden">
            {taxYear} · {t(`provinces.${province}`)}
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      <Wizard />

      <Disclaimer />
    </main>
  );
}
