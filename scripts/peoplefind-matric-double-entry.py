#!/usr/bin/env python3
"""PeopleFind CSV matric double-entry runner.

Opens the target website in a visible Chromium browser, fills the same matric
number into two configured fields, and clicks Submit. It writes a checkpoint
CSV after every attempt and pauses after each batch of 10.

This script does not write to Supabase and does not scrape student details yet.
"""
from __future__ import annotations

import argparse
import csv
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

try:
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
    from playwright.sync_api import sync_playwright
except ImportError:
    print(
        "Playwright is not installed. Run:\n"
        "  py -m pip install playwright\n"
        "  py -m playwright install chromium",
        file=sys.stderr,
    )
    raise SystemExit(2)

MATRIc_HEADERS = {
    "matric_number", "matric number", "matricno", "matric no",
    "matriculation number", "matriculation_number", "matric",
    "registration number", "registration_number", "reg no", "reg_no",
    "student id", "student_id",
}


def normalize_header(value: str) -> str:
    return " ".join(value.strip().lower().replace(".", " ").replace("-", " ").split())


def read_matric_numbers(csv_path: Path) -> list[tuple[int, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    if not rows:
        raise ValueError("The selected CSV is empty.")

    first = [normalize_header(value) for value in rows[0]]
    header_index = next((i for i, value in enumerate(first) if value in MATRIc_HEADERS), None)
    has_header = header_index is not None
    if not has_header and any(len(row) > 1 for row in rows):
        raise ValueError(
            "This CSV has multiple columns but no recognized matric-number header. "
            "Add a matric_number or matric no column."
        )

    column = header_index if has_header else 0
    data = rows[1:] if has_header else rows
    seen: set[str] = set()
    result: list[tuple[int, str]] = []
    duplicates = 0
    for index, row in enumerate(data, start=2 if has_header else 1):
        value = row[column].strip() if len(row) > column else ""
        if not value:
            continue
        key = value.casefold()
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
        result.append((index, value))

    if not result:
        raise ValueError("No matric numbers were found in the selected CSV.")
    if len(result) > 10000:
        raise ValueError("The runner supports at most 10,000 unique matric numbers per run.")
    print(f"Loaded {len(result)} unique matric numbers; skipped {duplicates} duplicate row(s).")
    return result


def write_checkpoint(path: Path, records: list[dict[str, str]]) -> None:
    columns = ["matric_number", "source_csv_row", "lookup_status", "error"]
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(records)
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="Full URL of the lookup website")
    parser.add_argument("--csv", dest="csv_path", help="Path to the matric-number CSV")
    parser.add_argument("--first-selector", default='input[name="matric_number"]',
                        help="CSS selector for the first matric-number input")
    parser.add_argument("--second-selector", default='input[name="matric_number_confirmation"]',
                        help="CSS selector for the second matric-number input")
    parser.add_argument("--submit-selector", default='button[type="submit"]',
                        help="CSS selector for the form submit button")
    parser.add_argument("--result-selector", default="",
                        help="Optional CSS selector that appears after a successful lookup")
    parser.add_argument("--wait-seconds", type=float, default=1.5,
                        help="Extra wait after each submission when no result selector is supplied")
    parser.add_argument("--batch-size", type=int, default=10,
                        help="Pause for confirmation after this many submissions (default: 10)")
    args = parser.parse_args()

    url = (args.url or input("Lookup website URL: ")).strip()
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        print("Enter a complete http:// or https:// URL.", file=sys.stderr)
        return 2

    csv_value = (args.csv_path or input("Path to matric-number CSV: ")).strip().strip('"')
    csv_path = Path(csv_value).expanduser()
    if not csv_path.is_file():
        print(f"CSV file not found: {csv_path}", file=sys.stderr)
        return 2

    if args.batch_size < 1 or args.wait_seconds < 0:
        print("--batch-size must be at least 1 and --wait-seconds cannot be negative.", file=sys.stderr)
        return 2

    try:
        matric_rows = read_matric_numbers(csv_path)
    except (OSError, ValueError, csv.Error) as error:
        print(f"Could not read CSV: {error}", file=sys.stderr)
        return 2

    output_path = csv_path.with_name("peoplefind-lookup-progress.csv")
    records: list[dict[str, str]] = [
        {
            "matric_number": matric,
            "source_csv_row": str(source_row),
            "lookup_status": "pending",
            "error": "",
        }
        for source_row, matric in matric_rows
    ]
    write_checkpoint(output_path, records)

    print("\nA visible browser will open. If the site requires sign-in, sign in manually.")
    print("The runner will not start submitting until you confirm the page is ready.")
    print(f"Progress is saved after every attempt to: {output_path}")
    print("Default selectors:")
    print(f"  First input:  {args.first_selector}")
    print(f"  Second input: {args.second_selector}")
    print(f"  Submit:       {args.submit_selector}")
    if args.result_selector:
        print(f"  Result ready: {args.result_selector}")
    input("Press Enter when the lookup form is ready in the browser... ")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            input(
                "\nCheck the browser is on the correct lookup page and sign in if needed. "
                "Press Enter here to begin..."
            )

            for index, (source_row, matric) in enumerate(matric_rows):
                record = records[index]
                try:
                    first = page.locator(args.first_selector)
                    second = page.locator(args.second_selector)
                    submit = page.locator(args.submit_selector)

                    for label, locator in (
                        ("first matric input", first),
                        ("second matric input", second),
                        ("submit button", submit),
                    ):
                        count = locator.count()
                        if count != 1:
                            raise RuntimeError(
                                f"Expected exactly one {label} for selector "
                                f"{locator} but found {count}. Check the CSS selectors."
                            )
                        if not locator.is_visible():
                            raise RuntimeError(f"The {label} is not visible.")

                    first.fill(matric)
                    second.fill(matric)
                    if first.input_value() != matric or second.input_value() != matric:
                        raise RuntimeError("The two fields did not retain the same matric number.")

                    submit.click(timeout=15000)
                    if args.result_selector:
                        page.locator(args.result_selector).first.wait_for(state="visible", timeout=30000)
                    elif args.wait_seconds:
                        time.sleep(args.wait_seconds)

                    record["lookup_status"] = "submitted"
                    print(f"[{index + 1}/{len(matric_rows)}] Submitted {matric} in both fields.")
                except (Exception) as error:
                    record["lookup_status"] = "error"
                    record["error"] = str(error)[:500]
                    print(f"[{index + 1}/{len(matric_rows)}] ERROR for {matric}: {error}", file=sys.stderr)
                    write_checkpoint(output_path, records)
                    answer = input("The run is paused. Fix the issue before continuing, or type Q to stop: ").strip().lower()
                    if answer == "q":
                        break

                write_checkpoint(output_path, records)

                completed = index + 1
                if completed % args.batch_size == 0 and completed < len(matric_rows):
                    print(f"\nCheckpoint saved: {completed}/{len(matric_rows)} rows attempted.")
                    answer = input("Press Enter to continue the next batch, or type Q to stop safely: ").strip().lower()
                    if answer == "q":
                        break
        finally:
            browser.close()

    submitted = sum(row["lookup_status"] == "submitted" for row in records)
    failed = sum(row["lookup_status"] == "error" for row in records)
    pending = sum(row["lookup_status"] == "pending" for row in records)
    print(f"\nFinished this session. Submitted: {submitted}; errors: {failed}; pending: {pending}.")
    print(f"Checkpoint CSV: {output_path}")
    print("Note: 'submitted' means the form was submitted; it does not verify student details.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
