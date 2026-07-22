import { describe, it } from 'vitest';
import { calculateTax } from '../calculator';

describe('S8 S9 debug', () => {
  it('S8: ON 2025 $25K', () => {
    const s8 = calculateTax({
      taxYear: 2025,
      province: 'ON',
      age: 30,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 10000,
      fhsaRoomAvailable: 8000,
      fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 25000,
          federalTaxWithheld: 1500,
          provincialTaxWithheld: 0,
          cppContribution: 1279.25,
          eiPremium: 410,
          cppPensionableEarnings: 25000,
        }
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 }
    });
    console.log('=== S8: ON 2025 $25K ===');
    console.log('totalIncome:', s8.totalIncome);
    console.log('netIncome:', s8.netIncome);
    console.log('taxableIncome:', s8.taxableIncome);
    console.log('federalTaxBeforeCredits:', s8.federalTaxBeforeCredits);
    console.log('federalCredits:', s8.federalCredits);
    console.log('netFederalTax:', s8.netFederalTax);
    console.log('provincialTaxBeforeCredits:', s8.provincialTaxBeforeCredits);
    console.log('provincialCredits:', s8.provincialCredits);
    console.log('provincialSurtax:', s8.provincialSurtax);
    console.log('provincialLiftCredit:', s8.provincialLiftCredit);
    console.log('provincialHealthPremium:', s8.provincialHealthPremium);
    console.log('netProvincialTax:', s8.netProvincialTax);
    console.log('totalTax:', s8.totalTax);
    console.log('totalTaxWithheld:', s8.totalTaxWithheld);
    console.log('refundOrOwing:', s8.refundOrOwing);
  });

  it('S9: ON 2025 $180K', () => {
    const s9 = calculateTax({
      taxYear: 2025,
      province: 'ON',
      age: 40,
      isFirstTimeHomeBuyer: false,
      rrspRoomAvailable: 32490,
      fhsaRoomAvailable: 8000,
      fhsaLifetimeUsed: 0,
      income: {
        employment: {
          gross: 180000,
          federalTaxWithheld: 42000,
          provincialTaxWithheld: 0,
          cppContribution: 4034.10,
          eiPremium: 1077.48,
          cppPensionableEarnings: 71300,
        }
      },
      deductions: { rrspContribution: 0, fhsaContribution: 0 }
    });
    console.log('=== S9: ON 2025 $180K ===');
    console.log('totalIncome:', s9.totalIncome);
    console.log('netIncome:', s9.netIncome);
    console.log('taxableIncome:', s9.taxableIncome);
    console.log('federalTaxBeforeCredits:', s9.federalTaxBeforeCredits);
    console.log('federalCredits:', s9.federalCredits);
    console.log('netFederalTax:', s9.netFederalTax);
    console.log('provincialTaxBeforeCredits:', s9.provincialTaxBeforeCredits);
    console.log('provincialCredits:', s9.provincialCredits);
    console.log('provincialSurtax:', s9.provincialSurtax);
    console.log('provincialLiftCredit:', s9.provincialLiftCredit);
    console.log('provincialHealthPremium:', s9.provincialHealthPremium);
    console.log('netProvincialTax:', s9.netProvincialTax);
    console.log('totalTax:', s9.totalTax);
    console.log('totalTaxWithheld:', s9.totalTaxWithheld);
    console.log('refundOrOwing:', s9.refundOrOwing);
  });
});
