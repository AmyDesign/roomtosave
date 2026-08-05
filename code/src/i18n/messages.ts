/**
 * Bilingual translation resources
 */

export type Locale = "en" | "zh";

export interface Messages {
  app: { title: string; shortTitle: string; subtitle: string };
  disclaimer: string;
  wizard: {
    steps: { basic: string; employment: string; room: string; results: string };
    /** One-line hint under each step name in the progress bar. */
    stepHints: {
      basic: string;
      employment: string;
      room: string;
      results: string;
    };
    next: string;
    prev: string;
    calculate: string;
    reset: string;
  };
  basic: {
    title: string;
    /** One line under the page title, same role as employment.transcribeHint. */
    hint: string;
    /** Header of the single card on this page. */
    section: string;
    taxYear: string;
    province: string;
    age: string;
    ageHelp: string;
    firstTimeBuyer: string;
    firstTimeBuyerHelp: string;
    /** "See it with sample data" -- jumps a first-time visitor to results. */
    trySample: string;
  };
  employment: {
    title: string;
    gross: string;
    grossHint: string;
    grossHelp: string;
    /** Outside QC, Box 22 is one combined figure -- see `incomeTaxDeducted`. */
    federalTaxWithheldQC: string;
    federalTaxWithheldQCHint: string;
    incomeTaxDeducted: string;
    incomeTaxDeductedHint: string;
    incomeTaxDeductedHelp: string;
    provincialTaxWithheldQC: string;
    provincialTaxWithheldQCHint: string;
    cppContribution: string;
    cppContributionHint: string;
    cppContributionQC: string;
    cppContributionQCHint: string;
    eiPremium: string;
    eiPremiumHint: string;
    /** QC PPIP/QPIP premium (T4 Box 55 / RL-1 Box H) */
    ppipPremium: string;
    ppipPremiumHint: string;
    ppipPremiumHelp: string;
    /** P1 TICKET-014: Box 26 pensionable earnings */
    cppPensionable: string;
    cppPensionableHint: string;
    cppPensionableHelp: string;
    /** Page chrome for the slip-transcription layout */
    transcribeHint: string;
    slipSection: string;
    rl1Section: string;
    fieldCount: string;
    /** English needs a singular; Chinese reuses the same string. */
    fieldCountOne: string;
    cpp2MirrorHelp: string;
    cpp2MirrorHint: string;
    /** TICKET-030: CPP2/QPP2, T4 Box 16A/17A + RL-1 Box B.B */
    cpp2Contribution: string;
    cpp2ContributionHint: string;
    cpp2ContributionQC: string;
    cpp2ContributionQCHint: string;
    cpp2ContributionHelp: string;
    /** TICKET-033: QC RAMQ premium exemption */
    privateDrugCoverage: string;
    privateDrugCoverageHelp: string;
    note: string;
  };
  /** P1 TICKET-013: other income (EI / self-employment / investment) */
  otherIncome: {
    section: string;
    asNeeded: string;
    add: string;
    remove: string;
    toggle: string;
    toggleHelp: string;
    ei: {
      section: string;
      /** Who the section is for. Shown whether or not it is expanded. */
      sectionHint: string;
      amount: string;
      amountHint: string;
      amountHelp: string;
      taxWithheld: string;
      taxWithheldHint: string;
      taxWithheldHelp: string;
      parental: string;
      parentalHelp: string;
    };
    selfEmployment: {
      section: string;
      sectionHint: string;
      /** Collected as gross + expenses; the form does the subtraction. */
      grossIncome: string;
      grossIncomeHint: string;
      grossIncomeHelp: string;
      expenses: string;
      expensesHint: string;
      expensesHelp: string;
      /** Running total shown under the two inputs, e.g. "Net income  $38,000". */
      netIncomeLabel: string;
      netIncomeLossNote: string;
      cppNote: string;
    };
    /** P1 investment income (interest + eligible/non-eligible dividends + capital gains/losses) */
    investment: {
      section: string;
      sectionHint: string;
      interest: string;
      interestHint: string;
      interestHelp: string;
      eligibleDividends: string;
      eligibleDividendsHint: string;
      eligibleDividendsHelp: string;
      nonEligibleDividends: string;
      nonEligibleDividendsHint: string;
      nonEligibleDividendsHelp: string;
      capitalGains: string;
      capitalGainsHint: string;
      capitalGainsHelp: string;
      capitalLosses: string;
      capitalLossesHint: string;
      capitalLossesHelp: string;
      note: string;
    };
  };
  room: {
    title: string;
    hint: string;
    rrspSection: string;
    fhsaSection: string;
    /** Shown in place of the FHSA fields when the filer isn't eligible. */
    fhsaNotEligible: string;
    rrspRoom: string;
    rrspRoomHelp: string;
    fhsaRoom: string;
    fhsaRoomHelp: string;
    fhsaLifetimeUsed: string;
    fhsaLifetimeUsedHelp: string;
  };
  results: {
    title: string;
    hint: string;
    baseline: string;
    optimized: string;
    recommendation: string;
    fhsa: string;
    rrsp: string;
    totalContribution: string;
    expectedRefund: string;
    expectedOwing: string;
    taxSaved: string;
    comparison: {
      header: string;
      item: string;
      totalIncome: string;
      taxableIncome: string;
      federalTax: string;
      provincialTax: string;
      totalTax: string;
      effectiveRate: string;
      marginalRate: string;
      refundOrOwing: string;
    };
    rationaleTitle: string;
    warningsTitle: string;
    backToEdit: string;
  };
  interactive: {
    title: string;
    description: string;
    sliderLabel: string;
    reset: string;
    recommendedScenario: string;
    recommendedSubtitle: {
      zero_owing: string;
      max_refund: string;
      drop_bracket: string;
    };
    yourScenario: string;
    yourSubtitleSameAsRec: string;
    yourSubtitleCustom: string;
    contribution: string;
    fhsa: string;
    rrsp: string;
    refund: string;
    owing: string;
    marginalRate: string;
    remainingRoom: string;
  };
  strategy: {
    title: string;
    subtitle: string;
    zeroOwing: { label: string; desc: string };
    maxRefund: { label: string; desc: string };
    dropBracket: { label: string; desc: string };
  };
  rationale: Record<string, string>;
  warning: Record<string, string>;
  provinces: Record<string, string>;
}

