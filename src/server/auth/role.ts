export type AppRole = "ADMIN" | "ANALYST";

export function getCurrentRole(): AppRole {
  const role = process.env.DEMO_USER_ROLE?.toUpperCase();
  return role === "ANALYST" ? "ANALYST" : "ADMIN";
}

export function assertAdmin() {
  if (getCurrentRole() !== "ADMIN") {
    throw new Error("Admin access required.");
  }
}
