"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { BoxField, BoxGrid } from "@/components/ui/BoxField";
import {
  CollapsibleCard,
  CollapsibleRow,
} from "@/components/ui/CollapsibleCard";
import { useFormStore } from "@/store/useFormStore";
import { useI18n } from "@/i18n/I18nProvider";
import { getFederalConfig } from "@/lib/tax";
import type { BenefitIncome, InvestmentIncome } from "@/lib/tax";

const EMPTY_EI = { amount: 0, isParental: false, taxWithheld: 0 };

/**
 * The i18n labels embed the slip reference, e.g. "QPIP premium (Box 55)". The
 * layout wants those as two pieces so the number can sit beside the input.
 * Split here rather than forking every translation string; labels without a
 * trailing parenthetical pass through unchanged.
 */
function splitParen(label: string): { name: string; tag?: string } {
  const m = label.match(/^(.*?)\s*[（(]\s*([^（()）]+?)\s*[)）]\s*$/);
  return m ? { name: m[1], tag: m[2] } : { name: label };
}

/**
 * Field labels additionally shorten the reference to fit the 54px badge, taking
 * the first box number only: "Second additional QPP contribution (Box 17A /
 * RL-1 Box B.B)" -> "17A", "Interest income (T5 Box 13)" -> "13". A reference
 * that names a form rather than a box ("Schedule 3", "T2125") yields no badge —
 * inventing one would send people hunting for a number their slip doesn't have.
 * Section titles use `splitParen` instead, which keeps the whole parenthetical.
 */
function splitBoxRef(label: string): { name: string; boxNo?: string } {
  const { name, tag } = splitParen(label);
  if (!tag) return { name };
  return { name, boxNo: tag.match(/Box\s*([A-Za-z0-9.]+)/i)?.[1] };
}

