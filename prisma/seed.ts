import { PrismaClient } from "@prisma/client";

import { availablePolicies, demoCaseWorkspace } from "../src/lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.analystNote.deleteMany(),
    prisma.analystDecision.deleteMany(),
    prisma.llmMemo.deleteMany(),
    prisma.scoreSnapshot.deleteMany(),
    prisma.fraudFlag.deleteMany(),
    prisma.tradeVerification.deleteMany(),
    prisma.invoiceRecord.deleteMany(),
    prisma.bankAnalytics.deleteMany(),
    prisma.gstSummary.deleteMany(),
    prisma.bureauSummary.deleteMany(),
    prisma.extractedField.deleteMany(),
    prisma.uploadedDocument.deleteMany(),
    prisma.repaymentOutcome.deleteMany(),
    prisma.underwritingCase.deleteMany(),
    prisma.borrower.deleteMany(),
    prisma.user.deleteMany(),
    prisma.policyConfig.deleteMany(),
    prisma.modelVersion.deleteMany(),
    prisma.promptVersion.deleteMany()
  ]);

  const admin = await prisma.user.create({
    data: {
      email: "admin@local.internal",
      name: "Local Admin",
      role: "ADMIN"
    }
  });

  const analyst = await prisma.user.create({
    data: {
      email: "analyst@local.internal",
      name: "Local Analyst",
      role: "ANALYST"
    }
  });

  const policyRecords = await Promise.all(
    availablePolicies.map((policy) =>
      prisma.policyConfig.create({
        data: {
          name: `${policy.borrowerType} Underwriting Policy`,
          borrowerType: policy.borrowerType,
          version: policy.version,
          weights: policy.weights,
          rules: policy.rules,
          active: true
        }
      })
    )
  );

  const modelVersion = await prisma.modelVersion.create({
    data: {
      name: "mock-underwriting-llm",
      version: demoCaseWorkspace.llmMemo.modelVersion,
      description: "Mock provider for local MVP narrative generation.",
      config: {
        provider: "mock"
      },
      active: true
    }
  });

  const promptVersion = await prisma.promptVersion.create({
    data: {
      name: "underwriting-memo",
      version: demoCaseWorkspace.llmMemo.promptVersion,
      template:
        "Summarize strengths, risks, contradictions, policy exceptions, and next analyst questions from structured case evidence.",
      config: {
        temperature: 0.2
      },
      active: true
    }
  });

  const borrower = await prisma.borrower.create({
    data: {
      legalName: demoCaseWorkspace.borrower.legalName,
      borrowerType: demoCaseWorkspace.borrower.borrowerType,
      gstin: demoCaseWorkspace.borrower.gstin,
      pan: demoCaseWorkspace.borrower.pan,
      state: demoCaseWorkspace.borrower.state,
      anchorName: demoCaseWorkspace.borrower.anchorName,
      dealerCode: demoCaseWorkspace.borrower.dealerCode,
      customerCode: demoCaseWorkspace.borrower.customerCode,
      metadata: demoCaseWorkspace.borrower.metadata
    }
  });

  const policy = policyRecords.find(
    (record) => record.borrowerType === demoCaseWorkspace.borrower.borrowerType
  );

  const underwritingCase = await prisma.underwritingCase.create({
    data: {
      id: demoCaseWorkspace.caseId,
      caseNumber: demoCaseWorkspace.caseNumber,
      borrowerId: borrower.id,
      status: "REVIEW",
      requestedAmount: demoCaseWorkspace.decision.recommendedLimit,
      requestedTenorDays: demoCaseWorkspace.decision.recommendedTenorDays,
      compositeScore: demoCaseWorkspace.decision.compositeScore,
      riskGrade: demoCaseWorkspace.decision.riskGrade,
      recommendation: demoCaseWorkspace.decision.recommendation,
      overallConfidence: demoCaseWorkspace.decision.confidence,
      policyConfigId: policy?.id,
      modelVersionId: modelVersion.id,
      promptVersionId: promptVersion.id
    }
  });

  await prisma.uploadedDocument.createMany({
    data: demoCaseWorkspace.documents.map((document) => ({
      id: document.id,
      caseId: underwritingCase.id,
      type: document.type,
      status: document.status,
      originalFileName: document.name,
      mimeType: document.name.endsWith(".csv") ? "text/csv" : "application/pdf",
      sizeBytes: 1200,
      storagePath: `public/demo/${
        document.name.endsWith(".csv")
          ? "bank-statement.csv"
          : document.type === "INVOICE"
            ? "invoice.txt"
            : document.type === "GST_PULL"
              ? "gst-api-response.json"
              : "bureau-report.txt"
      }`,
      extractionConfidence: document.extractionConfidence,
      rawText: document.notes
    }))
  });

  await prisma.extractedField.createMany({
    data: demoCaseWorkspace.extractedFields.map((field) => ({
      caseId: underwritingCase.id,
      section: field.section,
      fieldKey: field.field,
      valueString: field.value,
      confidence: field.confidence
    }))
  });

  if (demoCaseWorkspace.bureauSummary) {
    await prisma.bureauSummary.create({
      data: {
        caseId: underwritingCase.id,
        score: demoCaseWorkspace.bureauSummary.score,
        activeLoans: demoCaseWorkspace.bureauSummary.activeLoans,
        overdueHistory: demoCaseWorkspace.bureauSummary.overdueHistory,
        dpdPatterns: demoCaseWorkspace.bureauSummary.dpdPatterns,
        creditUtilization: demoCaseWorkspace.bureauSummary.creditUtilization,
        unsecuredMix: demoCaseWorkspace.bureauSummary.unsecuredMix,
        securedMix: demoCaseWorkspace.bureauSummary.securedMix,
        enquiryCount: demoCaseWorkspace.bureauSummary.enquiryCount,
        writtenOff: demoCaseWorkspace.bureauSummary.writtenOff,
        settled: demoCaseWorkspace.bureauSummary.settled,
        loanVintageMonths: demoCaseWorkspace.bureauSummary.loanVintageMonths,
        extractionConfidence: demoCaseWorkspace.bureauSummary.extractionConfidence,
        rawPayload: demoCaseWorkspace.bureauSummary,
        processedPayload: demoCaseWorkspace.bureauSummary
      }
    });
  }

  if (demoCaseWorkspace.gstSummary) {
    await prisma.gstSummary.create({
      data: {
        caseId: underwritingCase.id,
        legalName: demoCaseWorkspace.gstSummary.legalName,
        gstin: demoCaseWorkspace.gstSummary.gstin,
        status: demoCaseWorkspace.gstSummary.status,
        filingFrequency: demoCaseWorkspace.gstSummary.filingFrequency,
        filingRegularity: demoCaseWorkspace.gstSummary.filingRegularity,
        turnoverProxy: demoCaseWorkspace.gstSummary.turnoverProxy,
        gstrTrends: demoCaseWorkspace.gstSummary.gstrTrends,
        taxPaymentConsistency: demoCaseWorkspace.gstSummary.taxPaymentConsistency,
        registrationAgeMonths: demoCaseWorkspace.gstSummary.registrationAgeMonths,
        state: demoCaseWorkspace.gstSummary.state,
        businessType: demoCaseWorkspace.gstSummary.businessType,
        healthScore: demoCaseWorkspace.gstSummary.healthScore,
        rawResponse: demoCaseWorkspace.gstSummary.rawResponse,
        processedResponse: demoCaseWorkspace.gstSummary.processedResponse
      }
    });
  }

  if (demoCaseWorkspace.bankAnalytics) {
    await prisma.bankAnalytics.create({
      data: {
        caseId: underwritingCase.id,
        monthlyCredits: demoCaseWorkspace.bankAnalytics.monthlyCredits,
        monthlyDebits: demoCaseWorkspace.bankAnalytics.monthlyDebits,
        cashDepositRatio: demoCaseWorkspace.bankAnalytics.cashDepositRatio,
        chequeBounceCount: demoCaseWorkspace.bankAnalytics.chequeBounceCount,
        emiBounceCount: demoCaseWorkspace.bankAnalytics.emiBounceCount,
        averageBalance: demoCaseWorkspace.bankAnalytics.averageBalance,
        minBalance: demoCaseWorkspace.bankAnalytics.minBalance,
        maxBalance: demoCaseWorkspace.bankAnalytics.maxBalance,
        inwardConsistency: demoCaseWorkspace.bankAnalytics.inwardConsistency,
        outwardConsistency: demoCaseWorkspace.bankAnalytics.outwardConsistency,
        topCounterparties: demoCaseWorkspace.bankAnalytics.topCounterparties,
        abnormalSpikes: demoCaseWorkspace.bankAnalytics.abnormalSpikes,
        seasonality: demoCaseWorkspace.bankAnalytics.seasonality,
        relatedPartySignals: demoCaseWorkspace.bankAnalytics.relatedPartySignals,
        healthScore: demoCaseWorkspace.bankAnalytics.healthScore,
        extractionConfidence: demoCaseWorkspace.bankAnalytics.extractionConfidence,
        rawPayload: demoCaseWorkspace.bankAnalytics,
        processedPayload: demoCaseWorkspace.bankAnalytics
      }
    });
  }

  if (demoCaseWorkspace.invoiceSummary) {
    await prisma.invoiceRecord.create({
      data: {
        caseId: underwritingCase.id,
        invoiceNumber: demoCaseWorkspace.invoiceSummary.invoiceNumber,
        invoiceDate: new Date(demoCaseWorkspace.invoiceSummary.invoiceDate),
        supplierName: demoCaseWorkspace.invoiceSummary.supplierName,
        buyerName: demoCaseWorkspace.invoiceSummary.buyerName,
        supplierGstin: demoCaseWorkspace.invoiceSummary.supplierGstin,
        buyerGstin: demoCaseWorkspace.invoiceSummary.buyerGstin,
        taxableValue: demoCaseWorkspace.invoiceSummary.taxableValue,
        taxBreakup: demoCaseWorkspace.invoiceSummary.taxBreakup,
        totalValue: demoCaseWorkspace.invoiceSummary.totalValue,
        hsnSac: demoCaseWorkspace.invoiceSummary.hsnSac,
        lineItems: demoCaseWorkspace.invoiceSummary.lineItems,
        vehicleNumber: demoCaseWorkspace.invoiceSummary.vehicleNumber,
        eWayBillNumber: demoCaseWorkspace.invoiceSummary.eWayBillNumber,
        completenessScore: demoCaseWorkspace.invoiceSummary.completenessScore,
        authenticityScore: demoCaseWorkspace.invoiceSummary.authenticityScore,
        anomalyFlags: demoCaseWorkspace.invoiceSummary.flags,
        rawPayload: demoCaseWorkspace.invoiceSummary,
        processedPayload: {
          extractionConfidence: demoCaseWorkspace.invoiceSummary.extractionConfidence
        }
      }
    });
  }

  if (demoCaseWorkspace.tradeMatch) {
    await prisma.tradeVerification.create({
      data: {
        caseId: underwritingCase.id,
        matchStatus: demoCaseWorkspace.tradeMatch.status,
        score: demoCaseWorkspace.tradeMatch.score,
        checks: demoCaseWorkspace.tradeMatch.checks,
        routePlausibility: demoCaseWorkspace.tradeMatch.routePlausibility,
        historicalNote: demoCaseWorkspace.tradeMatch.historicalRelationshipNote,
        rawPayload: demoCaseWorkspace.tradeMatch
      }
    });
  }

  await prisma.fraudFlag.createMany({
    data: demoCaseWorkspace.fraudFlags.map((flag) => ({
      caseId: underwritingCase.id,
      module: flag.module,
      code: flag.code,
      severity: flag.severity,
      reason: flag.reason
    }))
  });

  await prisma.scoreSnapshot.createMany({
    data: demoCaseWorkspace.scores.map((score) => ({
      caseId: underwritingCase.id,
      kind: score.key,
      score: score.score,
      weight: score.weight,
      riskGrade: score.grade,
      rationale: score.rationale,
      breakdown: score.breakdown
    }))
  });

  await prisma.llmMemo.create({
    data: {
      caseId: underwritingCase.id,
      provider: "mock",
      modelVersion: demoCaseWorkspace.llmMemo.modelVersion,
      promptVersion: demoCaseWorkspace.llmMemo.promptVersion,
      summary: demoCaseWorkspace.llmMemo.summary,
      strengths: demoCaseWorkspace.llmMemo.strengths,
      risks: demoCaseWorkspace.llmMemo.risks,
      contradictions: demoCaseWorkspace.llmMemo.contradictions,
      policyExceptions: demoCaseWorkspace.llmMemo.policyExceptions,
      nextQuestions: demoCaseWorkspace.llmMemo.nextQuestions,
      disclaimer: demoCaseWorkspace.llmMemo.disclaimer
    }
  });

  await prisma.analystDecision.create({
    data: {
      caseId: underwritingCase.id,
      analystId: analyst.id,
      recommendation: demoCaseWorkspace.analystDecision.recommendation ?? "REFER_TO_ANALYST",
      overrideReason: demoCaseWorkspace.analystDecision.overrideReason,
      approvedLimit: demoCaseWorkspace.analystDecision.approvedLimit,
      approvedTenorDays: demoCaseWorkspace.analystDecision.approvedTenorDays,
      pricingBand: demoCaseWorkspace.analystDecision.pricingBand,
      collateralRequirement: demoCaseWorkspace.analystDecision.collateralRequirement
    }
  });

  await prisma.analystNote.createMany({
    data: demoCaseWorkspace.analystDecision.analystNotes.map((note) => ({
      caseId: underwritingCase.id,
      authorId: analyst.id,
      body: note
    }))
  });

  await prisma.auditLog.createMany({
    data: demoCaseWorkspace.timeline.map((item) => ({
      caseId: underwritingCase.id,
      actorId: admin.id,
      action: item.title,
      entityType: "UnderwritingCase",
      entityId: underwritingCase.id,
      metadata: {
        detail: item.detail,
        timestamp: item.timestamp
      }
    }))
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
