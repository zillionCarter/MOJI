from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    context = b.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
    page = context.new_page()
    page.goto('https://www.beatport.com/label/unchained-recordings/62744', timeout=90000)
    try:
        page.wait_for_function("document.title !== 'Just a moment...'", timeout=90000)
    except Exception as e:
        print('wait_for_function failed:', e)
    print('TITLE:', page.title())
    print('URL:', page.url)
    html = page.content()
    print('FOUND track-card', 'track-card' in html)
    print('FOUND data-testid', 'data-testid' in html)
    print('FOUND bp-track-card', 'bp-track-card' in html)
    print('FOUND bucket-item', 'bucket-item' in html)
    print('FOUND track-list-item', 'track-list-item' in html)
    print('BODY START:')
    print(html[:4000])
    context.close()
    b.close()
