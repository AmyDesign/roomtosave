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
 * Field labels additionally shorten the reference to fit the 54px badge:
 * "Second additional QPP contribution (Box 17A / RL-1 Box B.B)" -> "17A".
 * Section titles use `splitParen` instead, which keeps the whole parenthetical.
 */
function splitBoxRef(label: string): { name: string; boxNo?: string } {
  const { name, tag } = splitParen(label);
  if (!tag) return { name };
  const boxNo = tag.replace(/Box\s*/gi, "").split(/\s*[/·]\s*/)[0].trim();
  return { name, boxNo };
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
  const selfEmpNet = data.income.selfEmployment?.netIncome ?? 0;
  const inv = data.income.investment ?? {};
  const interest = inv.interest ?? 0;
  const eligibleDividends = inv.eligibleDividends ?? 0;
  const nonEligibleDividends = inv.nonEligibleDividends ?? 0;
  const capitalGains = inv.capitalGains ?? 0;
  const capitalLosses = inv.capitalLosses ?? 0;

  const hasEi = !!ei.amount || !!ei.taxWithheld;
  const hasSelfEmp = !!selfEmpNet;
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

  const money = (n: number) =>
    `$${n.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`;

  /** A field bound to the employment income object. */
  const slipField = (
    key: keyof typeof emp,
    rawLabel: string,
    help?: string,
  ) => {
    const { name, boxNo } = splitBoxRef(rawLabel);
    return (
      <BoxField
        label={name}
        boxNo={boxNo}
        help={help}
        value={(emp[key] as number) ?? 0}
        onValueChange={(n) =>
          updateIncomeEmployment({ [key]: n } as Partial<typeof emp>)
        }
      />
    );
  };

  const amountField = (
    rawLabel: string,
    value: number,
    onValueChange: (n: number) => void,
    help?: string,
  ) => {
    const { name } = splitBoxRef(rawLabel);
    return (
      <BoxField
        label={name}
        help={help}
        value={value}
        onValueChange={onValueChange}
      />
    );
  };

  // gross, CPP, EI, federal tax, Box 26, plus one province-dependent field
  // (QPIP Box 55 in Quebec, provincial tax withheld elsewhere).
  const t4Count = 6 + (hasCpp2 ? 1 : 0);

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
          {slipField("gross", t("employment.gross"), t("employment.grossHelp"))}
          {slipField(
            "cppContribution",
            isQC
              ? t("employment.cppContributionQC")
              : t("employment.cppContribution"),
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
              help={t("employment.cpp2ContributionHelp")}
              value={emp.cpp2Contribution ?? 0}
              onValueChange={(n) =>
                updateIncomeEmployment({ cpp2Contribution: n })
              }
            />
          )}
          {slipField("eiPremium", t("employment.eiPremium"))}
          {slipField(
            "federalTaxWithheld",
            isQC
              ? t("employment.federalTaxWithheldQC")
              : t("employment.federalTaxWithheld"),
          )}
          {/* Outside Quebec there is no separate provincial box -- Box 22 is one
              combined figure. The field stays (some payroll statements do split
              it, and the engine only uses the sum) but sits on the T4 card with
              its box number, so it no longer reads as a slip of its own. */}
          {!isQC &&
            slipField(
              "provincialTaxWithheld",
              t("employment.provincialTaxWithheld"),
              t("employment.provincialTaxWithheldHelp"),
            )}
          <BoxField
            label={splitBoxRef(t("employment.cppPensionable")).name}
            boxNo="26"
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
              value={emp.provincialTaxWithheld}
              onValueChange={(n) =>
                updateIncomeEmployment({ provincialTaxWithheld: n })
              }
            />
            {hasCpp2 && (
              <BoxField
                label={splitBoxRef(t("employment.cpp2ContributionQC")).name}
                boxNo="B.B"
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
              t("otherIncome.ei.amountHelp"),
            )}
            {amountField(t("otherIncome.ei.taxWithheld"), ei.taxWithheld, (n) =>
              updateEi({ taxWithheld: n }),
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
          summary={hasSelfEmp ? money(selfEmpNet) : undefined}
          open={openSelfEmp}
          onToggle={() => {
            if (openSelfEmp) updateIncome({ selfEmployment: undefined });
            setOpenSelfEmp(!openSelfEmp);
          }}
        >
          <BoxGrid rows={1} single>
            {amountField(
              t("otherIncome.selfEmployment.netIncome"),
              selfEmpNet,
              (n) => updateIncome({ selfEmployment: { netIncome: n } }),
              t("otherIncome.selfEmployment.netIncomeHelp"),
            )}
          </BoxGrid>
          <p className="mt-3.5 rounded-control bg-surface-sunken px-3 py-2.5 text-micro leading-relaxed text-ink-secondary">
            {t("otherIncome.selfEmployment.cppNote")}
          </p>
        </CollapsibleRow>

        <CollapsibleRow
          title={splitParen(t("otherIncome.investment.section")).name}
          tag={splitParen(t("otherIncome.investment.section")).tag}
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
            {amountField(t("otherIncome.investment.interest"), interest, (n) =>
              updateInvestment({ interest: n }),
            )}
            {amountField(
              t("otherIncome.investment.eligibleDividends"),
              eligibleDividends,
              (n) => updateInvestment({ eligibleDividends: n }),
              t("otherIncome.investment.eligibleDividendsHelp"),
            )}
            {amountField(
              t("otherIncome.investment.nonEligibleDividends"),
              nonEligibleDividends,
              (n) => updateInvestment({ nonEligibleDividends: n }),
            )}
            {amountField(
              t("otherIncome.investment.capitalGains"),
              capitalGains,
              (n) => updateInvestment({ capitalGains: n }),
              t("otherIncome.investment.capitalGainsHelp"),
            )}
            {amountField(
              t("otherIncome.investment.capitalLosses"),
              capitalLosses,
              (n) => updateInvestment({ capitalLosses: n }),
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
