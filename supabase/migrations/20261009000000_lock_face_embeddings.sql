-- Lock down direct browser reads of stored face embeddings.
-- The application should never query biometric embeddings directly from a user's browser.
-- Any future matching endpoint must verify authorization server-side and limit results to explicitly enrolled participants.

drop policy if exists "Authenticated users can use face embeddings"
on public.person_face_embeddings;
