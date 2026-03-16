import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { demoCaseList, demoCaseWorkspace } from "@/lib/demo-data";
import type { CaseListItem, CaseWorkspaceData, DocumentRecord, ExtractedFieldRecord } from "@/lib/types";

function stateDir() {
  return join(process.cwd(), "storage", "local-state");
}

function stateFile(caseId: string) {
  return join(stateDir(), `${caseId}.json`);
}

export function isLocalDemoCase(caseId: string) {
  return caseId === demoCaseWorkspace.caseId;
}

export async function loadLocalCaseWorkspace(caseId: string) {
  try {
    const contents = await readFile(stateFile(caseId), "utf8");
    return JSON.parse(contents) as CaseWorkspaceData;
  } catch {
    return null;
  }
}

export async function saveLocalCaseWorkspace(workspace: CaseWorkspaceData) {
  await mkdir(stateDir(), { recursive: true });
  await writeFile(stateFile(workspace.caseId), JSON.stringify(workspace, null, 2), "utf8");
}

export async function getLocalOrDemoWorkspace(caseId: string) {
  const stored = await loadLocalCaseWorkspace(caseId);
  return stored ?? demoCaseWorkspace;
}

function mergeDocuments(documents: DocumentRecord[], incoming: DocumentRecord) {
  const next = documents.filter((document) => document.id !== incoming.id);
  return [incoming, ...next];
}

function mergeSectionFields(
  fields: ExtractedFieldRecord[],
  section: string,
  incoming: ExtractedFieldRecord[]
) {
  return [...fields.filter((field) => field.section !== section), ...incoming];
}

export async function persistLocalDocumentProcessing(input: {
  caseId: string;
  document: DocumentRecord;
  section: string;
  extractedFields: ExtractedFieldRecord[];
  bureauSummary?: CaseWorkspaceData["bureauSummary"];
  bankAnalytics?: CaseWorkspaceData["bankAnalytics"];
  invoiceSummary?: CaseWorkspaceData["invoiceSummary"];
}) {
  const workspace = await getLocalOrDemoWorkspace(input.caseId);

  const nextWorkspace: CaseWorkspaceData = {
    ...workspace,
    documents: mergeDocuments(workspace.documents, input.document),
    extractedFields: mergeSectionFields(workspace.extractedFields, input.section, input.extractedFields),
    bureauSummary: input.bureauSummary ?? workspace.bureauSummary,
    bankAnalytics: input.bankAnalytics ?? workspace.bankAnalytics,
    invoiceSummary: input.invoiceSummary ?? workspace.invoiceSummary,
    timeline: [
      {
        timestamp: new Date().toISOString(),
        title: `${input.section} processed`,
        detail: `${input.document.name} processed locally for demo mode.`
      },
      ...workspace.timeline
    ]
  };

  await saveLocalCaseWorkspace(nextWorkspace);
  return nextWorkspace;
}

export async function persistLocalAnalysis(input: {
  caseId: string;
  gstSummary?: CaseWorkspaceData["gstSummary"];
  tradeMatch?: CaseWorkspaceData["tradeMatch"];
  fraudFlags?: CaseWorkspaceData["fraudFlags"];
  scores?: CaseWorkspaceData["scores"];
  decision?: CaseWorkspaceData["decision"];
  llmMemo?: CaseWorkspaceData["llmMemo"];
  timelineTitle: string;
  timelineDetail: string;
}) {
  const workspace = await getLocalOrDemoWorkspace(input.caseId);

  const nextWorkspace: CaseWorkspaceData = {
    ...workspace,
    gstSummary: input.gstSummary ?? workspace.gstSummary,
    tradeMatch: input.tradeMatch ?? workspace.tradeMatch,
    fraudFlags: input.fraudFlags ?? workspace.fraudFlags,
    scores: input.scores ?? workspace.scores,
    decision: input.decision ?? workspace.decision,
    llmMemo: input.llmMemo ?? workspace.llmMemo,
    timeline: [
      {
        timestamp: new Date().toISOString(),
        title: input.timelineTitle,
        detail: input.timelineDetail
      },
      ...workspace.timeline
    ]
  };

  await saveLocalCaseWorkspace(nextWorkspace);
  return nextWorkspace;
}

export async function persistLocalAnalystDecision(input: {
  caseId: string;
  analystDecision: CaseWorkspaceData["analystDecision"];
}) {
  const workspace = await getLocalOrDemoWorkspace(input.caseId);
  const nextWorkspace: CaseWorkspaceData = {
    ...workspace,
    analystDecision: input.analystDecision,
    timeline: [
      {
        timestamp: new Date().toISOString(),
        title: "Analyst decision captured",
        detail: "Decision saved locally for demo mode."
      },
      ...workspace.timeline
    ]
  };

  await saveLocalCaseWorkspace(nextWorkspace);
  return nextWorkspace;
}

export async function persistLocalAnalystNote(caseId: string, note: string) {
  const workspace = await getLocalOrDemoWorkspace(caseId);
  const nextWorkspace: CaseWorkspaceData = {
    ...workspace,
    analystDecision: {
      ...workspace.analystDecision,
      analystNotes: [note, ...workspace.analystDecision.analystNotes]
    },
    timeline: [
      {
        timestamp: new Date().toISOString(),
        title: "Analyst note added",
        detail: "Note saved locally for demo mode."
      },
      ...workspace.timeline
    ]
  };

  await saveLocalCaseWorkspace(nextWorkspace);
  return nextWorkspace;
}

export async function getLocalAwareCaseList(): Promise<CaseListItem[]> {
  const storedDemo = await loadLocalCaseWorkspace(demoCaseWorkspace.caseId);
  if (!storedDemo) {
    return demoCaseList;
  }

  return demoCaseList.map((item) =>
    item.caseId === storedDemo.caseId
      ? {
          ...item,
          score: storedDemo.decision.compositeScore,
          riskGrade: storedDemo.decision.riskGrade,
          recommendation: storedDemo.decision.recommendation
        }
      : item
  );
}
