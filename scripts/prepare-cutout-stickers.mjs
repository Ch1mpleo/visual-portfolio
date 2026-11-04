// Real photographs, hand-traced masks, a paper rim, and deterministic grain. No AI.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const inputs = resolve('.astro/sticker-sources')
const output = resolve('public/components/stickers')
await mkdir(inputs, { recursive: true })
await mkdir(output, { recursive: true })
const photographs = [
  { name: 'camera', ext: 'jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Canon-ae1.jpg', size: [800,487], width: 360,
    contour: '48,146 92,114 152,131 215,115 215,105 303,89 324,67 351,46 368,28 438,19 496,44 537,77 586,46 628,61 638,91 690,99 720,138 760,155 762,184 730,228 711,254 725,334 688,355 617,376 207,454 173,463 158,444 127,361 104,275 68,209' },
  { name: 'lens', ext: 'png', url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Large_format_camera_lens.png', width: 218 },
  { name: 'film', ext: 'jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Film_-_A_Dying_Art_%28Unsplash%29.jpg', size: [800,533], width: 300,
    contour: '190,278 217,218 234,163 238,90 251,77 456,58 479,75 477,84 370,108 389,148 590,132 644,145 673,172 691,242 683,314 665,360 593,383 302,411 256,396 232,362 202,348 191,324' },
]
let html = await readFile('public/components/cutout.html', 'utf8')
for (const [index, photo] of photographs.entries()) {
  const path = resolve(inputs, `${photo.name}.${photo.ext}`)
  let source
  try { source = await readFile(path) }
  catch {
    const response = await fetch(photo.url)
    if (!response.ok) throw new Error(`Could not download ${photo.name}: ${response.status}`)
    source = Buffer.from(await response.arrayBuffer())
    await writeFile(path, source)
  }
  let image = sharp(source).rotate().ensureAlpha()
  if (photo.contour) {
    const [w,h] = photo.size
    image = sharp(await image.resize(w,h).png().toBuffer()).composite([{input:Buffer.from(`<svg width="${w}" height="${h}"><polygon fill="white" points="${photo.contour}"/></svg>`),blend:'dest-in'}])
  }
  const cutout = await image.png().toBuffer()
  const padded = await sharp(cutout).trim().resize({width:photo.width}).modulate({saturation:.82,brightness:1.04}).extend({top:7,bottom:7,left:7,right:7,background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const {data, info:{width,height}} = padded
  const result = Buffer.alloc(data.length)
  let seed = 8273+index
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const pixel = (y*width+x)*4
    let rim = 0
    for (let dy=-5;dy<=5;dy++) for (let dx=-5;dx<=5;dx++) {
      if (dx*dx+dy*dy>25 || x+dx<0 || x+dx>=width || y+dy<0 || y+dy>=height) continue
      rim = Math.max(rim,data[((y+dy)*width+x+dx)*4+3])
    }
    seed = (Math.imul(seed,1664525)+1013904223)>>>0
    const noise = ((seed>>>24)/255-.5)*17, alpha = data[pixel+3]/255
    for (let c=0;c<3;c++) result[pixel+c] = Math.max(0,Math.min(255,Math.round((data[pixel+c]*alpha+[243,237,218][c]*(1-alpha))+noise)))
    result[pixel+3] = Math.max(rim,data[pixel+3])
  }
  const asset = await sharp(result,{raw:{width,height,channels:4}}).webp({quality:84,alphaQuality:95}).toBuffer()
  await writeFile(resolve(output,`${photo.name}.webp`),asset)
  // Embed the small optimized assets so copied HTML still works on its own.
  const pattern = new RegExp(`(<img\\s+data-sticker="${photo.name}"\\s+src=")[^"]*(")`)
  if (!pattern.test(html)) throw new Error(`Missing ${photo.name} image placeholder`)
  html = html.replace(pattern,(_,before,after)=>`${before}data:image/webp;base64,${asset.toString('base64')}${after}`)
  console.log(`${photo.name}.webp: ${asset.length} bytes`)
}
await writeFile('public/components/cutout.html',html)
