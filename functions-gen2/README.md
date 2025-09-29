# Firebase Functions Gen2 with SendGrid Integration

This directory contains Firebase Functions (2nd generation) for the Verse Learning platform. These functions use the Firebase Functions SDK v2 and are primarily Firestore-triggered functions that handle email communications via SendGrid.

## Functions

### `sendAssignmentEmail`

A Firestore-triggered function that sends assignment notifications to students using standard links.

**Trigger**: Document creation in the `assignments` collection
**Purpose**:
- Sends email notifications for new assignments
- Provides students with a direct link to access their assignments
- Updates the assignment document with email status

### `sendEmailLinkWithAssignment`

A Firestore-triggered function that sends assignments that require email link authentication.

**Trigger**: Document creation in the `assignments` collection
**Purpose**:
- Sends email with secure authentication links
- Enables passwordless sign-in for assignment access
- Supports Firebase Authentication email link flow
- Updates the assignment document with email status

## SendGrid Integration Architecture

The SendGrid email integration is implemented using a modular architecture with the following components:

### 1. SendGrid Helper (`sendgridHelper.ts`)

A dedicated module that encapsulates all SendGrid-related functionality:

- **setupSendGrid**: Validates the API key format and sets up the SendGrid client
- **sendEmail**: Handles email sending with comprehensive error handling and logging
- **cleanEmailAddress**: Sanitizes email addresses to prevent formatting issues

### 2. Email Validator (`emailValidator.ts`)

Uses Zod schema validation to ensure email data meets required formats:

- **validateEmailData**: Validates email data against the schema
- **logEmailPayload**: Logs email data with sensitive information masked for privacy
- **emailSchema**: Defines the required structure and format for email data

### 3. Testing and Validation Tools

- **validateApiKey.ts**: Tool to validate SendGrid API key format
- **testSendEmail.ts**: Tests email sending functionality
- **test-sendgrid.sh**: Shell script for easy testing
- **validate-key.sh**: Shell script for API key validation

## Security and Configuration

- SendGrid API key and sender email are stored as Firebase secrets
- Multiple levels of validation ensure data integrity
- Email addresses are sanitized to prevent formatting issues
- Logging masks sensitive information for privacy
- Proper error handling with detailed logging

## Development

### Prerequisites

- Node.js v20 (as specified in package.json)
- Firebase CLI installed globally
- Firebase project configured
- SendGrid account with API key

### Installation

```bash
cd functions-gen2
npm install
```

### Setting Up SendGrid

1. Create a SendGrid account and verify your sender email/domain
2. Generate an API key with appropriate permissions
3. Set up Firebase secrets:

```bash
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set SENDER_EMAIL
```

### Testing SendGrid Integration

The repository includes tools for testing the SendGrid integration:

```bash
# Validate SendGrid API key format
./validate-key.sh "YOUR_SENDGRID_API_KEY"

# Test sending emails
./test-sendgrid.sh "YOUR_SENDGRID_API_KEY" "your_verified_email@example.com"
```

### Local Testing

```bash
npm run serve
```

### Deployment

```bash
# Deploy only Gen2 functions
firebase deploy --only functions:gen2

# Or from the parent directory
cd ..
firebase deploy --only functions:gen2
```

## Sentence Sense – High Scores (Misses-Based)

### Overview
For Sentence Sense, a user's high score is the lowest number of misses achieved for a given `userGameConfigs/{configId}`. The backend records this in a single, idempotent document per `(configId, userId)` upon result writes.

### Trigger Path
- `users/{userId}/results/{assignmentId}` (handled by `updateAssignmentOnResult`)

### Document Key
- `highScores/ss:{configId}:{userId}`

### Schema (fields)
- `userId: string`
- `configId: string` (the `userGameConfigs` id)
- `gameType: "sentence-sense"`
- `bestMisses: number` (lower is better; updated when user achieves a better run)
- `lastMisses: number` (misses from the most recent processed run)
- `attempts: number` (total processed attempts for this pair)
- `assignmentId: string` (denormalized convenience)
- `title: string | null` (denormalized config title)
- `studentEmail: string | undefined` (when available)
- `createdAt: Timestamp`
- `updatedAt: Timestamp`
- `bestAt: Timestamp` (set when bestMisses improves)

### Firestore Index
Required composite index for leaderboard queries:

```
collection: highScores
fields: gameType ASC, bestMisses ASC
```

This index has been added to `firestore.indexes.json`. Deploy with:

```bash
firebase deploy --only firestore:indexes
```

### Notes
- The function is idempotent per result document using an internal ledger and only updates the high score if the new misses value is better.
- The same function also updates assignment progress transactionally and mirrors into the user-scoped assignment document.

## Assignment Progress – Server Authoritative Flow

