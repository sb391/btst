import type { BankAnalytics, CounterpartySummary, ExtractedFieldRecord } from "@/lib/types";
import { average, clamp, safeNumber } from "@/lib/utils";

interface TransactionRow {
  date: string;
  description: string;
  type: "credit" | "debit";
  amount: number;
  balance: number;
}

function parseCsvRows(text: string): TransactionRow[] {
  const [headerLine, ...rows] = text.split(/\r?\n/).filter(Boolean);

  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(",").map((item) => item.trim().toLowerCase());
  const dateIndex = headers.findIndex((item) => item.includes("date"));
  const descriptionIndex = headers.findIndex((item) => item.includes("description"));
  const typeIndex = headers.findIndex((item) => item.includes("type"));
  const amountIndex = headers.findIndex((item) => item.includes("amount"));
  const balanceIndex = headers.findIndex((item) => item.includes("balance"));

  return rows
    .map((line) => line.split(","))
    .filter((line) => line.length >= 4)
    .map((columns) => ({
      date: columns[dateIndex]?.trim() ?? "",
      description: columns[descriptionIndex]?.trim() ?? "Unknown",
      type: (columns[typeIndex]?.trim().toLowerCase() === "debit" ? "debit" : "credit") as
        | "credit"
        | "debit",
      amount: safeNumber(columns[amountIndex]?.replace(/,/g, "")),
      balance: safeNumber(columns[balanceIndex]?.replace(/,/g, ""))
    }))
    .filter((row) => row.amount > 0);
}

function monthKey(dateString: string) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString("en-IN", { month: "short" });
}

function buildMonthlySeries(transactions: TransactionRow[], type: "credit" | "debit") {
  const grouped = new Map<string, number>();

  for (const transaction of transactions.filter((row) => row.type === type)) {
    const key = monthKey(transaction.date);
    grouped.set(key, (grouped.get(key) ?? 0) + transaction.amount);
  }

  return Array.from(grouped.entries()).map(([month, amount]) => ({ month, amount }));
}

function summarizeCounterparties(transactions: TransactionRow[]): CounterpartySummary[] {
  const map = new Map<string, CounterpartySummary>();

  for (const transaction of transactions) {
    const key = transaction.description;
    const existing = map.get(key) ?? { name: key, credits: 0, debits: 0 };

    if (transaction.type === "credit") {
      existing.credits += transaction.amount;
    } else {
      existing.debits += transaction.amount;
    }

    map.set(key, existing);
  }

  return Array.from(map.values())
    .sort((left, right) => right.credits + right.debits - (left.credits + left.debits))
    .slice(0, 5);
}

export function analyzeBankStatement(text: string): {
  analytics: BankAnalytics;
  extractedFields: ExtractedFieldRecord[];
} {
  const transactions = parseCsvRows(text);
  const balances = transactions.map((row) => row.balance).filter((value) => value > 0);
  const monthlyCredits = buildMonthlySeries(transactions, "credit");
  const monthlyDebits = buildMonthlySeries(transactions, "debit");
  const cashDeposits = transactions.filter((row) => /cash/i.test(row.description) && row.type === "credit");
  const chequeBounces = transactions.filter((row) => /bounce|return/i.test(row.description));
  const emiBounces = transactions.filter((row) => /emi/i.test(row.description) && /bounce|return/i.test(row.description));
  const monthlyCreditValues = monthlyCredits.map((item) => item.amount);
  const monthlyDebitValues = monthlyDebits.map((item) => item.amount);
  const averageCredit = average(monthlyCreditValues);
  const creditVolatility = averageCredit
    ? average(monthlyCreditValues.map((value) => Math.abs(value - averageCredit) / averageCredit))
    : 0.5;
  const averageDebit = average(monthlyDebitValues);
  const debitVolatility = averageDebit
    ? average(monthlyDebitValues.map((value) => Math.abs(value - averageDebit) / averageDebit))
    : 0.5;
  const averageBalance = average(balances);
  const cashDepositRatio = monthlyCreditValues.reduce((sum, value) => sum + value, 0)
    ? cashDeposits.reduce((sum, row) => sum + row.amount, 0) /
      monthlyCreditValues.reduce((sum, value) => sum + value, 0) *
      100
    : 0;
  const abnormalSpikes = monthlyCredits
    .filter((item) => averageCredit > 0 && item.amount > averageCredit * 1.25)
    .map((item) => `${item.month} credits are materially above the recent mean.`);
  const relatedPartySignals = transactions
    .filter((row) => /director|proprietor|partner|self/i.test(row.description))
    .map((row) => `Review ${row.description} dated ${row.date} for related-party characteristics.`);
  const healthScore = clamp(
    82 -
      chequeBounces.length * 8 -
      emiBounces.length * 10 -
      Math.min(cashDepositRatio, 25) * 0.5 -
      creditVolatility * 20 -
      debitVolatility * 15 +
      Math.min(averageBalance / 200000, 10),
    25,
    95
  );

  const analytics: BankAnalytics = {
    monthlyCredits,
    monthlyDebits,
    averageBalance,
    minBalance: balances.length ? Math.min(...balances) : 0,
    maxBalance: balances.length ? Math.max(...balances) : 0,
    cashDepositRatio: Number(cashDepositRatio.toFixed(1)),
    chequeBounceCount: chequeBounces.length,
    emiBounceCount: emiBounces.length,
    inwardConsistency: clamp(100 - creditVolatility * 100, 0, 100),
    outwardConsistency: clamp(100 - debitVolatility * 100, 0, 100),
    topCounterparties: summarizeCounterparties(transactions),
    abnormalSpikes,
    seasonality:
      abnormalSpikes.length > 0 ? ["Demand spikes visible; reconcile with anchor shipment cadence."] : [],
    relatedPartySignals,
    healthScore,
    extractionConfidence: transactions.length > 3 ? 0.9 : 0.56
  };

  const extractedFields: ExtractedFieldRecord[] = [
    {
      section: "Bank",
      field: "Average Balance",
      value: averageBalance.toFixed(0),
      confidence: 0.9
    },
    {
      section: "Bank",
      field: "Cash Deposit Ratio",
      value: `${analytics.cashDepositRatio}%`,
      confidence: 0.85
    },
    {
      section: "Bank",
      field: "Cheque Bounce Count",
      value: String(analytics.chequeBounceCount),
      confidence: 0.85
    },
    {
      section: "Bank",
      field: "EMI Bounce Count",
      value: String(analytics.emiBounceCount),
      confidence: 0.82
    }
  ];

  return { analytics, extractedFields };
}
