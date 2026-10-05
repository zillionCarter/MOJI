// Change 'const' to 'var' to prevent double-loading crashes

var SHEETS = {

    HOME: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwH1e2Fz0rHlK0mvdcz2o0Sw-RcmTVRv4hDi79BaFs3qQh9vhjfy-7TNn9tPNnRzQuZrGr53YeYLFo/pub?gid=0&single=true&output=csv',

    RELEASES: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwH1e2Fz0rHlK0mvdcz2o0Sw-RcmTVRv4hDi79BaFs3qQh9vhjfy-7TNn9tPNnRzQuZrGr53YeYLFo/pub?gid=345261716&single=true&output=csv',

    EVENTS: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwH1e2Fz0rHlK0mvdcz2o0Sw-RcmTVRv4hDi79BaFs3qQh9vhjfy-7TNn9tPNnRzQuZrGr53YeYLFo/pub?gid=721355820&single=true&output=csv',

    ARTISTS: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwH1e2Fz0rHlK0mvdcz2o0Sw-RcmTVRv4hDi79BaFs3qQh9vhjfy-7TNn9tPNnRzQuZrGr53YeYLFo/pub?gid=1729311722&single=true&output=csv'

};



var CACHE_KEY = 'unchained_site_data';

var CACHE_TIME_KEY = 'unchained_last_fetch';

var ONE_HOUR = 3600000;



var siteData = null; // Change 'let' to 'var' here too



// --- UTILITIES ---

// Content comes from a Google Sheet and is inserted with innerHTML, so everything
// is escaped / URL-checked first. Use esc() for text and attributes, safeUrl() for links and images.
function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

