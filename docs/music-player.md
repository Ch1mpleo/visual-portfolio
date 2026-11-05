# Music player audio

The player imports the user-supplied full, clean MP3 of **No Church In The Wild** from `src/assets/music/no-church-in-the-wild.mp3`. Astro serves this asset in development and copies it with a content hash and the correct base URL in production. This avoids the missing public-file response seen when adding the original audio directory to an already-running development server.

The turntable uses the audio's real duration. Moving the timeline turns the record in either direction and moves the tonearm through the grooves. Dragging the record cues audio (12 seconds per hand revolution); arrow keys on the record seek five seconds. Play lowers the tonearm and spins the record; pause parks it. The ASCII background responds to the audio spectrum. Reduced motion keeps the graphics still.

To replace the audio:

1. Replace `src/assets/music/no-church-in-the-wild.mp3`, or set another public path in `.env`:

   ```dotenv
   PUBLIC_MUSIC_TRACK_URL=audio/no-church-in-the-wild.mp3
   ```

2. Restart the dev server or rebuild the site. Relative public paths automatically include the production `/visual-portfolio/` base. No environment setting is needed for the imported MP3.

The same setting accepts an HTTPS URL. A remote server must allow cross-origin audio access for the volume control and audio-reactive ASCII background to work. Only public audio URLs belong in this setting; its value is included in the site.

The player supports elapsed/total timestamps, saved volume, and reduced motion. Audio is only requested after a play click. Audio and artwork are local assets, with no Spotify links, embeds, or network requests.

Run `scripts/qa-music.mjs` with Playwright available (or set `PLAYWRIGHT_PACKAGE` to its path). By default it tests the built site. Set `MUSIC_QA_URL=http://127.0.0.1:4321/` to run the same checks against the live development server; both paths should pass after audio changes.
