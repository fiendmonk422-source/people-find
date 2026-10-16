# PeopleFind matric double-entry runner

This local runner performs the first automation step for the CSV lookup importer: it opens the target lookup website, enters each matric number into **both** configured matric-number fields, and clicks the submit button. It processes records in batches of 10 by default and writes a checkpoint CSV after every attempt.

## Important boundaries

- This is a local browser runner, not a Supabase importer. It does not write to Supabase or alter PeopleFind directory records.
- It does not yet scrape student names, emails, phone numbers, or photo URLs. A `submitted` status means only that the form submission completed; it is not proof that a record was found.
- The target URL and exact CSS selectors are configurable because the original lookup website is not currently specified/available in this branch.
- Only run this against a site you are authorized to use, and respect its terms, access limits, and applicable privacy requirements.

## Setup on Windows

From the PeopleFind repository folder in PowerShell:

```powershell
py -m pip install playwright
py -m playwright install chromium
```

## Run

```powershell
py scripts/peoplefind-matric-double-entry.py
```

The script asks for the website URL and CSV path. It opens a visible browser so you can sign in manually if required. Check that the correct form is open before starting.

The default CSS selectors are:

- First field: `input[name="matric_number"]`
- Second field: `input[name="matric_number_confirmation"]`
- Submit button: `button[type="submit"]`

If the site uses different selectors, pass them on the command line. Example:

```powershell
py scripts/peoplefind-matric-double-entry.py --url "https://example.edu/lookup" --csv ".\matric-numbers.csv" --first-selector "#matric" --second-selector "#confirm-matric" --submit-selector "form button[type=submit]" --result-selector ".lookup-result"
```

Replace the example URL and selectors with the actual website's values. Do not use the example URL literally.

## Checkpoints

The script creates `peoplefind-lookup-progress.csv` beside the input CSV. It records `matric_number`, original CSV row, `lookup_status`, and any error. Statuses are `pending`, `submitted`, or `error`. It pauses after each 10 attempted rows so you can stop between batches.

If the site is unavailable or a selector is wrong, stop and correct the URL/selectors before retrying. Inspect the output CSV before using it for any later import.
