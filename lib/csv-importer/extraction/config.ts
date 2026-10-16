/**
 * Public reference portal and approved data endpoint are separate settings.
 * The CGS login page is not itself a bulk data API.
 * Keep endpointUrl blank until an institution-approved export/API endpoint is available.
 */
export const extractionConfig = {
  sourcePortalUrl: "https://cgs.ui.edu.ng/portal/",
  endpointUrl: "",
  maxBatchSize: 50,
  requestTimeoutMs: 20000,
  pauseBetweenRequestsMs: 300,
  // Expected response shape: { results: [{ matricNumber, fullName, email, ... }] }
  resultsProperty: "results",
} as const;