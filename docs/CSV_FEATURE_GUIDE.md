# CSV Batch Processing Feature

## Overview

The chatbot now supports batch processing of movie reviews through CSV file uploads. Users can analyze multiple reviews at once and download results in CSV format with sentiment predictions and confidence percentages.

## Features Added

### 1. Backend Enhancements (app.py)
- New `/predict/batch` endpoint for processing multiple reviews
- Accepts list of review texts
- Returns sentiment labels and confidence scores for each review

### 2. API Route (app/api/batch/route.ts)
- New `/api/batch` POST endpoint
- Bridges frontend requests to FastAPI backend
- Handles batch result aggregation

### 3. Frontend UI (app/page.tsx)
- **Tab Navigation**: Switch between single-review Chat mode and Batch CSV mode
- **CSV Upload**: Drag-and-drop or click to upload CSV files
- **Results Display**: 
  - Real-time progress tracking
  - Results table with sentiment labels and confidence percentages
  - Sortable and scrollable results
- **CSV Export**: Download results as CSV file with all analysis

## How to Use

### Input CSV Format

Your CSV file should have at least these columns:
```
username,review
MovieBuff2024,"Absolutely fantastic film with incredible cinematography"
CinemaLover,"Boring waste of time with terrible acting"
```

**Required Columns:**
- `username`: User identifier (can be empty string)
- `review`: The movie review text to analyze

**Example:**
```csv
username,review
User1,"This movie was amazing!"
User2,"Terrible waste of time"
User3,"Not bad, pretty good"
```

### Processing Steps

1. Click the **"Batch (CSV)"** tab in the header
2. Click the upload area or drag a CSV file
3. Wait for processing to complete (progress bar shows status)
4. Review results in the table
5. Click **"Download CSV"** to export results

### Output Format

The exported CSV contains:
```csv
username,review,sentiment,confidence
User1,"This movie was amazing!",Positive,95.23
User2,"Terrible waste of time",Negative,87.45
User3,"Not bad, pretty good",Positive,72.18
```

**Columns:**
- `username`: Original username from input
- `review`: Original review text
- `sentiment`: Classification result (Positive/Negative)
- `confidence`: Confidence percentage (0-100)

## Technical Details

### CSV Parsing
- Handles quoted fields with embedded commas
- Supports both double-quoted and single-quoted fields
- Properly escapes quotes in review text on export

### Batch Processing
- Processes all reviews in a single API call
- No artificial delays or throttling
- Real-time progress updates

### Model Information
- Uses: Qwen2.5-3B with QLoRA fine-tuned adapter
- Model: jayanthnagasai/imdb-qlora
- Confidence: Normalized probability of chosen label
- Max review length: 800 characters (excess text is truncated)

## Error Handling

- Missing required columns: Shows error message
- No valid reviews found: Validation feedback
- Processing failures: User-friendly error messages
- Network issues: Graceful error recovery

## Performance Notes

- Batch size: Unlimited (backend processes all at once)
- Processing time: Depends on number of reviews and model speed
- Memory: Minimal overhead from batch endpoint
- Network: Single POST request for all reviews

## Example Workflow

```bash
# Sample CSV file: reviews.csv
username,review
Reviewer1,"Amazing cinematography and incredible story"
Reviewer2,"Waste of time, couldn't finish it"
Reviewer3,"Good but not great, predictable ending"

# Upload reviews.csv via UI
# System processes 3 reviews
# Download results as CSV with sentiments and confidence
```

## Integration with Existing Features

- **Chat Tab**: Still available for single-review analysis
- **Model**: Same sentiment classification model used for both
- **Results**: Identical sentiment labels and confidence metrics
- **Consistency**: Batch results match individual predictions

## Limitations

- CSV upload only (no direct text paste for batch)
- Reviews truncated at 800 characters (model training constraint)
- Single request per upload (no chunking)
- Browser file size limits apply
