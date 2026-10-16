export const STUDENT_FIELDS = [
  "fullName", "email", "phone", "photoUrl", "faculty", "department", "level",
  "admissionYear", "hostel", "room", "gender", "dateOfBirth", "address", "state", "country",
] as const;

export type StudentField = (typeof STUDENT_FIELDS)[number];
export type ExtractionStatus = "collected" | "failed" | "review";

export type ExtractionResult = {
  matricNumber: string;
  status: ExtractionStatus;
  data: Partial<Record<StudentField, string>>;
  error: string;
  sourceUrl: string;
  collectedAt: string;
};

export type ExtractionBatchResponse = {
  configured: boolean;
  processed: number;
  results: ExtractionResult[];
  message: string;
};