export const messages: Record<Locale, Messages> = {
  en: {
    app: {
      // The name does the work of saying "contribution room" and "save tax" at
      // once; the subtitle only has to name the accounts. See design-system.md.
      title: "RoomToSave — RRSP & FHSA contribution planner",
      shortTitle: "RoomToSave",
      subtitle:
        "Find the optimal RRSP and FHSA contributions to maximize your refund.",
    },
    disclaimer:
      "This tool provides estimates for informational purposes only. Not professional tax advice. Final amounts depend on CRA assessment.",
    wizard: {
      steps: {
        basic: "Basic Info",
        employment: "Employment Income",
        room: "Contribution Room",
        results: "Results",
      },
      stepHints: {
        basic: "Year and province",
        employment: "T4 and RL-1",
        room: "RRSP and FHSA",
        results: "Your recommendation",
      },
      next: "Next",
      prev: "Back",
      calculate: "Calculate",
      reset: "Start Over",
    },
    basic: {
      title: "Tell us about yourself",
      hint: "These three answers decide which tax tables and limits apply to everything that follows.",
      section: "About you",
      taxYear: "Tax year",
      province: "Province of residence",
      age: "Age",
      ageHelp:
        "Your age on 31 December of the tax year. It affects the RRSP age limit and age-related credits.",
      firstTimeBuyer: "I am a first-time home buyer",
      firstTimeBuyerHelp:
        "You and your spouse have not owned a home you lived in during this year or the previous 4 calendar years.",
      trySample: "In a hurry? See it with sample data",
    },
    employment: {
      title: "Enter your T4 employment income",
      gross: "Gross employment income (Box 14)",
      grossHint: "Box 14 on your T4 — your pay before any deductions.",
      grossHelp: "Total wages before any deductions.",
      federalTaxWithheldQC: "Federal tax withheld (Box 22)",
      federalTaxWithheldQCHint:
        "Box 22 on your T4. In Quebec this is federal tax only — the provincial share is on the RL-1 below.",
      incomeTaxDeducted: "Income tax deducted (Box 22)",
      incomeTaxDeductedHint:
        "Box 22 on your T4 — the tax already taken off your pay all year.",
      incomeTaxDeductedHelp:
        "Outside Quebec, T4 Box 22 is one combined figure covering both federal and provincial tax. Copy it across exactly as printed — there is no separate provincial box to split it into.",
      provincialTaxWithheldQC: "QC tax withheld (RL-1 Box E)",
      provincialTaxWithheldQCHint:
        "Box E on your RL-1 — the separate Quebec slip from your employer.",
      cppContribution: "CPP contribution (Box 16)",
      cppContributionHint: "Box 16 on your T4.",
      cppContributionQC: "QPP contribution (Box 17)",
      cppContributionQCHint: "Box 17 on your T4.",
      eiPremium: "EI premium (Box 18)",
      eiPremiumHint: "Box 18 on your T4.",
      ppipPremium: "QPIP premium (Box 55)",
      ppipPremiumHint: "Box 55 on your T4, or Box H on your RL-1.",
      ppipPremiumHelp: "Quebec Parental Insurance Plan premium from T4 Box 55 or RL-1 Box H. Only for QC residents.",
      transcribeHint:
        "Copy the amounts from your slips. The grey block beside each field is its box number.",
      slipSection: "T4 slip",
      rl1Section: "RL-1 slip",
      fieldCount: "{n} fields",
      fieldCountOne: "{n} field",
      cpp2MirrorHelp:
        "Same as T4 Box 17A. Both slips must show the same amount.",
      cpp2MirrorHint: "Box B.B on your RL-1 — the same amount as T4 Box 17A.",
      cppPensionable: "CPP pensionable earnings (Box 26)",
      cppPensionableHint:
        "Box 26 on your T4. If that box is blank, use the same figure as Box 14.",
      cppPensionableHelp:
        "Box 26 on your T4. Usually equals Box 14 (gross income), but may differ if you were under 18, over 70, or had partial-year exemptions. Defaults to Box 14 if you leave it the same. Used to properly split CPP into base / enhanced / overpayment refund.",
      cpp2Contribution: "Second additional CPP contribution (Box 16A)",
      cpp2ContributionHint:
        "Box 16A on your T4. Blank on the slip means leave it at 0.",
      cpp2ContributionQC: "Second additional QPP contribution (Box 17A / RL-1 Box B.B)",
      cpp2ContributionQCHint:
        "Box 17A on your T4. Blank on the slip means leave it at 0.",
      cpp2ContributionHelp:
        "CPP2/QPP2 - charged at 4% on earnings between the first ceiling ($71,300 in 2025) and the second ceiling ($81,200), so the maximum is $396. It appears in its own box on your slip, separate from Box 16/17, and is blank if you earned under the first ceiling. Fully deductible, which is why leaving it out costs you money. Leave at $0 if the box is blank on your slip.",
      privateDrugCoverage:
        "I had private prescription drug coverage (e.g. through an employer group plan)",
      privateDrugCoverageHelp:
        "Québec only. If you were covered all year by a private or group drug plan, you are exempt from the RAMQ prescription drug premium (up to $755) and pay $0. Leave unchecked if you were covered by the public RAMQ plan.",
      note: "Rental and pension income support are coming in a later P1 update.",
    },
    otherIncome: {
      section: "Other income",
      asNeeded: "As needed",
      add: "Add",
      remove: "Remove",
      toggle: "I have other income (EI benefits / self-employment)",
      toggleHelp:
        "Open this if you received EI benefits (T4E) or had self-employment income (T2125).",
      ei: {
        section: "EI benefits (T4E)",
        sectionHint:
          "Only if you collected EI this year — job loss, sickness, maternity or parental leave. Service Canada mails you a T4E slip.",
        amount: "EI benefits received (Box 14)",
        amountHint: "Box 14 on your T4E — total benefits paid to you.",
        amountHelp:
          "Total EI benefits paid to you this year. Includes regular, sickness, parental, and other EI types.",
        taxWithheld: "Tax withheld on EI (Box 22)",
        taxWithheldHint:
          "Box 22 on your T4E. If nothing was withheld, leave it at 0.",
        taxWithheldHelp:
          "Income tax already deducted from your EI payments. Adds to your federal withholding.",
        parental: "These are maternity / parental / adoption EI benefits",
        parentalHelp:
          "Parental and maternity EI is exempt from the EI clawback (Social Benefits Repayment, line 23500). Check this if any portion of your EI was for parental/maternity leave to avoid unnecessary clawback.",
      },
      selfEmployment: {
        section: "Self-employment income (T2125)",
        sectionHint:
          "Only if you freelanced, contracted, or ran a small business. No slip arrives for this — it comes from your own records.",
        grossIncome: "Money the business took in",
        grossIncomeHint:
          "Everything you were paid this year, before subtracting anything.",
        grossIncomeHelp:
          "Total fees, sales, and commissions from your own work — Part 3C of Form T2125. Count what you were paid, not what you were owed, unless you file on an accrual basis.",
        expenses: "Business expenses",
        expensesHint:
          "What you spent to earn it — supplies, software, mileage, home office.",
        expensesHelp:
          "Costs you incurred to earn that income, and only the business share of anything you also use personally. Part 4 of Form T2125 lists the categories. Leave at 0 if you had none.",
        netIncomeLabel: "Net self-employment income",
        netIncomeLossNote:
          "Expenses exceed income, so this is a business loss. That is allowed, and it reduces your total income.",
        cppNote:
          "Self-employed individuals owe both employer + employee CPP (9.9% base + 2% enhanced). We\'ll calculate and apply the CPP deduction and credit automatically based on this net income.",
      },
      investment: {
        section: "Investment income (T5 / T3 / Schedule 3)",
        sectionHint:
          "Only if you earned interest or dividends, or sold an investment this year. Your bank and broker mail the slips by early spring.",
        interest: "Interest income (T5 Box 13)",
        interestHint:
          "Box 13 on the T5 from your bank \u2014 savings account, GIC, or bond interest.",
        interestHelp:
          "Canadian-source interest from bank accounts, GICs, bonds, etc. 100% included in income at your marginal tax rate.",
        eligibleDividends: "Eligible dividends (T5 Box 24)",
        eligibleDividendsHint:
          "Box 24 on your T5 \u2014 copy it as printed. Ignore boxes 25 and 26; we work those out.",
        eligibleDividendsHelp:
          "Dividends from Canadian-controlled public corporations (large corps). Enter the actual amount received \u2014 we automatically apply the 38% gross-up and the federal + provincial dividend tax credit, which is what boxes 25 and 26 on the slip show.",
        nonEligibleDividends: "Non-eligible dividends (T5 Box 10)",
        nonEligibleDividendsHint:
          "Box 10 on your T5 \u2014 copy it as printed. Ignore boxes 11 and 12.",
        nonEligibleDividendsHelp:
          "Dividends from Canadian private corporations (CCPCs) or small businesses. Enter the actual amount received \u2014 we apply the 15% gross-up and the reduced dividend tax credit, which is what boxes 11 and 12 on the slip show.",
        capitalGains: "Capital gains (Schedule 3)",
        capitalGainsHint:
          "Profit on investments you sold this year. Your broker's annual summary or T5008 has the numbers. Nothing sold, leave at 0.",
        capitalGainsHelp:
          "Total capital gains realized this year from sale of investments, real estate, etc. Only 50% is included in taxable income (inclusion rate). Enter your gross gains before losses. There is no single box for this \u2014 it is a Schedule 3 total, so add in T5 box 18 (capital gains dividends) and T3 box 21 if your slips show them.",
        capitalLosses: "Capital losses (Schedule 3)",
        capitalLossesHint: "The same, for anything you sold at a loss.",
        capitalLossesHelp:
          "Total capital losses this year. Applied against capital gains \u2014 net gains below zero produce no income inclusion. Excess losses can be carried back 3 years or forward indefinitely.",
        note: "Foreign dividends and the $250K+ two-thirds capital gains inclusion rate are not yet supported \u2014 coming in a later update.",
      },
    },
    room: {
      title: "Your contribution room",
      hint: "Both numbers are on your CRA Notice of Assessment. They cap what we can recommend.",
      rrspSection: "RRSP",
      fhsaSection: "FHSA",
      fhsaNotEligible:
        "You haven't marked yourself as a first-time home buyer, so the FHSA doesn't apply. Go back to step 1 to change that.",
      rrspRoom: "Available RRSP room",
      rrspRoomHelp:
        "Found on your CRA Notice of Assessment (line A on the RRSP Deduction Limit Statement).",
      fhsaRoom: "Available FHSA room this year",
      fhsaRoomHelp:
        "$8,000 per year if you opened the account, plus any carryforward (max $8,000 carryforward).",
      fhsaLifetimeUsed: "FHSA contributions already made (lifetime)",
      fhsaLifetimeUsedHelp: "Used to check against the $40,000 lifetime limit.",
    },
    results: {
      title: "Your optimized contribution plan",
      hint: "Based on what you entered. Change the strategy or the amount below to see how the result moves.",
      baseline: "Without contributions",
      optimized: "With recommendation",
      recommendation: "Recommendation",
      fhsa: "FHSA contribution",
      rrsp: "RRSP contribution",
      totalContribution: "Total contribution",
      expectedRefund: "Expected refund",
      expectedOwing: "Expected tax owing",
      taxSaved: "Tax saved",
      comparison: {
        header: "Comparison",
        item: "Item",
        totalIncome: "Total income",
        taxableIncome: "Taxable income",
        federalTax: "Federal tax",
        provincialTax: "Provincial tax",
        totalTax: "Total tax",
        effectiveRate: "Effective rate",
        marginalRate: "Marginal rate",
        refundOrOwing: "Refund / (Owing)",
      },
      rationaleTitle: "Why this recommendation",
      warningsTitle: "Things to know",
      backToEdit: "Edit inputs",
    },
    interactive: {
      title: "What if I contribute a different amount?",
      description:
        "Adjust the contribution to see how your refund or tax owing changes. The recommended scenario stays pinned on the left for comparison.",
      sliderLabel: "Contribution amount slider",
      reset: "Reset to recommended",
      recommendedScenario: "Recommended",
      recommendedSubtitle: {
        zero_owing: "Brings tax owing to $0",
        max_refund: "Maximizes refund within available room",
        drop_bracket: "Drops you into a lower tax bracket",
      },
      yourScenario: "Your scenario",
      yourSubtitleSameAsRec: "Same as recommended - adjust to compare",
      yourSubtitleCustom: "Custom amount",
      contribution: "Total contribution",
      fhsa: "FHSA",
      rrsp: "RRSP",
      refund: "Refund",
      owing: "Owing",
      marginalRate: "Marginal rate",
      remainingRoom: "Remaining room",
    },
    strategy: {
      title: "Recommendation strategy",
      subtitle: "Pick the goal you want the optimizer to solve for.",
      zeroOwing: {
        label: "Zero out tax owing",
        desc: "Recommend the smallest contribution that brings your year-end tax owing to $0. Preserves room for future years. (Default)",
      },
      maxRefund: {
        label: "Maximize refund",
        desc: "Use as much of your available room as possible - but stop before taxable income falls below the federal Basic Personal Amount.",
      },
      dropBracket: {
        label: "Drop one tax bracket",
        desc: "Recommend the smallest contribution that lowers your combined marginal tax rate by one bracket (federal + provincial).",
      },
    },
    rationale: {
      rationale_strategy_already_refund:
        "You are already getting a ${refund} refund without any contributions. The recommendation is $0 - no need to use your RRSP or FHSA room just to break even. Use the slider below to explore how contributions could increase your refund.",
      rationale_strategy_zero_owing:
        "You would owe ${baselineOwing} in tax without contributions. The recommendation is ${total} - just enough to zero out what you owe, while preserving the rest of your contribution room.",
      rationale_strategy_room_capped:
        "Even using all ${total} of your available contribution room, you would still owe ${remainingOwing} this year. The recommendation uses your full room as the best available option.",
      rationale_strategy_no_room:
        "You would owe ${owing} in tax, but you have $0 available RRSP or FHSA room to reduce it. Check your CRA Notice of Assessment for your available room.",
      rationale_fhsa_priority:
        "FHSA first: ${amount}. As a first-time home buyer, FHSA gives you double benefit (deduction now + tax-free withdrawal for a home).",
      rationale_rrsp_amount: "RRSP: ${amount}. Reduces your taxable income further.",
      rationale_tax_saved:
        "This plan saves you ${saved} in tax - an effective return of {effectiveSavingsRate}% on every dollar contributed.",
      rationale_try_slider:
        "Want to see different scenarios? Use the contribution adjuster below to compare different amounts and their refunds.",
      rationale_strategy_max_refund:
        "Strategy: maximize refund. The recommendation is to contribute ${total} - using your full available room - for an expected refund of ${refund}.",
      rationale_strategy_max_refund_bpa_capped:
        "Strategy: maximize refund, capped at the Basic Personal Amount. Contributing more than ${total} would push your taxable income below the BPA and produce no additional refund - better to save the rest of your room for future years. Expected refund: ${refund}.",
      rationale_strategy_drop_bracket:
        "Strategy: drop one tax bracket. Contributing ${total} drops your combined marginal rate from {oldRate}% to {newRate}%.",
      rationale_strategy_drop_bracket_capped:
        "Strategy: drop one tax bracket. Even using all ${total} of your available room, your combined marginal rate stays at {rate}% - you cannot quite reach the next bracket below. Recommendation uses your full room as the closest you can get.",
      rationale_strategy_already_lowest_bracket:
        "Strategy: drop one tax bracket. You are already in the lowest combined marginal bracket at {rate}% - there is no lower bracket to drop into. No contribution is needed for this strategy.",
      rationale_strategy_diminishing_returns_capped:
        "The recommendation is ${total} - the point where extra contributions stop helping. Your income tax is already reduced to $0 at that amount, and the ${remainingOwing} left over is made up of contributions and premiums (CPP/QPP, EI, QPIP, health contributions) that RRSP and FHSA deductions cannot reduce. Contributing more would save nothing while permanently using up room, so the rest stays available for future years.",
    },
    warning: {
      fhsa_lifetime_low:
        "You are close to the $40,000 FHSA lifetime limit. Only ${remaining} remaining after this contribution.",
      rrsp_room_maxed: "You will be using your full available RRSP room this year.",
      below_bpa:
        "Caution: Your taxable income falls below the Basic Personal Amount ({bpa}). Extra contributions beyond this point provide no immediate tax benefit and should be saved for higher-income years.",
      fhsa_requires_first_time_buyer:
        "You entered FHSA room but indicated you are not a first-time home buyer. FHSA contributions require first-time buyer status.",
    },
    provinces: {
      BC: "British Columbia",
      ON: "Ontario",
      QC: "Quebec",
    },
  },
  zh: {
    app: {
      // 品牌名不翻译，中文用「省税空间」作副名 —— 将来换英文名也不用动中文。
      title: "RoomToSave 省税空间 — RRSP / FHSA 供款规划",
      shortTitle: "RoomToSave",
      subtitle: "找到最佳 RRSP 和 FHSA 供款组合，最大化你的退税。",
    },
    disclaimer:
      "本工具仅提供估算，不构成专业税务建议。最终金额以 CRA 评估为准。",
    wizard: {
      steps: {
        basic: "基本信息",
        employment: "工资收入",
        room: "供款额度",
        results: "结果",
      },
      stepHints: {
        basic: "年度与省份",
        employment: "T4 与 RL-1",
        room: "RRSP 与 FHSA",
        results: "供款建议",
      },
      next: "下一步",
      prev: "上一步",
      calculate: "计算",
      reset: "重新开始",
    },
    basic: {
      title: "先告诉我们你的基本情况",
      hint: "这三项决定了后面所有计算适用的税率表和上限。",
      section: "基本信息",
      taxYear: "报税年度",
      province: "居住省份",
      age: "年龄",
      ageHelp: "报税年度 12 月 31 日的年龄，影响 RRSP 年龄上限和与年龄相关的抵免。",
      firstTimeBuyer: "我是首次购房者",
      firstTimeBuyerHelp:
        "你和配偶在本税年及之前四个日历年度均未拥有并居住过自有住房。",
      trySample: "赶时间？用示例数据直接看结果",
    },
    employment: {
      title: "输入你的 T4 工资收入",
      gross: "工资总收入（Box 14）",
      grossHint: "T4 单据的框 14 —— 扣任何东西之前的工资。",
      grossHelp: "扣除前的工资总额。",
      federalTaxWithheldQC: "已扣联邦税（Box 22）",
      federalTaxWithheldQCHint:
        "T4 单据的框 22。魁省的这一框只含联邦税，省税在下面的 RL-1 单据上。",
      incomeTaxDeducted: "已扣所得税（Box 22）",
      incomeTaxDeductedHint:
        "T4 单据的框 22 —— 全年从工资里已经预扣走的税。",
      incomeTaxDeductedHelp:
        "魁省以外，T4 Box 22 是联邦税与省税的合计，单据上只有这一个框，没有单独的省税框。照单据原样抄写即可，不需要自己拆分。",
      provincialTaxWithheldQC: "已扣魁省税（RL-1 Box E）",
      provincialTaxWithheldQCHint:
        "RL-1 单据的框 E —— 雇主另外发的那张魁省单据。",
      cppContribution: "CPP 供款（Box 16）",
      cppContributionHint: "T4 单据的框 16。",
      cppContributionQC: "QPP 供款（Box 17）",
      cppContributionQCHint: "T4 单据的框 17。",
      eiPremium: "EI 保费（Box 18）",
      eiPremiumHint: "T4 单据的框 18。",
      ppipPremium: "QPIP 保费（Box 55）",
      ppipPremiumHint: "T4 单据的框 55，或 RL-1 的框 H。",
      ppipPremiumHelp: "魁北克省父母保险计划保费，来自 T4 Box 55 或 RL-1 Box H。仅限 QC 居民。",
      transcribeHint: "照着单据抄写。每个字段左侧的灰块是它的框号。",
      slipSection: "T4 单据",
      rl1Section: "RL-1 单据",
      fieldCount: "{n} 项",
      fieldCountOne: "{n} 项",
      cpp2MirrorHelp: "与 T4 Box 17A 相同，两张单据必须一致。",
      cpp2MirrorHint: "RL-1 单据的框 B.B —— 和 T4 框 17A 是同一个数。",
      cppPensionable: "CPP 可计养老金收入（Box 26）",
      cppPensionableHint: "T4 单据的框 26。那一框如果是空的，填框 14 的数。",
      cppPensionableHelp:
        "T4 上的 Box 26。通常等于 Box 14（总收入），但如果你未满 18 岁、超过 70 岁或部分年度免除，则可能不同。留空则默认等于 Box 14。用于正确拆分 CPP 基础 / 增强 / 多缴退款。",
      cpp2Contribution: "CPP 第二附加供款（Box 16A）",
      cpp2ContributionHint: "T4 单据的框 16A。单据上没有这一框就留 0。",
      cpp2ContributionQC: "QPP 第二附加供款（Box 17A / RL-1 Box B.B）",
      cpp2ContributionQCHint: "T4 单据的框 17A。单据上没有这一框就留 0。",
      cpp2ContributionHelp:
        "CPP2/QPP2 —— 对第一上限（2025 年 $71,300）到第二上限（$81,200）之间的收入按 4% 征收，因此最高 $396。它在工资单上有独立的框，与 Box 16/17 分开；收入低于第一上限时该框为空。这笔可全额扣除，漏填会多缴税。若你单据上该框为空，保持 $0 即可。",
      privateDrugCoverage: "我有私人处方药保险（如雇主团体计划）",
      privateDrugCoverageHelp:
        "仅魁省。若你全年由私人或团体药物保险承保，则免缴 RAMQ 处方药保险费（最高 $755），保费为 $0。若由 RAMQ 公共计划承保，请不要勾选。",
      note: "租金和养老金收入支持将在后续 P1 更新中提供。",
    },
    otherIncome: {
      section: "其他收入",
      asNeeded: "按需填写",
      add: "添加",
      remove: "移除",
      toggle: "我有其他收入（EI 福利 / 自雇）",
      toggleHelp:
        "如果你收到了 EI 福利（T4E）或有自雇收入（T2125），请展开填写。",
      ei: {
        section: "EI 福利（T4E）",
        sectionHint:
          "今年领过失业金才填 —— 失业、病假、产假或育儿假。Service Canada 会寄给你一张 T4E 单据。",
        amount: "EI 福利金额（Box 14）",
        amountHint: "T4E 单据的框 14 —— 全年发给你的福利总额。",
        amountHelp:
          "本年度收到的全部 EI 福利，包括普通、病假、育儿及其他 EI 类型。",
        taxWithheld: "EI 已扣税（Box 22）",
        taxWithheldHint: "T4E 单据的框 22。没有扣过税就留 0。",
        taxWithheldHelp:
          "EI 付款中已扣除的所得税，计入联邦预扣税总额。",
        parental: "这是产假 / 育儿假 / 收养假 EI 福利",
        parentalHelp:
          "产假和育儿假 EI 免于回扣（Social Benefits Repayment, line 23500）。如果你的 EI 包含产假/育儿假部分，请勾选以避免不必要的回扣。",
      },
      selfEmployment: {
        section: "自雇收入（T2125）",
        sectionHint:
          "接私活、做自由职业或开小生意才填。这一项没有单据，数字来自你自己的记账。",
        grossIncome: "生意收进来的钱",
        grossIncomeHint: "今年别人付给你的全部钱，扣成本之前。",
        grossIncomeHelp:
          "你靠自己干活收到的服务费、货款和佣金总额 —— 对应 T2125 表格的 Part 3C。按实际收到的记，除非你用权责发生制报税。",
        expenses: "经营支出",
        expensesHint: "为了赚这笔钱花掉的成本 —— 材料、软件、车油、家庭办公室。",
        expensesHelp:
          "为赚取这笔收入而产生的成本；公私两用的东西只能算业务占的那一部分。T2125 表格 Part 4 列出了所有类别。没有支出就留 0。",
        netIncomeLabel: "自雇净收入",
        netIncomeLossNote:
          "支出超过收入，也就是经营亏损。这是允许的，会相应减少你的总收入。",
        cppNote:
          "自雇人士需同时缴纳雇主 + 雇员 CPP（9.9% 基础 + 2% 增强）。我们会根据此净收入自动计算并应用 CPP 扣减和抵免。",
      },
      investment: {
        section: "投资收入（T5 / T3 / Schedule 3）",
        sectionHint:
          "有利息、股息，或者今年卖过投资才填。银行和券商开春前会把单据寄给你。",
        interest: "利息收入（T5 Box 13）",
        interestHint: "银行寄来的 T5 单据框 13 —— 存款、GIC、债券的利息。",
        interestHelp:
          "加拿大来源的银行账户、GIC、债券等利息。100% 计入收入，按边际税率征税。",
        eligibleDividends: "合格股息（T5 Box 24）",
        eligibleDividendsHint:
          "T5 单据的框 24，原样抄。框 25 和 26 不用管，我们会算。",
        eligibleDividendsHelp:
          "来自加拿大上市公司（大型公司）的股息。请输入实际收到的金额 — 我们自动应用 38% 上调和联邦 + 省股息税收抵免，也就是单据上框 25 和 26 的那两个数。",
        nonEligibleDividends: "非合格股息（T5 Box 10）",
        nonEligibleDividendsHint: "T5 单据的框 10，原样抄。框 11 和 12 不用管。",
        nonEligibleDividendsHelp:
          "来自加拿大私人公司（CCPC）或小型企业的股息。请输入实际收到的金额 — 我们应用 15% 上调和较低的股息税收抵免，也就是单据上框 11 和 12 的那两个数。",
        capitalGains: "资本利得（Schedule 3）",
        capitalGainsHint:
          "今年卖掉投资赚的钱。券商的年度报表或 T5008 上有。没卖过就留 0。",
        capitalGainsHelp:
          "本年度出售投资、房产等实现的资本利得总额。50% 计入应税收入（包含率）。请输入扣除损失前的总利得。这一项没有单一的框号，它是 Schedule 3 的汇总数 —— 如果你的单据上有 T5 框 18（资本利得股息）或 T3 框 21，也要一并加进来。",
        capitalLosses: "资本损失（Schedule 3）",
        capitalLossesHint: "同样是今年卖出的，但卖亏了的那部分。",
        capitalLossesHelp:
          "本年度资本损失。用于抵消资本利得 — 净利得低于零时不计入收入。多余损失可向前结转 3 年或无限期向后结转。",
        note: "外国股息和 $250K+ 的三分之二资本利得包含率尚未支持 — 将在后续更新中提供。",
      },
    },
    room: {
      title: "你的供款额度",
      hint: "两个数字都能在 CRA Notice of Assessment 上找到，它们决定了我们能建议的上限。",
      rrspSection: "RRSP",
      fhsaSection: "FHSA",
      fhsaNotEligible:
        "你没有勾选「首次购房者」，因此 FHSA 不适用。如需修改，请返回第 1 步。",
      rrspRoom: "可用 RRSP 额度",
      rrspRoomHelp:
        "参见 CRA Notice of Assessment（RRSP Deduction Limit Statement 的 line A）。",
      fhsaRoom: "今年可用 FHSA 额度",
      fhsaRoomHelp:
        "开户后每年 $8,000，加上结转额度（结转上限 $8,000）。",
      fhsaLifetimeUsed: "已使用 FHSA 供款（终身累计）",
      fhsaLifetimeUsedHelp: "用于检查是否超过 $40,000 终身上限。",
    },
    results: {
      title: "你的优化供款方案",
      hint: "基于你填写的内容。可以在下面切换策略或调整金额，看结果如何变化。",
      baseline: "不供款时",
      optimized: "推荐方案",
      recommendation: "推荐",
      fhsa: "FHSA 供款",
      rrsp: "RRSP 供款",
      totalContribution: "总供款",
      expectedRefund: "预期退税",
      expectedOwing: "预期补税",
      taxSaved: "节省税款",
      comparison: {
        header: "对比",
        item: "项目",
        totalIncome: "总收入",
        taxableIncome: "应税收入",
        federalTax: "联邦税",
        provincialTax: "省税",
        totalTax: "总税款",
        effectiveRate: "实际税率",
        marginalRate: "边际税率",
        refundOrOwing: "退税 / （补税）",
      },
      rationaleTitle: "为什么这样推荐",
      warningsTitle: "注意事项",
      backToEdit: "修改输入",
    },
    interactive: {
      title: "如果供款金额不同呢？",
      description:
        "拖动滑块查看不同供款对退税或补税的影响。推荐方案始终固定在左侧供对比。",
      sliderLabel: "供款金额滑块",
      reset: "重置为推荐值",
      recommendedScenario: "推荐方案",
      recommendedSubtitle: {
        zero_owing: "让补税额降为 $0",
        max_refund: "在可用额度内最大化退税",
        drop_bracket: "降到更低的税阶",
      },
      yourScenario: "你的方案",
      yourSubtitleSameAsRec: "与推荐相同 — 拖动滑块对比",
      yourSubtitleCustom: "自定义金额",
      contribution: "总供款",
      fhsa: "FHSA",
      rrsp: "RRSP",
      refund: "退税",
      owing: "补税",
      marginalRate: "边际税率",
      remainingRoom: "剩余额度",
    },
    strategy: {
      title: "推荐策略",
      subtitle: "选择你希望优化器实现的目标。",
      zeroOwing: {
        label: "补税归零",
        desc: "推荐最小供款，让年终补税额降为 $0。保留额度留给未来年份。（默认）",
      },
      maxRefund: {
        label: "退税最大化",
        desc: "尽可能使用所有可用额度 — 但不会让应税收入低于联邦 Basic Personal Amount。",
      },
      dropBracket: {
        label: "降一个税阶",
        desc: "推荐最小供款，让你的 combined 边际税率（联邦 + 省）降一个档。",
      },
    },
    rationale: {
      rationale_strategy_already_refund:
        "你不供款时已经有 ${refund} 退税。默认推荐 $0 — 不必为了打平消耗 RRSP / FHSA 额度，保留给未来年份更有价値。可以用下方滑块查看供款能让退税增加多少。",
      rationale_strategy_zero_owing:
        "不供款时你预计要补税 ${baselineOwing}。推荐供款 ${total} — 刚好让补税额降到 0，不浪费额度也不让 CRA 多扣。",
      rationale_strategy_room_capped:
        "即使用尽全部 ${total} 可用额度，今年仍需补税 ${remainingOwing}。已推荐使用全部额度作为目前最佳方案。",
      rationale_strategy_no_room:
        "你预计要补税 ${owing}，但当前可用 RRSP / FHSA 额度为 $0，无法通过供款减税。可查询 CRA Notice of Assessment 确认你的可用额度。",
      rationale_fhsa_priority:
        "优先使用 FHSA：${amount}。作为首次购房者，FHSA 享受双重免税（供款抵扣 + 合资格取款免税）。",
      rationale_rrsp_amount: "RRSP 供款 ${amount}，进一步降低应税收入。",
      rationale_tax_saved:
        "此方案为你节省 ${saved} 税款 — 每供款 $1 获得 {effectiveSavingsRate}% 的有效回报。",
      rationale_try_slider: "想看其他方案？用下方供款调节器对比不同供款金额对应的退税。",
      rationale_strategy_max_refund:
        "策略：退税最大化。推荐供款 ${total}（用尽可用额度），预期退税 ${refund}。",
      rationale_strategy_max_refund_bpa_capped:
        "策略：退税最大化，在 BPA 处止步。再多供款会把应税收入推到联邦 Basic Personal Amount 以下，今年无额外税务收益 — 剩余额度建议保留给未来高收入年份。推荐供款 ${total}，预期退税 ${refund}。",
      rationale_strategy_drop_bracket:
        "策略：降到下一个税阶。供款 ${total} 让 combined 边际税率从 {oldRate}% 降到 {newRate}%。",
      rationale_strategy_drop_bracket_capped:
        "策略：降到下一个税阶。即使用尽全部 ${total} 可用额度，combined 边际税率仍为 {rate}% — 差一点降不到下一档。已推荐使用全部额度作为目前最接近的方案。",
      rationale_strategy_already_lowest_bracket:
        "策略：降到下一个税阶。当前 combined 边际税率 {rate}% 已是最低档 — 没有更低的税阶可降。该策略下无需供款。",
      rationale_strategy_diminishing_returns_capped:
        "推荐 ${total} — 再多供就没有效果了。到这个金额时你的所得税已降到 $0，剩下的 ${remainingOwing} 是 CPP/QPP、EI、QPIP、健康供款这类项目，RRSP / FHSA 扣除无法减少它们。继续供款省不到钱，却会永久消耗额度，所以其余额度留给以后年度。",
    },
    warning: {
      fhsa_lifetime_low:
        "你已接近 FHSA $40,000 终身上限。本次供款后剩余 ${remaining}。",
      rrsp_room_maxed: "你将用完今年所有可用的 RRSP 额度。",
      below_bpa:
        "提示：你的应税收入会降到 Basic Personal Amount（{bpa}）以下。超过此点的供款不产生即时税务收益，建议保留到未来高收入年份。",
      fhsa_requires_first_time_buyer:
        "你填写了 FHSA 额度但表明非首次购房者。FHSA 供款要求首次购房者身份。",
    },
    provinces: {
      BC: "不列颤哥伦比亚省",
      ON: "安大略省",
      QC: "魁北克省",
    },
  },
};

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\$?\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v !== undefined ? String(v) : "";
  });
}
