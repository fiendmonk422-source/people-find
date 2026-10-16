import { STUDENT_FIELDS, type StudentField } from "./types";

const ALIASES: Record<StudentField, string[]> = {
  fullName: ["fullName", "full_name", "name", "student_name"],
  email: ["email", "email_address"],
  phone: ["phone", "phone_number", "mobile"],
  photoUrl: ["photoUrl", "photo_url", "image_url"],
  faculty: ["faculty", "faculty_name"],
  department: ["department", "department_name", "programme"],
  level: ["level", "study_level"],
  admissionYear: ["admissionYear", "admission_year", "session"],
  hostel: ["hostel", "hall", "residence"],
  room: ["room", "room_number"],
  gender: ["gender", "sex"],
  dateOfBirth: ["dateOfBirth", "date_of_birth", "dob"],
  address: ["address", "contact_address"],
  state: ["state", "state_of_origin"],
  country: ["country", "nationality"],
};

export function mapSourceRecord(source: Record<string, unknown>): Partial<Record<StudentField, string>> {
  const output: Partial<Record<StudentField, string>> = {};
  for (const field of STUDENT_FIELDS) {
    const key = ALIASES[field].find((candidate) => source[candidate] !== undefined && source[candidate] !== null);
    if (!key) continue;
    const value = source[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      output[field] = String(value).trim();
    }
  }
  return output;
}

export function findMatricNumber(source: Record<string, unknown>): string {
  const key = ["matricNumber", "matric_number", "matric", "registration_number", "student_id"]
    .find((candidate) => source[candidate] !== undefined && source[candidate] !== null);
  return key ? String(source[key]).trim() : "";
}