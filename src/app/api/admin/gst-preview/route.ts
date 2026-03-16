import { NextResponse } from "next/server";

import { getCurrentRole } from "@/server/auth/role";
import { getAdminIntegrationStatus } from "@/server/repositories/case-repository";

export async function GET() {
  if (getCurrentRole() !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const integrations = await getAdminIntegrationStatus();
  return NextResponse.json({ integrations });
}
