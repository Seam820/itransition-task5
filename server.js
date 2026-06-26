// backend/server.js
const express = require('express');
const cors = require('cors');
const { fakerEN_US, fakerDE } = require('@faker-js/faker');
const seedrandom = require('seedrandom');

const app = express();
app.use(cors());
app.use(express.static('public')); 

// Locales mapping for different regions
const locales = {
    'en-US': fakerEN_US,
    'de-DE': fakerDE 
};

const BATCH_SIZE = 20;
const PORT = 3000;

//  Escaper method
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/*
 * Instructor's concept according to higher-order function
 * This function allows a function to be run a non-integer (fractional) number of times
 * For safety and determinism, a custom seeded RNG is passed here
 */
const times = (n, fn, rng) => {
    if (n < 0) throw new Error("The first argument cannot be negative.");
    return (arg) => {
        let current = arg;
        for (let i = Math.floor(n); i--;) {
            current = fn(current);
        }
        // Fractional part probability check (if 0.7 probability, run one more time)
        return rng() < (n % 1) ? fn(current) : current;
    };
};

app.get('/api/songs', (req, res) => {
    const region = req.query.region || 'en-US';
    const seed = parseInt(req.query.seed, 10) || 0;
    const page = parseInt(req.query.page, 10) || 1;
    const likesAvg = parseFloat(req.query.likes) || 0;
    
    const faker = locales[region] || locales['en-US'];
    const sequenceOffset = (page - 1) * BATCH_SIZE + 1;

    const songs = new Array(BATCH_SIZE);

    for (let i = 0; i < BATCH_SIZE; i++) {
        const sequenceIndex = sequenceOffset + i;

        /*
         * [Concept 2: Independent Sub-Generator]
         * I am creating a completely unique and separate seed for each song
         * This ensures that changing the like count will never affect the faker's song title or sequence
         */
        const songSeedString = `${seed}-${page}-${sequenceIndex}`;
        const songRng = seedrandom(songSeedString);
        
        // The faker library is seeded with this specific song's seed
        const fakerSeedValue = Math.abs(songRng.int32());
        faker.seed(fakerSeedValue);

        // 1. Using the instructor's 'times' method to calculate likes (e.g, 4.7 likes)
        const addOne = x => x + 1;
        const processLikes = times(likesAvg, addOne, songRng);
        const actualLikes = processLikes(0); // 0 to calculate likes

        // 2. Using the faker to generate the remaining song data
        const isSingle = faker.datatype.boolean();
        const albumTitle = isSingle ? "Single" : faker.music.album();

        const primaryGenre = faker.music.genre();
        let secondaryGenre = faker.music.genre();
        if (secondaryGenre === primaryGenre) {
            secondaryGenre = 'Electronic';
        }
        const finalGenreString = `${primaryGenre}, ${secondaryGenre}`;

        const songReview = region === 'de-DE' 
            ? `Ein absolutes Meisterwerk des ${primaryGenre}-Genres. Sehr zu empfehlen!`
            : `An absolute masterpiece of the ${primaryGenre} genre. Highly recommended!`;

        songs[i] = {
            index: sequenceIndex,
            title: faker.music.songName(),
            artist: faker.person.fullName(),
            album: albumTitle,
            genre: finalGenreString,
            likes: actualLikes,
            review: songReview
        };
    }

    res.json(songs);
});

app.get('/api/cover', (req, res) => {
    const title = escapeHTML(req.query.title || 'Untitled');
    const artist = escapeHTML(req.query.artist || 'Unknown');
    const seed = req.query.seed || '0';
    const rng = seedrandom(seed);

    const baseHue = Math.floor(rng() * 360);
    const primaryColor = `hsl(${baseHue}, 85%, 45%)`;
    const secondaryColor = `hsl(${(baseHue + 135) % 360}, 90%, 55%)`;
    const darkGradientColor = `hsl(${(baseHue + 220) % 360}, 40%, 12%)`;

    const compositionType = Math.floor(rng() * 3); 
    let vectorGraphics = '';
    
    if (compositionType === 0) {
        vectorGraphics = `
            <g opacity="0.4">
                <line x1="0" y1="50" x2="250" y2="50" stroke="white" stroke-width="0.5" stroke-dasharray="4,4"/>
                <line x1="0" y1="100" x2="250" y2="100" stroke="white" stroke-width="0.5" stroke-dasharray="4,4"/>
                <line x1="0" y1="150" x2="250" y2="150" stroke="white" stroke-width="0.5" stroke-dasharray="4,4"/>
                <line x1="62" y1="0" x2="62" y2="200" stroke="white" stroke-width="0.5" stroke-dasharray="4,4"/>
                <line x1="125" y1="0" x2="125" y2="200" stroke="white" stroke-width="0.5" stroke-dasharray="4,4"/>
                <line x1="188" y1="0" x2="188" y2="200" stroke="white" stroke-width="0.5" stroke-dasharray="4,4"/>
            </g>
            <circle cx="125" cy="100" r="85" fill="none" stroke="${secondaryColor}" stroke-width="3" opacity="0.4" />
            <circle cx="125" cy="100" r="60" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-dasharray="8,4" opacity="0.6" />
        `;
    } else if (compositionType === 1) {
        vectorGraphics = `
            <path d="M-20 -20 L180 -20 L50 220 L-20 220 Z" fill="${primaryColor}" opacity="0.4" />
            <path d="M270 220 L70 220 L150 -20 L270 -20 Z" fill="${secondaryColor}" opacity="0.3" />
            <circle cx="125" cy="100" r="70" fill="url(#albumCoreGlow)" opacity="0.5" />
        `;
    } else {
        vectorGraphics = `
            <polygon points="25,200 75,60 125,200" fill="${primaryColor}" opacity="0.5"/>
            <polygon points="100,200 160,30 220,200" fill="${secondaryColor}" opacity="0.4"/>
            <circle cx="220" cy="50" r="25" fill="${secondaryColor}" opacity="0.6" />
        `;
    }

    const svg = `
    <svg width="250" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#1E2640;stop-opacity:1" />
                <stop offset="50%" style="stop-color:${darkGradientColor};stop-opacity:1" />
                <stop offset="100%" style="stop-color:#080B11;stop-opacity:1" />
            </linearGradient>
            <radialGradient id="albumCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:${secondaryColor};stop-opacity:1" />
                <stop offset="100%" style="stop-color:transparent;stop-opacity:0" />
            </radialGradient>
            <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.9"/>
            </filter>
            <filter id="canvasNoise">
                <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" result="noise"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
            </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgGrad)" />
        ${vectorGraphics}
        <rect width="100%" height="100%" filter="url(#canvasNoise)" style="mix-blend-mode: overlay;" />
        <g filter="url(#textShadow)">
            <text x="125" y="92" font-family="'Segoe UI', -apple-system, sans-serif" font-size="14" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">${title.toUpperCase()}</text>
            <text x="125" y="118" font-family="'Segoe UI', -apple-system, sans-serif" font-size="11" font-weight="600" fill="#94A3B8" text-anchor="middle" letter-spacing="0.2">${artist}</text>
        </g>
    </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
});

app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));