import sys
import time
from playwright.sync_api import sync_playwright

def main():
    print("Launching browser via Playwright...")
    with sync_playwright() as p:
        # Use locally installed Google Chrome or Edge
        executable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        try:
            browser = p.chromium.launch(executable_path=executable, headless=True)
            print(f"Launched Chrome at {executable}")
        except Exception as e:
            print(f"Failed to launch Chrome ({e}), trying Edge...")
            executable = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
            browser = p.chromium.launch(executable_path=executable, headless=True)
            print(f"Launched Edge at {executable}")

        # 1. Desktop Screenshot (1440 x 900)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        print("Navigating to http://127.0.0.1:5173/ ...")
        page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        time.sleep(1)

        print("Clicking 'Try example trip' button...")
        # Find and click Try example trip button
        example_btn = page.locator('button:has-text("Try example trip")')
        example_btn.click()

        print("Waiting for trip calculation and map rendering...")
        page.wait_for_selector('text=Trip Legs Breakdown', timeout=20000)
        time.sleep(3) # Wait for Leaflet map tiles and SVG polylines to stabilize

        # 1. Desktop Screenshot (1440 x 900)
        desktop_path = r"C:\Users\Ankit\.gemini\antigravity-ide\brain\b20d1871-142a-48c6-b34f-4a60dd89b51a\desktop_example_trip.png"
        page.screenshot(path=desktop_path, full_page=False)
        print(f"Desktop screenshot saved to: {desktop_path}")

        # 1b. Desktop Scrolled to Timeline & Daily Logs Tab
        page.evaluate("window.scrollBy(0, 500)")
        time.sleep(1)
        desktop_timeline_path = r"C:\Users\Ankit\.gemini\antigravity-ide\brain\b20d1871-142a-48c6-b34f-4a60dd89b51a\desktop_timeline_trip.png"
        page.screenshot(path=desktop_timeline_path, full_page=False)
        print(f"Desktop timeline screenshot saved to: {desktop_timeline_path}")

        # Reset scroll
        page.evaluate("window.scrollTo(0, 0)")

        # 2. Mobile Screenshot (390 x 844)
        print("Resizing to mobile (390 x 844)...")
        page.set_viewport_size({"width": 390, "height": 844})
        time.sleep(2)
        mobile_path = r"C:\Users\Ankit\.gemini\antigravity-ide\brain\b20d1871-142a-48c6-b34f-4a60dd89b51a\mobile_example_trip.png"
        page.screenshot(path=mobile_path, full_page=False)
        print(f"Mobile screenshot saved to: {mobile_path}")

        # 2b. Mobile Scrolled to Map and Overview
        page.evaluate("window.scrollBy(0, 680)")
        time.sleep(1.5)
        mobile_map_path = r"C:\Users\Ankit\.gemini\antigravity-ide\brain\b20d1871-142a-48c6-b34f-4a60dd89b51a\mobile_map_trip.png"
        page.screenshot(path=mobile_map_path, full_page=False)
        print(f"Mobile map screenshot saved to: {mobile_map_path}")

        browser.close()
        print("Completed successfully!")

if __name__ == "__main__":
    main()