function safeUrl(value) {
    const u = String(value ?? '').trim();
    return /^(https?:\/\/|\/|#|mailto:)/i.test(u) ? u : '#';
}



function parseCSV(text) {

    const lines = text.split('\n').filter(line => line.trim() !== '');

    return lines.slice(1).map(line => {

        const result = [];

        let cur = '', inQuotes = false;

        for (let char of line) {

            if (char === '"') inQuotes = !inQuotes;

            else if (char === ',' && !inQuotes) { result.push(cur); cur = ''; }

            else cur += char;

        }

        result.push(cur);

        return result;

    });

}



// --- DATA LOGIC ---



async function initSite() {

    const cachedData = localStorage.getItem(CACHE_KEY);

    const lastFetch = localStorage.getItem(CACHE_TIME_KEY);

    const now = Date.now();

   

    const navEntries = performance.getEntriesByType("navigation");

    const isRefresh = navEntries.length > 0 && navEntries[0].type === "reload";



    if (!isRefresh && cachedData && lastFetch && (now - lastFetch < ONE_HOUR)) {

        siteData = JSON.parse(cachedData);

        renderPage();

    } else {

        await refreshAllData();

    }

}



async function refreshAllData() {

    try {

        const [h, r, e, a] = await Promise.all([

            fetch(`${SHEETS.HOME}&t=${Date.now()}`).then(res => res.text()),

            fetch(`${SHEETS.RELEASES}&t=${Date.now()}`).then(res => res.text()),

            fetch(`${SHEETS.EVENTS}&t=${Date.now()}`).then(res => res.text()),

            fetch(`${SHEETS.ARTISTS}&t=${Date.now()}`).then(res => res.text())

        ]);



        siteData = {

            home: parseCSV(h),

            releases: parseCSV(r),

            events: parseCSV(e),

            artists: parseCSV(a)

        };



        localStorage.setItem(CACHE_KEY, JSON.stringify(siteData));

        localStorage.setItem(CACHE_TIME_KEY, Date.now());

        renderPage();

    } catch (err) {

        console.error("Fetch failed:", err);

        const fallback = localStorage.getItem(CACHE_KEY);

        if (fallback) {

            siteData = JSON.parse(fallback);

            renderPage();

        }

    }

}



// --- RENDER LOGIC ---



// --- RENDER LOGIC ---

function renderPage() {

    // We use .toLowerCase() and check for the name without .html so it works on Netlify

    const path = window.location.pathname.toLowerCase();



    // --- HOME PAGE LOGIC ---

    // Matches "/", "/index", or "/index.html"

    if (path === '/' || path.endsWith('/') || path.includes('index')) {

        const container = document.querySelector('#home-updates');

        if (container && siteData?.home && siteData.home.length > 0) {

            const topRelease = siteData.home[0];

            let homeHtml = `

                <div class="card">

                    <h3 style="color: var(--accent-color); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 2px;">New Release</h3>

                    <h2 style="margin: 10px 0; font-size: 1.4rem;">${esc(topRelease[0])}</h2>

                    <p style="color: #888; font-size: 0.85rem; line-height: 1.4;">${esc(topRelease[1])}</p>

                    <a href="${esc(safeUrl(topRelease[2]))}" class="btn" style="padding: 8px 18px; margin-top: 15px; font-size: 0.8rem;" target="_blank" rel="noopener">${esc(topRelease[3])}</a>

                </div>`;



            let nextEventHtml = '';

            const nextEvent = siteData.events?.find(r => r[5]?.trim().toLowerCase() === 'upcoming');



            if (nextEvent) {

                const dateStr = nextEvent[1] ? nextEvent[1].trim() : 'TBA';

                let dateBoxInner = '';



                if (/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*$/i.test(dateStr)) {

                    dateBoxInner = `

                        <div style="font-size: 0.8rem; color: #fff; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">${dateStr}</div>

                        <div style="font-size: 0.55rem; color: var(--accent-color); font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px;">Weekly</div>`;

                } else if (dateStr.includes('&')) {

                    const parts = dateStr.split(/\s+/);

                    dateBoxInner = `

                        <div style="line-height: 1.1;">

                            <div style="font-size: 1.1rem; color: #fff; font-weight: 900; letter-spacing: 1px;">${esc(parts[0])}</div>

                            <div style="font-size: 0.8rem; color: var(--accent-color); font-weight: 900; margin: -2px 0;">&</div>

                            <div style="font-size: 1.1rem; color: #fff; font-weight: 900; letter-spacing: 1px;">${esc(parts[2])}</div>

                        </div>`;

                } else {

                    const dateParts = dateStr.split(/\s+/);

                    const month = (dateParts[0] || '').substring(0, 3).toUpperCase();

                    const day = dateParts[1] || '';

                    dateBoxInner = `

                        <div style="font-size: 0.8rem; color: #fff; font-weight: 900; text-transform: uppercase;">${esc(month)}</div>

                        <div style="font-size: 1.8rem; color: var(--accent-color); font-weight: 900; line-height: 1;">${esc(day)}</div>`;

                }



                nextEventHtml = `

                    <div class="card next-event-card" style="border-left: 3px solid var(--accent-color); background: #050505; display: flex; flex-direction: column; justify-content: space-between;">

                        <div>

                            <h3 style="color: #444; font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">Next Event</h3>

                            <div style="display: flex; align-items: center; gap: 15px;">

                                <div style="text-align: center; background: #111; padding: 10px 8px; border-radius: 4px; min-width: 55px; border: 1px solid #1a1a1a;">

                                    ${dateBoxInner}

                                </div>

                                <div style="flex: 1;">

                                    <h3 style="font-size: 1.1rem; color: #fff; margin: 0; line-height: 1.2;">${esc(nextEvent[0])}</h3>

                                    <p style="font-size: 0.75rem; color: #666; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">${esc(nextEvent[2])}</p>

                                </div>

                            </div>

                        </div>

                        <a href="events.html" class="btn" style="padding: 6px 12px; font-size: 0.7rem; width: fit-content; border-color: #222; margin-top: 15px;">ALL EVENTS</a>

                    </div>`;

            } else {

                nextEventHtml = `

                    <div class="card next-event-card" style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 1px dashed #222;">

                        <h3 style="color: var(--accent-color); font-size: 0.9rem; letter-spacing: 1px;">CHECK BACK SOON</h3>

                        <p style="font-size: 0.7rem; color: #444; margin-top: 5px;">NEW DATES DROPPING SHORTLY</p>

                    </div>`;

            }

            container.innerHTML = homeHtml + nextEventHtml;

        }

    }



    // --- LABEL / RELEASES LOGIC ---

if (path.includes('label')) {

    const container = document.querySelector('.release-grid');

    if (container && siteData?.releases) {

        // helper: convert common Spotify URLs to embed URLs
        function toSpotifyEmbed(url) {
            if (!url) return '';
            try {
                const u = url.trim();
                // spotify share URL containing /track/{id}
                let m = u.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
                if (m && m[1]) return `https://open.spotify.com/embed/track/${m[1]}`;
                // spotify uri like spotify:track:{id}
                m = u.match(/spotify:track:([a-zA-Z0-9]+)/);
                if (m && m[1]) return `https://open.spotify.com/embed/track/${m[1]}`;
                // already an embed URL
                if (u.includes('open.spotify.com/embed/')) return u;
                return '';
            } catch (e) { return ''; }
        }

        container.innerHTML = siteData.releases.map(row => {

            const mSpot = row[4];

            const rawSpotify = row[2];
            const embedSrc = toSpotifyEmbed(rawSpotify);


            // Only add onclick if link exists and is not empty
            const onclickHandler = mSpot && mSpot.trim() ? `data-href="${esc(safeUrl(mSpot))}"` : '';

            const iframeHtml = embedSrc ? `\n                    <iframe style=\"border-radius:12px; margin-top:15px; width:100%; height:232px; border:none;\" src=\"${esc(safeUrl(embedSrc))}\" frameBorder=\"0\" allow=\"autoplay; encrypted-media;\" loading=\"lazy\"></iframe>` : '';

            return `

                <div class="card" ${onclickHandler} style="cursor: ${mSpot && mSpot.trim() ? 'pointer' : 'default'};">

                    <div class="image-wrapper">

                        <img src="${esc(safeUrl(row[3]))}" alt="${esc(row[0])}" loading="lazy">

                    </div>

                    <div class="card-text">

                        <h3>${esc(row[0])}</h3>

                        <p>${esc(row[1])}</p>

                    </div>

                    ${iframeHtml}

                </div>`;

        }).join('');

        // Cards with a data-href open their link in a new tab (replaces an inline onclick).
        container.querySelectorAll('.card[data-href]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('iframe')) return;
                window.open(card.dataset.href, '_blank', 'noopener');
            });
        });

    }

}



    // --- EVENTS PAGE LOGIC ---

    if (path.includes('events')) {

        const upcoming = document.querySelector('#upcoming-events');

        const past = document.querySelector('#past-events');

       

        if (siteData?.events) {

            const renderEvent = (row) => {

                const title = row[0] || 'TBA';

                const dateStr = row[1] ? row[1].trim() : 'TBA';

                const location = row[2] || '';

                let link = row[3] ? row[3].trim() : '#';

                const imageUrl = row[4] ? row[4].trim() : '';

                const isPast = row[5]?.trim().toLowerCase() === 'past';

                // Genres line under the location. Comes from an optional 7th sheet column
                // ("Genres"); Terminus nights fall back to the defaults below so they show
                // without touching the sheet.
                const TERMINUS_GENRES = {
                    'wednesday': 'Hard Techno, Industrial, Hardcore, Psy, Raw, UpTempo',
                    'friday': 'Hard Bounce, Hard Trance, Hard Groove, Neo Rave, Schranz',
                    'saturday': 'Hard Techno, Industrial, Hardcore, Psy, Raw, UpTempo',
                    'wed & sat': 'Hard Techno, Industrial, Hardcore, Psy, Raw, UpTempo'
                };
                let genres = row[6] ? row[6].trim() : '';
                if (!genres && !isPast && /terminus/i.test(title)) {
                    genres = TERMINUS_GENRES[dateStr.toLowerCase()] || '';
                }

                // Any Megatix link pasted into the sheet (megatix.co.id/events/<slug>)
                // is converted to its white-label form so the Megatix widget on
                // events.html opens the embedded checkout instead of leaving the site.
                // Non-Megatix links (and past events) are left untouched.
                const megatixMatch = link.match(/^https?:\/\/(?:www\.)?megatix\.co\.id\/(?:events|white-label)\/([^/?#\s]+)/i);
                if (!isPast && megatixMatch) {
                    link = `https://megatix.co.id/white-label/${megatixMatch[1]}`;
                }

                const dateParts = dateStr.split(/\s+/);

                let badgeHtml = '';



                if (/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*$/i.test(dateStr)) {

                    // Single recurring night, e.g. "Wednesday"

                    badgeHtml = `

                        <span class="badge-weekly">${dateStr}</span>

                        <span class="badge-note">Weekly</span>`;

                } else if (dateStr.includes('&')) {

                    // Recurring night, e.g. "WED & SAT"

                    badgeHtml = `

                        <span class="badge-weekly">${esc(dateParts[0])} &amp; ${esc(dateParts[2] || '')}</span>

                        <span class="badge-note">Weekly</span>`;

                } else {

                    const month = (dateParts[0] || '').substring(0, 3).toUpperCase();

                    // Keeps "5th" / "21st" but drops the comma in "17, 2026"

                    const day = (dateParts[1] || '').replace(/[^0-9a-z]/gi, '');

                    const year = (dateParts[2] || '').replace(/\D/g, '');

                    badgeHtml = `

                        <span class="badge-month">${esc(month)}</span>

                        <span class="badge-day">${esc(day)}</span>

                        ${year ? `<span class="badge-note">${year}</span>` : ''}`;

                }



                const mediaInner = imageUrl

                    ? `<img src="${esc(safeUrl(imageUrl))}" alt="${esc(title)} poster" loading="lazy">`

                    : '';



                return `

                <div class="card event-card">

                    <a class="event-media${imageUrl ? '' : ' event-media--empty'}" href="${esc(safeUrl(link))}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">

                        ${mediaInner}

                        <span class="event-date-badge">${badgeHtml}</span>

                    </a>

                    <div class="event-body">

                        <div class="card-text">

                            <h3>${esc(title)}</h3>

                            <p class="location"><i class="fas fa-map-marker-alt"></i> ${esc(location)}</p>

                            ${genres ? `<p class="genres">${esc(genres)}</p>` : ''}

                        </div>

                        <a href="${esc(safeUrl(link))}" class="btn event-cta" target="_blank" rel="noopener">

                            ${isPast ? 'GALLERY' : 'TICKETS'}

                        </a>

                    </div>

                </div>`;

            };



            if (upcoming) {

                upcoming.innerHTML = siteData.events

                    .filter(r => r[5]?.trim().toLowerCase() === 'upcoming')

                    .map(renderEvent).join('');

            }

            if (past) {

                past.innerHTML = siteData.events

                    .filter(r => r[5]?.trim().toLowerCase() === 'past')

                    .map(renderEvent).join('');

            }

        }

    }



    // --- ARTISTS PAGE LOGIC ---

    if (path.includes('artists')) {

        const container = document.querySelector('#artist-container');

        if (container && siteData?.artists) {

            container.innerHTML = siteData.artists

                .filter(row => row[0] && row[0].trim() !== '')

                .map(row => {

                    const name = row[0]?.trim();

                    const bio  = row[1]?.trim();

                    const img  = row[2]?.trim();

                    const sc   = row[3]?.trim();

                    const ig   = row[4]?.trim();

                    const fb   = row[5]?.trim();

                    const sp   = row[6]?.trim();



                    return `

                    <div class="artist-item">

                        <img src="${esc(safeUrl(img))}" alt="${esc(name)}" loading="lazy">

                        <div class="artist-item-info">

                            <h3>${esc(name)}</h3>

                            <p>${esc(bio)}</p>

                        </div>

                        <div class="artist-item-socials">

                            ${sc ? `<a href="${esc(safeUrl(sc))}" target="_blank" rel="noopener noreferrer"><i class="fab fa-soundcloud"></i></a>` : ''}

                            ${ig ? `<a href="${esc(safeUrl(ig))}" target="_blank" rel="noopener noreferrer"><i class="fab fa-instagram"></i></a>` : ''}

                            ${fb ? `<a href="${esc(safeUrl(fb))}" target="_blank" rel="noopener noreferrer"><i class="fab fa-facebook"></i></a>` : ''}

                            ${sp ? `<a href="${esc(safeUrl(sp))}" target="_blank" rel="noopener noreferrer"><i class="fab fa-spotify"></i></a>` : ''}

                        </div>

                    </div>`;

                }).join('');

        }

    }

}



document.addEventListener('DOMContentLoaded', () => {

    // Run your sheets data loading

    initSite();



    const navToggle = document.querySelector('.nav-toggle');

    const navLinks = document.querySelector('.nav-links');



    if (navToggle && navLinks) {

        navToggle.addEventListener('click', () => {

            // This is the magic line that works with the CSS we added above

            navLinks.classList.toggle('active');

           

            // Toggle the icon between bars and X

            const icon = navToggle.querySelector('i');

            if (icon) {

                if (icon.classList.contains('fa-bars')) {

                    icon.classList.replace('fa-bars', 'fa-times');

                } else {

                    icon.classList.replace('fa-times', 'fa-bars');

                }

            }

        });



        // Close the drawer when a menu link is tapped on mobile

        navLinks.querySelectorAll('a').forEach(link => {

            link.addEventListener('click', () => {

                if (navLinks.classList.contains('active')) {

                    navLinks.classList.remove('active');

                    const icon = navToggle.querySelector('i');

                    if (icon) {

                        icon.classList.remove('fa-times');

                        icon.classList.add('fa-bars');

                    }

                }

            });

        });

    }

}); 

