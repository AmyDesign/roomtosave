"use client";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Disclaimer } from "@/components/common/Disclaimer";
import { Wizard } from "@/components/wizard/Wizard";
import { useFormStore } from "@/store/useFormStore";
import { useI18n } from "@/i18n/I18nProvider";

export default function HomePage() {
  const { t } = useI18n();
  const taxYear = useFormStore((s) => s.data.taxYear);
  const province = useFormStore((s) => s.data.province);

  return (
    <>
      {/*
        Full-bleed white band so the header reads as a bar across the top, while
        its contents stay on the same 960px measure as the page below it. Year
        and province live here rather than only on step 1, because they drive
        every number on every page.
      */}
      <header className="bg-surface border-b border-line">
        <div className="max-w-[960px] mx-auto px-6 py-5 flex items-center justify-between gap-4 max-[640px]:px-3.5">
          {/* Full lockup as one asset -- the wordmark is outlined in the file,
              so it needs no webfont and always renders as drawn. */}
          <img
            src="/roomtosave-logo.svg"
            alt="RoomToSave"
            width={2598}
            height={746}
            className="h-16 w-auto shrink-0 max-[640px]:h-11"
          />
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-label text-ink-secondary max-[640px]:hidden">
              {taxYear} · {t(`provinces.${province}`)}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-6 pt-8 pb-16 max-[640px]:px-3.5">
        <Wizard />

        <Disclaimer />
      </main>
    </>
  );
}
