# Quick Start - CSV Batch Processing

## 1. Prepare Your CSV File

Create or prepare a CSV file with reviews. Must have these columns:
```
username,review
```

Example:
```csv
username,review
User1,This movie was amazing!
User2,Terrible waste of time
User3,Pretty good film overall
```

**Tips:**
- The `username` column is optional (can be empty)
- The `review` column is required
- Each review is on a new row

## 2. Start the Application

**Terminal 1 - Backend:**
```bash
cd /Users/jaypas/MLENG/MINI/chatbot-app
python app.py
# Runs on http://localhost:8080
```

**Terminal 2 - Frontend:**
```bash
cd /Users/jaypas/MLENG/MINI/chatbot-app
npm run dev
# Runs on http://localhost:3000
```

## 3. Upload and Process CSV

1. Open http://localhost:3000 in your browser
2. Click the **"Batch (CSV)"** tab in the header
3. Click the upload area or drag your CSV file
4. Wait for processing (progress bar shows status)
5. Review results in the table

## 4. Download Results

After processing completes:
1. Click the **"Download CSV"** button (green button)
2. File `sentiment_results.csv` will be downloaded
3. Open in Excel/Google Sheets or your preferred tool

## Example Workflow

### Input CSV (reviews.csv)
```csv
username,review
MovieCritic1,Absolutely fantastic cinematography and storytelling
JohnDoe,Boring and predictable waste of time
FilmBuff42,Good but not great compared to the original
```

### Processing
- Upload reviews.csv
- Wait for 3 reviews to process (~5-10 seconds)
- See results with sentiment and confidence

### Output CSV (sentiment_results.csv)
```csv
username,review,sentiment,confidence
MovieCritic1,Absolutely fantastic cinematography and storytelling,Positive,94.23
JohnDoe,Boring and predictable waste of time,Negative,89.45
FilmBuff42,Good but not great compared to the original,Positive,72.18
```

## Using the Sample File

The repository includes `sample.csv` with 25 movie reviews:

```bash
# Just upload this file directly
# File: /Users/jaypas/MLENG/MINI/chatbot-app/sample.csv
```

Steps:
1. Click "Batch (CSV)" tab
2. Upload the sample.csv file
3. Wait for processing
4. Download results

## Single Review Mode

Still want to analyze one review at a time?
1. Click the **"Chat"** tab
2. Paste a single review
3. Click "Classify"
4. See sentiment and confidence

## Troubleshooting

### "No valid reviews found in CSV"
- Make sure your CSV has a "review" column
- Column names are case-insensitive
- Check that reviews aren't empty

### Processing takes a long time
- Normal for 50+ reviews
- Backend processes all at once
- Each review takes ~1-2 seconds

### Download doesn't work
- Check browser console for errors
- Try a different browser
- File should be ~sentiment_results.csv

### Connection refused errors
- Make sure backend is running (`python app.py`)
- Check backend is on port 8080
- Check frontend can reach http://localhost:8080

## Tips & Tricks

### Best Practices
- Keep reviews under 800 characters
- Use consistent username format
- Export results immediately (data clears on page refresh)

### CSV Format Tips
- Use quotes for reviews with commas: `"review, with, commas"`
- Escape quotes by doubling: `"quote "" inside"`
- Save as UTF-8 CSV from Excel/Sheets

### Performance
- 25 reviews: ~15-20 seconds
- 100 reviews: ~1 minute
- 1000 reviews: ~10 minutes

## Features

Current Features:
- [x] Upload CSV files
- [x] Batch sentiment analysis
- [x] Download results as CSV
- [x] Show confidence percentages
- [x] Progress tracking
- [x] Error handling
- [x] Light/dark mode support

Coming Soon:
- [ ] Drag-and-drop improvements
- [ ] Sorting and filtering results
- [ ] Statistics dashboard
- [ ] Scheduled batch processing

## Support

Having issues? Check:
1. Both backend and frontend are running
2. CSV file format is correct
3. Reviews column exists
4. No network connectivity issues
5. Browser developer console for errors

## Need Help?

See these files for more details:
- `CSV_FEATURE_GUIDE.md` - Complete feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `sample.csv` - Example CSV file to test with
