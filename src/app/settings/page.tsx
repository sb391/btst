import { InternalBanner } from "@/components/shared/internal-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOcrProviderSettings } from "@/server/services/invoice-ocr-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SettingsPage() {
  const providers = getOcrProviderSettings();

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow="Settings"
        title="OCR and AI provider configuration"
        description="Provider settings are deliberately visible so analysts know whether the app is using local extraction, a demo fixture, or an external OCR/AI provider."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>OCR Providers</CardTitle>
            <CardDescription>
              The OCR layer sits behind an abstraction so providers can be swapped later without rewriting review logic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {providers.map((provider) => (
              <div key={provider.key} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{provider.label}</p>
                  <Badge variant={provider.configured ? "success" : "warning"}>
                    {provider.configured ? "Configured" : "Stub"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{provider.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Local MVP Notes</CardTitle>
            <CardDescription>
              This focused MVP is built for analyst-assist invoice review and keeps the reasoning trail visible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Files are stored locally on disk and invoice reviews are stored in a local SQLite database for quick desktop use.
            </p>
            <p>
              Rules-first checks drive scoring and status. AI commentary is layered on top and is expected to state uncertainty explicitly.
            </p>
            <p>
              External OCR or vision providers are optional. Without them, digital PDFs can still be read through their text layer and demo fixtures remain available for seeded testing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
