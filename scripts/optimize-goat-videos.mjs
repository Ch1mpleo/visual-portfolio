import { spawn } from 'node:child_process'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ffmpeg = process.argv[2] || 'ffmpeg'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src', 'assets', 'goats')
const output = join(root, 'public', 'goats')
const names = [
  'ArcRaider', 'Arthur', 'Arthur2', 'Choso', 'Cowboy', 'EldenRing',
  'Greatness', 'GurrenLagann', 'Maki', 'Marathon1', 'Marathon2',
  'MyHero', 'MyHero2', 'NYC', 'Vinland', 'Change', 'GOW',
]

// The source clips above this range have enough bitrate to benefit from a
// 720p web encode. Smaller clips are remuxed without any quality loss.
const transcode = new Set([
  'Arthur', 'Greatness', 'GurrenLagann', 'Marathon1', 'Marathon2',
  'MyHero', 'MyHero2', 'Vinland',
])

for (const dir of ['full', 'posters']) {
  await mkdir(join(output, dir), { recursive: true })
}

function run(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolveRun()
      else reject(new Error(`ffmpeg exited with code ${code}: ${args.join(' ')}`))
    })
  })
}

const scaleFull = "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"
const scalePoster = "scale=w='min(640,iw)':h='min(360,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"

for (const name of names) {
  const input = join(source, `${name}.mp4`)
  const full = join(output, 'full', `${name}.mp4`)
  const poster = join(output, 'posters', `${name}.jpg`)

  const fullArgs = transcode.has(name)
    ? [
        '-i', input, '-vf', scaleFull, '-c:v', 'libx264', '-preset', 'veryfast',
        '-crf', '25', '-maxrate', '2200k', '-bufsize', '4400k',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k',
        '-movflags', '+faststart', full,
      ]
    : ['-i', input, '-c', 'copy', '-movflags', '+faststart', full]

  await run(fullArgs)
  await run([
    '-ss', '2', '-i', input, '-frames:v', '1', '-vf', scalePoster,
    '-q:v', '5', poster,
  ])

  const [originalSize, fullSize] = await Promise.all(
    [input, full].map(async (file) => (await stat(file)).size),
  )
  console.log(
    `${name}: ${(originalSize / 1048576).toFixed(1)} → ${(fullSize / 1048576).toFixed(1)} MiB`,
  )
}
