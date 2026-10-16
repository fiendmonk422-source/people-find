/**
 * Configure only an official API endpoint or an authorized institutional export service.
 * Keep the URL blank until that endpoint is approved and ready.
 *
 * Set PEOPLEFIND_LOOKUP_API_TOKEN in the server environment if the approved endpoint
 * requires a bearer token. Never put passwords, tokens, or cookies in client code/CSV.
 */
export const extractionConfig = {
  endpointUrl: "",
  maxBatchSize: 50,
  requestTimeoutMs: 20000,
  pauseBetweenRequestsMs: 300,
  // Expected response shape: { results: [{ matricNumber, fullName, email, ... }] }
  resultsProperty: "results",
} as const;