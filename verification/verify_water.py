from playwright.sync_api import sync_playwright
import time

def verify_water_simulation(page):
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser error: {err}"))

    print("Navigating to app...")
    page.goto("http://localhost:5173")
    print("Waiting for canvas...")
    page.wait_for_selector("canvas", timeout=10000)
    print("Waiting for scene to render...")
    time.sleep(5)
    print("Taking screenshot...")
    page.screenshot(path="verification/verification.png")
    print("Screenshot saved to verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(
            headless=True,
            args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox']
        )
        page = browser.new_page()
        try:
            verify_water_simulation(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
