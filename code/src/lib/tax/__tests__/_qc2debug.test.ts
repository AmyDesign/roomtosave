import { describe, it } from "vitest";
import { calculateTax } from "../calculator";
import type { TaxInput } from "../types";

describe("QC2 debug", () => {
  it("prints breakdown", () => {
    const input = {
      taxYear: 2025, province: "QC", age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 0, fhsaRoomAvailable: 0, fhsaLifetimeUsed: 0,
      income: { employment: {
        gross: 50000, federalTaxWithheld: 3600, provincialTaxWithheld: 4200,
        cppContribution: 2976, eiPremium: 655, ppipPremium: 247,
      }},
      deductions: { rrspContribution: 0, fhsaContribution: 0 },
    } as unknown as TaxInput;
    console.log(JSON.stringify(calculateTax(input), null, 2));
  });
});