### Overview
Assignment completion for all native apps is handled on the server by a single Firestore-triggered function. The client writes a result document; the server increments progress exactly once using an idempotency ledger and mirrors display fields.

### Trigger Path
- `users/{userId}/results/{assignmentId}`
- Trigger: `onDocumentWritten` (captures both creates and updates)

### Client Write (iOS)
- After a successful repetition, the app writes a document under the path above. Minimal payload is enough; recommended fields:
  - `gameType` (e.g. `"sentence-sense"`)
  - `misses` (for high score and analytics)
  - `stats` (optional structured details)
  - `assignmentId` (optional; when path param is a link token)

### Function: `updateAssignmentOnResult`
1. Resolves the canonical top-level assignment doc (`assignments/{topId}`) by either the path id or `linkToken`.
2. Writes an idempotency record in `assignmentProgressLedger` keyed by the result event id: `result:{userId}:{event.id}` to prevent double increments.
3. Runs a Firestore transaction on the top-level assignment:
   - Increments `completedCount` by 1 up to `timesRequired`.
   - Recomputes `attemptsRemaining = max(0, timesRequired - completedCount)`.
   - Sets `status = 'completed'` when finished.
   - Updates `updatedAt`.
4. Mirrors the computed fields to `users/{userId}/assignments/{topId}` and seeds display fields (`gameTitle`, `gameType`, `deadline`, etc.) if missing.
5. High Scores (Sentence Sense): upserts per `(configId,userId)` high score doc with `bestMisses` (lowest wins); see section above.

### Important: Attempts Trigger Removed
- The previous progress path via `attempts` has been deprecated to eliminate double-counting.
- Function `updateAssignmentOnAttempt` is disabled and should not be relied upon.
- Keep `deleteAttemptsOnAssignmentDelete` for cascade cleanup of legacy data when an assignment is deleted.

### Testing Checklist
1. Create an assignment with `timesRequired` > 1.
2. From the app, complete one repetition → verify top-level `assignments/{id}` shows `completedCount = 1`, `attemptsRemaining` decremented by 1.
3. Verify mirror at `users/{uid}/assignments/{id}` matches.
4. Complete another repetition → `completedCount` increments exactly by 1.
5. For Sentence Sense, check `highScores/ss:{configId}:{userId}` updated with `attempts`, `lastMisses`, and improved `bestMisses` when applicable.

### Troubleshooting
- Seeing 2× increments: ensure the client only writes a single `results` doc per repetition and that no `attempts` write is performed. The ledger prevents reprocessing of the same result event id.
- No increment: confirm the `results` write path is correct, the trigger is deployed, and the top-level assignment can be resolved by doc id or `linkToken`.

## Security Rules Summary

- `highScores`: public read, server-only write (service account). See `firestore.rules` → `match /highScores/{id}`.
- `users/{uid}/results/{assignmentId}`: students can `create` and `read` their own results; only the service account may `update`/`delete`.

Snippets (for reference):

```
match /highScores/{highScoreId} {
  allow read: if true;
  allow write: if isServiceAccount();
}

match /users/{userId}/results/{assignmentId} {
  allow create: if isAuthenticated() && request.auth.uid == userId;
  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow update, delete: if isServiceAccount();
}
```

## Results Write Contract (Client → Server)

Minimum recommended payload written by iOS on repetition completion:

```json
{
  "gameType": "sentence-sense",
  "misses": 2,
  "stats": { "moves": 12, "durationMs": 43000 }
}
```

Path: `users/{uid}/results/{assignmentId}` (where `assignmentId` is the top-level id or link token; function resolves canonical id).

## Ops Runbook

- Deploy only rules:
```bash
firebase deploy --only firestore:rules
```
- Deploy only indexes:
```bash
firebase deploy --only firestore:indexes
```
- Deploy only Gen2 functions:
```bash
firebase deploy --only functions:gen2
```
- Tail logs for progress updates:
```bash
firebase functions:log --only gen2:updateAssignmentOnResult
```

## Data Model Map

- `assignments/{id}`: authoritative assignment doc; transactionally updated by function.
- `users/{uid}/assignments/{id}`: mirrored fields for student UI.
- `users/{uid}/results/{assignmentId}`: client writes here; trigger source for progress + high scores.
- `highScores/{id}`: per-game leaderboard docs (Sentence Sense uses `ss:{configId}:{userId}` and `bestMisses`).
- `assignmentProgressLedger/{id}`: idempotency ledger keyed per result event.
- `attempts`: deprecated for progress; keep `deleteAttemptsOnAssignmentDelete` for cascade cleanup.

## Dependencies

- firebase-functions: v6.x (2nd generation)
- firebase-admin: For Firestore operations
- @sendgrid/mail: For email sending
- zod: For email validation 