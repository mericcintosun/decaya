# Decaya: Devpost submission text

Fields are in the order the Devpost form asks for them. Each block is ready to paste as written.

## Project name

Decaya

(6 characters; Devpost allows 60.)

## Elevator pitch

Clap once in your room. Decaya measures the echo, works out which rug or curtain will fix it, and lets you hear the result before you buy.

(138 characters; Devpost allows 200.)

## About the project

### The problem

Students record a lot from their rooms: podcasts, covers, voice homework, online class presentations. When it sounds bad, the microphone gets the blame and a new one gets ordered. Usually the room is the problem. A dorm with a hard floor and painted block walls keeps every word ringing for close to a second, and speech only sounds clear when that decay is under half a second. Existing tools either need a measurement microphone and a desktop, or give you one RT60 number and stop. Our goal: tell a student what to add to the room, and let them hear the difference before they spend anything.

### What it does, step by step

1. **Home page.** The largest card is a live preview on an illustrative dorm room from the fieldbook. Press "Thick curtain" and "Duvet on the wall" and the predicted decay bars drop toward the green speech strip. Drag the room width handle and the prediction changes, because the same items cover less of a bigger room.
2. **Measure a room.** Name the room, clap three times, and Decaya grades each clap. The stamp reads "3 of 3 claps valid" with the noise floor and the capture path. If the microphone is blocked, "Use the sample measurement" loads a stored example, labelled "Sample data". Save it to the fieldbook.
3. **The room page.** The mid-band decay and the decay curve falling past the green wedge. One line: it is not the mic, it is the room.
4. **The simulator.** Enter the room size and add a thick curtain and a duvet. The predicted bars drop into the strip. Toggle the $79 foam pack to see it does less: twelve squares cover about one square meter, a duvet covers four.
5. **Listen before you buy.** "Your room now", then "With thick curtain and duvet on the wall". Same phrase, same loudness, only the decay changes.
6. **Back home.** The new room sits at the top of the fieldbook. The Method page explains the measurement and where it is rough.

Every number shown after an item is added is labelled a prediction. The ten fieldbook rooms are illustrative examples, not measurements we took.

### How we built it

Next.js 15 and React 19 on Vercel. The whole measurement runs in the browser with the Web Audio API: raw PCM capture through an AudioWorklet, octave band filtering in an `OfflineAudioContext`, Schroeder backward integration and a T20 fit per band, then Sabine's equation solved backwards (absorption already in the room) and forwards (with the new items). The preview synthesizes two impulse responses from the same seeded noise and runs one dry phrase through a `ConvolverNode`. No server sees the audio and no AI model runs in the product.

### Iteration: what we built, tested and improved

- **Capture path.** A compressed MediaRecorder recording can smear the decay tail, so capture moved to raw PCM through an AudioWorklet (`public/worklets/pcm-capture.js`). If the worklet sends no audio within 600 ms, Decaya falls back to MediaRecorder and the quality report says so and calls the number a lower bound.
- **Quality report.** Each clap is graded (clipped, under 30 dB above the noise, or too little tail after it) and the report lists every clap with its five band values, so a bad clap never sets the number silently.
- **Fair A/B.** The first player built each impulse response only after a tap, and stopping a clip left the reverb tail ringing into the other side. Now both responses are built before either plays and the old side fades out in 30 ms.
- **Idempotent save.** A double click on save could store the same room twice. Each measurement now gets one draft id, the store replaces a room by slug, and the save button stays disabled while saving.
- **Touch targets and small screens.** Buttons and inputs grew to a 44 px target, the header became a menu below tablet width, and long button labels wrap instead of overflowing at 360 px.
- **Front end pass.** Screenshots of the deployed site showed letter gaps in the body font, empty bento cells and list rows whose punched hole looked like a radio button. We fixed the font loading, gave every cell content, and added the draggable room width on the first screen plus staged animations in the clap capture.
- **Checks.** `npm test` runs unit tests on the acoustics functions, the schemas and the room store; `npm run proof` reruns a synthetic T20 check (an ideal 0.9 s decay), the demo room prediction and the store checks, and writes the results into the README.

### What is next

Measuring from four spots and averaging, early reflections in the preview, and a cheapest-plan shopping list per room.

## Built with

next.js, react, typescript, tailwind-css, motion, zod, lucide-react, radix-ui, class-variance-authority, clsx, tailwind-merge, tsx, Web Audio API (a browser API, not a package)

## Try it out

- Live app: https://decaya.vercel.app
- Source: https://github.com/mericcintosun/decaya

## Reused code, assets and AI disclosure

- Absorption coefficients adapted from Beranek and from Everest's *Master Handbook of Acoustics*; duvet, bookshelf and bean bag values are our estimates and are labelled that way in the app.
- Illustrations and logo are original SVGs made for this project. Fonts are Fraunces and Source Sans 3 from Google Fonts (SIL Open Font License). npm packages are used under their own licenses.
- The dry voice in the A/B player is a formant synth written for this project; no recorded speech clip is included.
- AI tools used must be disclosed: we used Claude Code (Anthropic) as the coding assistant for scaffolding, implementation and documentation drafts. Product decisions and review are ours. No AI model runs in the product.

## Team and what was built during the event

Solo build: one person did the product, design, code and testing, and built Decaya during the event, as the commit history in the repository shows.
