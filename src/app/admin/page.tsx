import { InternalBanner } from "@/components/shared/internal-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { availablePolicies } from "@/lib/demo-data";
import { getCurrentRole } from "@/server/auth/role";
import { getAdminIntegrationStatus } from "@/server/repositories/case-repository";

export default async function AdminPage() {
  const integrations = await getAdminIntegrationStatus();
  const role = getCurrentRole();

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow="Admin Settings"
        title="Integrations, policy weights, and security posture"
        description="Admin-only screen for reviewing provider configuration, policy matrices, and internal control placeholders for future productionization."
        action={<Badge variant="secondary">Role {role}</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Integration status</CardTitle>
            <CardDescription>
              Environment-based configuration keeps secrets out of source code and allows providers to be swapped later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrations.map((item) => (
              <div key={item.key} className="rounded-[18px] border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.label}</p>
                  <Badge
                    variant={
                      item.status === "configured"
                        ? "success"
                        : item.status === "stub"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {item.value}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.key}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy configuration</CardTitle>
            <CardDescription>
              Scoring weights are editable by borrower type and separated from model or prompt versions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availablePolicies.map((policy) => (
              <div key={policy.borrowerType} className="rounded-[18px] border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{policy.borrowerType}</p>
                  <Badge variant="outline">{policy.version}</Badge>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {Object.entries(policy.weights).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-2xl bg-card/70 px-3 py-2 text-sm">
                      <span>{key.replaceAll("_", " ")}</span>
                      <span>{value}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {policy.rules.map((rule) => (
                    <p key={rule} className="text-sm text-muted-foreground">
                      - {rule}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>RBAC</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            MVP uses environment-driven role gating (`ADMIN` vs `ANALYST`) and is structured for future SSO integration.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Secure file handling</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Files are persisted to local storage with checksum metadata and an abstraction layer for future encrypted object storage.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deletion and archival</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Database schema includes lifecycle statuses and audit logs so archival and deletion workflows can be added without redesign.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
