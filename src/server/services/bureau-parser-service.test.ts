import { parseBureauReport } from "@/server/services/bureau-parser-service";

describe("parseBureauReport", () => {
  it("extracts key bureau variables from text", () => {
    const result = parseBureauReport(`
      CIBIL Score: 772
      Active Loans: 4
      Overdues: 0
      Credit Utilization: 32
      Enquiry Count: 3
      Loan Vintage: 48
      DPD History: 000 000 030 000 000 000
    `);

    expect(result.summary.score).toBe(772);
    expect(result.summary.activeLoans).toBe(4);
    expect(result.summary.enquiryCount).toBe(3);
    expect(result.summary.dpdPatterns).toContain("030");
  });
});
