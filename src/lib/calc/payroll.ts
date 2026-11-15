/**
 * Payroll — pure, unit tested. Mirrors the payroll_line_values view.
 * gross = days × daily rate + overtime hours × (daily rate ÷ hours per day) × overtime multiplier + bonus
 * net = gross − advances − other deductions
 */
import { roundMoney, type CurrencyCode } from "./money";

export function payslip(
  input: { days: number; overtimeHours: number; dailyRate: number; bonus?: number; advances?: number; deduction?: number },
  settings: { hoursPerDay: number; overtimeMultiplier: number },
  currency: CurrencyCode,
) {
  const base = roundMoney(input.days * input.dailyRate, currency);
  const overtime = roundMoney(((input.overtimeHours * input.dailyRate) / settings.hoursPerDay) * settings.overtimeMultiplier, currency);
  const gross = roundMoney(base + overtime + (input.bonus ?? 0), currency);
  const net = roundMoney(gross - (input.advances ?? 0) - (input.deduction ?? 0), currency);
  return { base, overtime, gross, net };
}

/** Attendance must be 0, ½ or 1 day. */
export function normaliseDays(value: number): 0 | 0.5 | 1 {
  if (value >= 0.75) return 1;
  if (value >= 0.25) return 0.5;
  return 0;
}
