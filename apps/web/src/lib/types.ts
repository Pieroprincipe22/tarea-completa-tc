export type MaintenanceReportState = "DRAFT" | "FINAL";
export type MaintenanceReportItemStatus = "PENDING" | "OK" | "NOK" | "NA";

export type MaintenanceReportItem = {
  id: string;
  sortOrder: number;
  title: string;
  description?: string | null;
  status: MaintenanceReportItemStatus;
  resultNotes?: string | null;
  resultValue?: unknown;

};

export type MaintenanceReport = {
  id: string;
  performedAt: string;
  state: MaintenanceReportState;
  templateName: string;
  templateDesc?: string | null;
  summary?: string | null;
  notes?: string | null;
  finalizedAt?: string | null;
  items?: MaintenanceReportItem[];
};
