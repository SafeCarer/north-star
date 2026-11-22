# North Star

A calm, mobile-first life planner. It works offline and installs to your home screen.

## Files
- `index.html`, `styles.css`, `app.js`: the app
- `manifest.webmanifest`, `sw.js`, `icons/`: what makes it installable and offline-capable

## Run it on this PC
```
python -m http.server 5173
```
Then open http://localhost:5173

## Put it on your phone
Phones only install web apps served over **https**. Upload this folder to any free static host (for example Netlify Drop or GitHub Pages), then open the link on your phone:
- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** ⋮ → Install app

## Your private plan
The published code only has a neutral starter plan. Your real goals, names and numbers are in
`my-plan.json`, which `.gitignore` keeps out of GitHub. The first time you open the app on a new
device, tap **Import my plan** and choose that file (it's in OneDrive, so your phone can reach it).

## Your data
Everything is stored on the device in the browser (localStorage). Nothing is sent anywhere.
Use **Settings → Export** regularly. The backup is a `.json` file you can import on another device.

## Updating the app
After editing any file, change `VERSION` in `sw.js` (e.g. `northstar-v2`) so installed copies pick up the change.
