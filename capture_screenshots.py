import time
from playwright.sync_api import sync_playwright

def main():
    print("Launching browser via Playwright...")
    with sync_playwright() as p:
        executable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        browser = p.chromium.launch(executable_path=executable, headless=True)

        # 1. Desktop 1440 x 900
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        print("Navigating to http://127.0.0.1:5173/ at 1440px...")
        page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        time.sleep(1)

        # Click Try example trip
        print("Clicking 'Try example trip'...")
        page.locator('button:has-text("Try example trip")').first.click()

        page.wait_for_selector('text=Trip Legs Breakdown', timeout=20000)
        time.sleep(3)

        desktop_path = r"C:\Users\Ankit\.gemini\antigravity-ide\brain\b20d1871-142a-48c6-b34f-4a60dd89b51a\responsive_desktop_1440.png"
        page.screenshot(path=desktop_path, full_page=False)
        print(f"Saved: {desktop_path}")

        # Switch to Daily Log Sheets Tab
        print("Switching to Daily Log Sheets tab...")
        page.locator('button:has-text("Daily Log Sheets")').click()
        time.sleep(2)
        logs_path = r"C:\Users\Ankit\.gemini\antigravity-ide\brain\b20d1871-142a-48c6-b34f-4a60dd89b51a\responsive_desktop_logs.png"
        page.screenshot(path=logs_path, full_page=False)
        print(f"Saved: {logs_path}")

        # 2. Tablet 768 x 1024
        print("Resizing to Tablet 768 x 1024...")
        page.set_viewport_size({"width": 768, "height": 1024})
        time.sleep(2)
        tablet_path = r"C:\Users\Ankit\.gemini\antigravity-ide\brain\b20d1871-142a-48c6-b34f-4a60dd89b51a\responsive_tablet_768.png"
        page.screenshot(path=tablet_path, full_page=False)
        print(f"Saved: {tablet_path}")

        # 3. Mobile 375 x 812
        print("Resizing to Mobile 375 x 812...")
        page.set_viewport_size({"width": 375, "height": 812})
        time.sleep(2)
        mobile_path = r"C:\Users\Ankit\.gemini\antigravity-ide\brain\b20d1871-142a-48c6-b34f-4a60dd89b51a\responsive_mobile_375.png"
        page.screenshot(path=mobile_path, full_page=False)
        print(f"Saved: {mobile_path}")

        browser.close()
        print("All responsive screenshots captured successfully!")

if __name__ == "__main__":
    main()
