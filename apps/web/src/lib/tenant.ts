export type Tenant = {
  apiBase: string;
  companyId: string;
  userId: string;
};

export function readTenant(): Tenant {
  if (typeof window === "undefined") {
    return { apiBase: "http://localhost:3002", companyId: "", userId: "" };
  }

  const apiBase = (window.localStorage.getItem("tc.apiBase") || "http://localhost:3002").trim();
  const companyId = (window.localStorage.getItem("tc.companyId") || "").trim();
  const userId = (window.localStorage.getItem("tc.userId") || "").trim();

  return { apiBase, companyId, userId };
}

export function hasTenant(): boolean {
  const t = readTenant();
  return Boolean(t.companyId && t.userId);
}
