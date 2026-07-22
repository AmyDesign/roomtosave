"use client";

import { useI18n } from "@/i18n/I18nProvider";

/**
 * Sits at the foot of the page, not the head.
 *
 * It used to be a yellow banner directly under the title, which made it the
 * second-loudest thing on screen -- ahead of the form it was warning about.
 * The obligation is to state it clearly, not to shout it.
 */
export function Disclaimer() {
  const { t } = useI18n();
  return (
    <p className="mt-8 border-t border-line pt-4 text-micro leading-relaxed text-ink-secondary">
      {t("disclaimer")}
    </p>
  );
}
