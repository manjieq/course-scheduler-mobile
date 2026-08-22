# extract-course-chat

Same pipeline as `extract-course-scan` — server-side university/department
resolution, `_shared`'s provider interface, schema validation, returns
`{ universityId, departmentId, courses }` unsaved for the same
`app/confirm-courses.tsx` review screen — but takes `{ text }` (a free-text
description of a class) instead of a photo.

Errors: 401 unauthenticated, 400 onboarding incomplete or missing `text`,
422 for anything else.