export function StepEmployment() {
  const { t } = useI18n();
  const data = useFormStore((s) => s.data);
  const updateIncome = useFormStore((s) => s.updateIncome);
  const updateIncomeEmployment = useFormStore((s) => s.updateIncomeEmployment);
  const update = useFormStore((s) => s.update);
  const nextStep = useFormStore((s) => s.nextStep);
  const prevStep = useFormStore((s) => s.prevStep);

  const isQC = data.province === "QC";

  const emp = data.income.employment ?? {
    gross: 0,
    federalTaxWithheld: 0,
    provincialTaxWithheld: 0,
    cppContribution: 0,
    eiPremium: 0,
  };

  const pensionable = emp.cppPensionableEarnings ?? emp.gross;
  const hasCpp2 = !!getFederalConfig(data.taxYear).cpp2Rate;

  // ----- Other income: one disclosure each, collapsed unless already filled -----
  const ei = data.income.benefits?.ei ?? EMPTY_EI;
  const inv = data.income.investment ?? {};

  /*
   * Self-employment is collected as gross and expenses and subtracted for the
   * user. A return saved before the split has only `netIncome`, so fall back to
   * showing it as gross with no expenses: same net, nothing silently lost.
   */
  const selfEmp = data.income.selfEmployment;
  const selfEmpNet = selfEmp?.netIncome ?? 0;
  const selfEmpGross = selfEmp?.grossIncome ?? selfEmpNet;
  const selfEmpExpenses = selfEmp?.expenses ?? 0;
  const interest = inv.interest ?? 0;
  const eligibleDividends = inv.eligibleDividends ?? 0;
  const nonEligibleDividends = inv.nonEligibleDividends ?? 0;
  const capitalGains = inv.capitalGains ?? 0;
  const capitalLosses = inv.capitalLosses ?? 0;

  const hasEi = !!ei.amount || !!ei.taxWithheld;
  const hasSelfEmp = !!selfEmpGross || !!selfEmpExpenses;
  const hasInvestment =
    !!interest ||
    !!eligibleDividends ||
    !!nonEligibleDividends ||
    !!capitalGains ||
    !!capitalLosses;

  const [openEi, setOpenEi] = useState(hasEi);
  const [openSelfEmp, setOpenSelfEmp] = useState(hasSelfEmp);
  const [openInvestment, setOpenInvestment] = useState(hasInvestment);

  const updateEi = (patch: Partial<typeof EMPTY_EI>) =>
    updateIncome({
      benefits: {
        ...(data.income.benefits ?? {}),
        ei: { ...ei, ...patch },
      } as BenefitIncome,
    });

  const updateInvestment = (patch: Partial<InvestmentIncome>) =>
    updateIncome({ investment: { ...inv, ...patch } });

  /** Keep both halves and the derived net the engine reads in step. */
  const updateSelfEmp = (grossIncome: number, expenses: number) =>
    updateIncome({
      selfEmployment: { grossIncome, expenses, netIncome: grossIncome - expenses },
    });

  const money = (n: number) =>
    `$${n.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`;

  /** A field bound to the employment income object. */
  const slipField = (
    key: keyof typeof emp,
    rawLabel: string,
    hint?: string,
    help?: string,
  ) => {
    const { name, boxNo } = splitBoxRef(rawLabel);
    return (
      <BoxField
        label={name}
        boxNo={boxNo}
        hint={hint}
        help={help}
        value={(emp[key] as number) ?? 0}
        onValueChange={(n) =>
          updateIncomeEmployment({ [key]: n } as Partial<typeof emp>)
        }
      />
    );
  };

  /**
   * Other-income amounts. These sit on real slips too (T4E, T5), so they carry
   * the same badge as the T4 fields; the ones drawn from a form rather than a
   * box have no badge and run the full width of their column.
   */
  const amountField = (
    rawLabel: string,
    value: number,
    onValueChange: (n: number) => void,
    hint?: string,
    help?: string,
  ) => {
    const { name, boxNo } = splitBoxRef(rawLabel);
    return (
      <BoxField
        label={name}
        boxNo={boxNo}
        hint={hint}
        help={help}
        value={value}
        onValueChange={onValueChange}
      />
    );
  };

  /**
   * Outside Quebec T4 Box 22 is a single combined amount, so it gets a single
   * field. It reads the sum of both stored halves -- a return carried over from
   * a Quebec session, or from before this was one field, still shows the right
   * total -- and writes back to the federal half alone, folding the split away
   * on first edit. The engine adds the two together regardless, so no result
   * changes either way.
   */
  const combinedTaxWithheld =
    emp.federalTaxWithheld + emp.provincialTaxWithheld;

  // gross, CPP, EI, Box 22, Box 26, plus QPIP Box 55 in Quebec, where federal
  // and provincial tax are separate boxes on separate slips.
  const t4Count = 5 + (isQC ? 1 : 0) + (hasCpp2 ? 1 : 0);

  return (
    <div className="space-y-3.5">
      <div>
        <h1 className="text-display font-medium tracking-tight">
          {t("employment.title")}
        </h1>
        <p className="mt-1 text-body text-ink-secondary">
          {t("employment.transcribeHint")}
        </p>
      </div>

      {/* Fields run in slip box order -- 14, 16/17, 16A/17A, 18, 22, 26, 55 --
          reading down the left column then the right. Box 22 occupies two rows
          outside Quebec, where it covers federal and provincial tax together. */}
      <CollapsibleCard
        title={t("employment.slipSection")}
        meta={t("employment.fieldCount", { n: t4Count })}
      >
        <BoxGrid rows={Math.ceil(t4Count / 2)}>
          {slipField(
            "gross",
            t("employment.gross"),
            t("employment.grossHint"),
            t("employment.grossHelp"),
          )}
          {slipField(
            "cppContribution",
            isQC
              ? t("employment.cppContributionQC")
              : t("employment.cppContribution"),
            isQC
              ? t("employment.cppContributionQCHint")
              : t("employment.cppContributionHint"),
          )}
          {hasCpp2 && (
            <BoxField
              label={
                splitBoxRef(
                  isQC
                    ? t("employment.cpp2ContributionQC")
                    : t("employment.cpp2Contribution"),
                ).name
              }
              boxNo={isQC ? "17A" : "16A"}
              hint={
                isQC
                  ? t("employment.cpp2ContributionQCHint")
                  : t("employment.cpp2ContributionHint")
              }
              help={t("employment.cpp2ContributionHelp")}
              value={emp.cpp2Contribution ?? 0}
              onValueChange={(n) =>
                updateIncomeEmployment({ cpp2Contribution: n })
              }
            />
          )}
          {slipField(
            "eiPremium",
            t("employment.eiPremium"),
            t("employment.eiPremiumHint"),
          )}
          {/* In Quebec the T4 Box 22 really is federal-only, with the provincial
              share on the RL-1; everywhere else the one box covers both. */}
          {isQC ? (
            slipField(
              "federalTaxWithheld",
              t("employment.federalTaxWithheldQC"),
              t("employment.federalTaxWithheldQCHint"),
            )
          ) : (
            <BoxField
              label={splitBoxRef(t("employment.incomeTaxDeducted")).name}
              boxNo="22"
              hint={t("employment.incomeTaxDeductedHint")}
              help={t("employment.incomeTaxDeductedHelp")}
              value={combinedTaxWithheld}
              onValueChange={(n) =>
                updateIncomeEmployment({
                  federalTaxWithheld: n,
                  provincialTaxWithheld: 0,
                })
              }
            />
          )}
          <BoxField
            label={splitBoxRef(t("employment.cppPensionable")).name}
            boxNo="26"
            hint={t("employment.cppPensionableHint")}
            help={t("employment.cppPensionableHelp")}
            value={pensionable}
            onValueChange={(n) =>
              updateIncomeEmployment({ cppPensionableEarnings: n })
            }
          />
          {isQC && (
            <BoxField
              label={splitBoxRef(t("employment.ppipPremium")).name}
              boxNo="55"
              hint={t("employment.ppipPremiumHint")}
              help={t("employment.ppipPremiumHelp")}
              value={emp.ppipPremium ?? 0}
              onValueChange={(n) => updateIncomeEmployment({ ppipPremium: n })}
            />
          )}
        </BoxGrid>
      </CollapsibleCard>

      {/* The RL-1 is a separate slip, so it gets a separate card. Keeping it
          mixed in with the T4 hid the fact that QPP2 must be entered on both. */}
      {isQC && (
        <CollapsibleCard
          title={t("employment.rl1Section")}
          meta={t("provinces.QC")}
        >
          <BoxGrid rows={1}>
            <BoxField
              label={
                splitBoxRef(t("employment.provincialTaxWithheldQC")).name
              }
              boxNo="E"
              hint={t("employment.provincialTaxWithheldQCHint")}
              value={emp.provincialTaxWithheld}
              onValueChange={(n) =>
                updateIncomeEmployment({ provincialTaxWithheld: n })
              }
            />
            {hasCpp2 && (
              <BoxField
                label={splitBoxRef(t("employment.cpp2ContributionQC")).name}
                boxNo="B.B"
                hint={t("employment.cpp2MirrorHint")}
                help={t("employment.cpp2MirrorHelp")}
                value={emp.cpp2Contribution ?? 0}
                onValueChange={(n) =>
                  updateIncomeEmployment({ cpp2Contribution: n })
                }
              />
            )}
          </BoxGrid>
          <div className="mt-5 pt-4 border-t border-line">
            <Checkbox
              id="privateDrug"
              checked={data.hasPrivateDrugCoverage ?? false}
              onChange={(e) =>
                update("hasPrivateDrugCoverage", e.target.checked)
              }
              label={t("employment.privateDrugCoverage")}
              description={t("employment.privateDrugCoverageHelp")}
            />
          </div>
        </CollapsibleCard>
      )}

      <CollapsibleCard
        title={t("otherIncome.section")}
        meta={t("otherIncome.asNeeded")}
        bodyClassName="px-5 py-1.5"
      >
        <CollapsibleRow
          title={splitParen(t("otherIncome.ei.section")).name}
          tag={splitParen(t("otherIncome.ei.section")).tag}
          subtitle={t("otherIncome.ei.sectionHint")}
          summary={hasEi ? money(ei.amount) : undefined}
          open={openEi}
          onToggle={() => {
            if (openEi) updateIncome({ benefits: undefined });
            setOpenEi(!openEi);
          }}
        >
          <BoxGrid rows={1}>
            {amountField(
              t("otherIncome.ei.amount"),
              ei.amount,
              (n) => updateEi({ amount: n }),
              t("otherIncome.ei.amountHint"),
              t("otherIncome.ei.amountHelp"),
            )}
            {amountField(
              t("otherIncome.ei.taxWithheld"),
              ei.taxWithheld,
              (n) => updateEi({ taxWithheld: n }),
              t("otherIncome.ei.taxWithheldHint"),
              t("otherIncome.ei.taxWithheldHelp"),
            )}
          </BoxGrid>
          <div className="pt-4">
            <Checkbox
              id="ei-parental"
              checked={ei.isParental}
              onChange={(e) => updateEi({ isParental: e.target.checked })}
              label={t("otherIncome.ei.parental")}
              description={t("otherIncome.ei.parentalHelp")}
            />
          </div>
        </CollapsibleRow>

        <CollapsibleRow
          title={splitParen(t("otherIncome.selfEmployment.section")).name}
          tag={splitParen(t("otherIncome.selfEmployment.section")).tag}
          subtitle={t("otherIncome.selfEmployment.sectionHint")}
          summary={hasSelfEmp ? money(selfEmpNet) : undefined}
          open={openSelfEmp}
          onToggle={() => {
            if (openSelfEmp) updateIncome({ selfEmployment: undefined });
            setOpenSelfEmp(!openSelfEmp);
          }}
        >
          <BoxGrid rows={1}>
            {amountField(
              t("otherIncome.selfEmployment.grossIncome"),
              selfEmpGross,
              (n) => updateSelfEmp(n, selfEmpExpenses),
              t("otherIncome.selfEmployment.grossIncomeHint"),
              t("otherIncome.selfEmployment.grossIncomeHelp"),
            )}
            {amountField(
              t("otherIncome.selfEmployment.expenses"),
              selfEmpExpenses,
              (n) => updateSelfEmp(selfEmpGross, n),
              t("otherIncome.selfEmployment.expensesHint"),
              t("otherIncome.selfEmployment.expensesHelp"),
            )}
          </BoxGrid>

          {/* The subtraction the user no longer has to do, shown as it happens
              so the number the engine taxes is never a mystery. */}
          <div className="mt-3.5 flex items-baseline justify-between gap-3 rounded-control bg-surface-sunken px-3 py-2.5">
            <span className="text-label text-ink-secondary">
              {t("otherIncome.selfEmployment.netIncomeLabel")}
            </span>
            <span className="text-amount text-ink tabular">
              {money(selfEmpNet)}
            </span>
          </div>
          {selfEmpNet < 0 && (
            <p className="mt-2 text-micro leading-relaxed text-ink-muted">
              {t("otherIncome.selfEmployment.netIncomeLossNote")}
            </p>
          )}

          <p className="mt-3.5 rounded-control bg-surface-sunken px-3 py-2.5 text-micro leading-relaxed text-ink-secondary">
            {t("otherIncome.selfEmployment.cppNote")}
          </p>
        </CollapsibleRow>

        <CollapsibleRow
          title={splitParen(t("otherIncome.investment.section")).name}
          tag={splitParen(t("otherIncome.investment.section")).tag}
          subtitle={t("otherIncome.investment.sectionHint")}
          summary={
            hasInvestment
              ? money(
                  interest +
                    eligibleDividends +
                    nonEligibleDividends +
                    capitalGains,
                )
              : undefined
          }
          open={openInvestment}
          onToggle={() => {
            if (openInvestment) updateIncome({ investment: undefined });
            setOpenInvestment(!openInvestment);
          }}
        >
          <BoxGrid rows={3}>
            {amountField(
              t("otherIncome.investment.interest"),
              interest,
              (n) => updateInvestment({ interest: n }),
              t("otherIncome.investment.interestHint"),
              t("otherIncome.investment.interestHelp"),
            )}
            {amountField(
              t("otherIncome.investment.eligibleDividends"),
              eligibleDividends,
              (n) => updateInvestment({ eligibleDividends: n }),
              t("otherIncome.investment.eligibleDividendsHint"),
              t("otherIncome.investment.eligibleDividendsHelp"),
            )}
            {amountField(
              t("otherIncome.investment.nonEligibleDividends"),
              nonEligibleDividends,
              (n) => updateInvestment({ nonEligibleDividends: n }),
              t("otherIncome.investment.nonEligibleDividendsHint"),
              t("otherIncome.investment.nonEligibleDividendsHelp"),
            )}
            {amountField(
              t("otherIncome.investment.capitalGains"),
              capitalGains,
              (n) => updateInvestment({ capitalGains: n }),
              t("otherIncome.investment.capitalGainsHint"),
              t("otherIncome.investment.capitalGainsHelp"),
            )}
            {amountField(
              t("otherIncome.investment.capitalLosses"),
              capitalLosses,
              (n) => updateInvestment({ capitalLosses: n }),
              t("otherIncome.investment.capitalLossesHint"),
              t("otherIncome.investment.capitalLossesHelp"),
            )}
          </BoxGrid>
          <p className="mt-3.5 rounded-control bg-surface-sunken px-3 py-2.5 text-micro leading-relaxed text-ink-secondary">
            {t("otherIncome.investment.note")}
          </p>
        </CollapsibleRow>
      </CollapsibleCard>

      <div className="flex justify-between items-center pt-2">
        <Button variant="secondary" onClick={prevStep}>
          {t("wizard.prev")}
        </Button>
        <Button onClick={nextStep}>{t("wizard.next")}</Button>
      </div>
    </div>
  );
}
