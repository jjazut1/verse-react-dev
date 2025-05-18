# Firestore Indexes for Verse React App

This document describes the Firestore indexes configured for the Verse React application.

## High Scores Collection Indexes

The following composite indexes are used for the `highScores` collection:

### 1. Sorting High Scores by Configuration

```json
{
  "collectionGroup": "highScores",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "configId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "score",
      "order": "DESCENDING"
    }
  ]
}
```

This index supports the query used to display high scores for a specific game configuration (used in SortCategoriesEggReveal and WhackAMole components).

### 2. Rate Limiting High Score Submissions

```json
{
  "collectionGroup": "highScores",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "playerName",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "configId", 
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "ASCENDING"
    }
  ]
}
```

This index supports rate limiting queries that check how many high scores a player has submitted for a specific configuration within a time window.

### 3. MathQuiz High Scores

```json
{
  "collectionGroup": "highScores",
  "queryScope": "COLLECTION", 
  "fields": [
    {
      "fieldPath": "game",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "score",
      "order": "DESCENDING"
    }
  ]
}
```

This index supports the MathQuiz component's high score leaderboard.

## Managing Indexes

### Deploying Indexes

Deploy Firestore indexes using:

```bash
firebase deploy --only firestore:indexes
```

### Creating Indexes After Error Messages

If you see a Firestore error about a missing index:

1. Click the provided link in the console error message, or
2. Manually create the index in the Firebase Console (Database → Indexes → Add Index)
3. Update the local `firestore.indexes.json` file to keep it in sync

### Analyzing Index Usage

Monitor index usage in the Firebase Console under the "Indexes" tab in the Firestore section. 