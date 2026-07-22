export * from "./types";
export { calculateTax } from "./calculator";
export {
  optimize,
  calculateScenario,
  splitContribution,
  type OptimizeOptions,
} from "./optimizer";
export {
  getFederalConfig,
  getProvincialConfig,
  getSupportedProvinces,
  getSupportedYears,
} from "./data";
