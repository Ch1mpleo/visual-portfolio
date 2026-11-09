// Run after npm run build. Set PLAYWRIGHT_PACKAGE if Playwright lives outside this repo.
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { splitComponentSource } from '../src/utils/component-source.mjs'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const out = resolve('.astro/components-qa')
await mkdir(out, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' }
const downloadedFiles = new Map()
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://local').pathname).replace(/^\/visual-portfolio/, '')
    if (downloadedFiles.has(path)) {
      response.setHeader('Content-Type', mime[extname(path)])
      response.end(downloadedFiles.get(path)); return
    }
    const file = resolve('dist', '.' + (path.endsWith('/') ? `${path}index.html` : path))
    if (!file.startsWith(resolve('dist') + sep)) throw new Error('outside dist')
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    response.end(await readFile(file))
  } catch { response.statusCode = 404; response.end('Not found') }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const url = `http://127.0.0.1:${server.address().port}/visual-portfolio/`
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage(), errors = []
  const demoRequests = [], highlightRequests = []
  page.on('request', request => { const path = new URL(request.url()).pathname; if (/\/components\/(cutout|emulsion|reverie)\.html$/.test(path)) demoRequests.push(path); if (path.includes('/component-source/')) highlightRequests.push(path) })
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => { errors.push(error.message); console.log('Runtime:',error.message) })
  console.log('Opening production build…')
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('.site-intro').waitFor({ state: 'detached' })
  await page.waitForTimeout(1400) // The existing header reveal finishes after the intro overlay.
  console.log('Intro complete; checking responsive gallery…')
  assert.equal(await page.locator('#components').evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('#work')) & Node.DOCUMENT_POSITION_FOLLOWING)), true, 'gallery is before GOAT')
  assert.equal(await page.locator('#components iframe').count(),0,'gallery contains static images only')
  assert.equal(await page.locator('#component-playground iframe').getAttribute('src'),null,'no demo is loaded before opening')
  assert.equal(demoRequests.length,0,'no component document requested outside the playground')
  assert.equal(highlightRequests.length,0,'highlighted source is not requested before the Code tab')
  assert.ok(await page.locator('#components img').evaluateAll(images=>images.every(img=>/\.webp\?v=[a-f0-9]{10}$/.test(img.src))),'overview images are versioned from their actual content')
  const dialog = page.locator('#component-playground')
  for (const width of [320, 390, 576, 768, 987, 1080, 1440]) {
    console.log(`Viewport ${width}`)
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
    await page.evaluate(() => window.lenis.scrollTo(0, { immediate: true }))
    await page.waitForTimeout(400) // Allow the site's debounced ScrollTrigger resize to settle.
    const nav = page.locator('.site-head a[href="#components"]')
    await nav.click()
    await page.waitForFunction(() => Math.abs(document.querySelector('#components').getBoundingClientRect().top) < 80).catch(async error => {
      console.log(await page.evaluate(() => ({y:scrollY,top:document.querySelector('#components').getBoundingClientRect().top,stopped:window.lenis.isStopped,scroll:window.lenis.animatedScroll,target:window.lenis.targetScroll})))
      await page.screenshot({path:resolve(out,`navigation-${width}.png`)})
      throw error
    })
    const controls = await page.locator('.site-head a:visible, .site-head button:visible').evaluateAll(items => items.map(el => ({ text: el.textContent.trim(), x: el.getBoundingClientRect().x, right: el.getBoundingClientRect().right })))
    assert.ok(controls.every(rect => rect.x >= 0 && rect.right <= width), `header fits ${width}: ${JSON.stringify(controls)}`)
    assert.equal(await page.locator('#components').evaluate(el => el.scrollWidth <= el.clientWidth), true, `gallery fits ${width}`)
    if (width>767) assert.equal(await page.locator('#components .component-card__image').evaluateAll(images=>Math.abs(images[0].getBoundingClientRect().top-images[1].getBoundingClientRect().top)<1),true,'gallery images align at their top edge')
    await page.locator('#components').screenshot({ path: resolve(out, `gallery-${width}.png`) })
    for (const id of ['cutout', 'emulsion', 'reverie']) {
      const trigger = page.locator(`[data-component-open="${id}"][data-component-view="preview"]`)
      await trigger.click()
      assert.equal(await dialog.evaluate(el => el.open), true)
      assert.equal(await page.evaluate(() => window.lenis.isStopped), true)
      const bounds = await dialog.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `dialog fits ${width}`)
      assert.equal(await dialog.locator('.playground__toolbar').evaluate(el => el.scrollWidth <= el.clientWidth), true, `toolbar fits ${width}`)
      const frame = page.frameLocator('#component-playground iframe')
      await frame.locator(id === 'cutout' ? '.board' : '.scene').waitFor()
      await frame.locator(id === 'cutout' ? '.mood' : '.topbar button').first().focus()
      if (id === 'cutout') {
        await dialog.getByRole('tab', {name:'Code', exact:true}).click()
        await dialog.locator('[data-code-copy="html"]').waitFor({state:'visible'})
        await page.waitForFunction(()=>document.querySelectorAll('[data-code-pane] pre').length===3)
        for(const language of ['html','css','js']) {
          await dialog.locator(`[data-source-file="${language}"]`).click()
          assert.equal(await dialog.locator('[data-code-pane]:visible').count(),1,'only the selected file is shown')
          const pane=await dialog.locator(`[data-code-pane="${language}"]`).boundingBox()
          const sidebar=await dialog.locator('.code-sidebar').boundingBox()
          assert.ok(sidebar.x>=0&&pane.x>=sidebar.x+sidebar.width-1&&pane.x+pane.width<=width&&pane.height>0,`file sidebar stays left of code at ${width}`)
          const bar=dialog.locator(`[data-code-pane="${language}"] .code-editor__bar`)
          assert.ok(await bar.evaluate(el=>el.scrollWidth<=el.clientWidth),'pane header actions stay visible')
        }
        await dialog.locator('[data-source-file="html"]').click()
        await page.keyboard.press('ArrowDown')
        assert.equal(await dialog.locator('[data-source-file="css"]').getAttribute('aria-selected'),'true','arrow keys switch source files')
        await page.keyboard.press('End')
        assert.equal(await dialog.locator('[data-source-file="js"]').getAttribute('aria-selected'),'true')
        await page.keyboard.press('Home')
        await page.screenshot({path:resolve(out,`code-panes-${width}.png`)})
        await dialog.getByRole('tab', {name:'Preview', exact:true}).click()
        await frame.locator('.mood').first().focus()
      }
      await page.keyboard.press('Escape')
      await page.waitForFunction(() => !document.querySelector('#component-playground').open)
      assert.equal(await trigger.evaluate(el => document.activeElement === el), true, 'iframe Escape restores trigger focus')
      assert.equal(await page.evaluate(() => window.lenis.isStopped), false)
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const id of ['cutout', 'emulsion']) {
    await page.locator(`[data-component-open="${id}"]`).click()
    await dialog.getByRole('tab',{name:'Code',exact:true}).click()
    const source = await readFile(`public/components/${id}.html`, 'utf8')
    const files = splitComponentSource(source,id)
    await page.waitForFunction(()=>document.querySelectorAll('[data-code-pane] pre').length===3)
    const colors = await dialog.locator('.code-editor code span[style]').evaluateAll(spans => [...new Set(spans.map(span => getComputedStyle(span).color))])
    assert.ok(colors.length >= 5,'syntax highlighting includes distinct token colors')
    assert.ok(await dialog.locator('.code-editor .line').count()>100,'code includes highlighted lines')
    await page.screenshot({path:resolve(out,`${id}-code.png`)})
    for(const language of ['html','css','js']) {
      await dialog.locator(`[data-source-file="${language}"]`).click()
      const pane=dialog.locator(`[data-code-pane="${language}"]`)
      assert.equal((await pane.locator('code').textContent()).replace(/\r\n/g,'\n').trimEnd(),files[language].replace(/\r\n/g,'\n').trimEnd(),'each highlighted pane shows its file')
      const copy=pane.locator('[data-code-copy]')
      await copy.click()
      await page.waitForFunction(ext=>document.querySelector(`[data-code-copy="${ext}"]`).dataset.copied==='true',language)
      assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),files[language].replace(/\r\n/g,'\n'),'copy contains only the selected file')
      const result=page.waitForEvent('download')
      await pane.locator('[data-code-download]').click()
      const file=await result
      assert.equal(file.suggestedFilename(),`${id}.${language}`)
      const bytes=await readFile(await file.path())
      assert.equal(bytes.toString(),files[language],'download preserves exact file contents')
      downloadedFiles.set(`/components-split/${id}.${language}`,bytes)
    }
    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('link', { name: 'Download complete demo' }).click()
    const download = await downloadPromise
    assert.equal(download.suggestedFilename(), `${id}.html`)
    assert.equal(await download.failure(), null)
    assert.equal(await readFile(await download.path(),'utf8'),source,'complete demo remains self-contained')
    const exported=await context.newPage()
    exported.on('pageerror',error=>errors.push(error.message))
    await exported.goto(new URL(`components-split/${id}.html`,url).href,{waitUntil:'load'})
    assert.ok(await exported.locator(id==='cutout'?'.board':'.scene').evaluate(el=>getComputedStyle(el).position==='relative'),'downloaded CSS loads from its sibling file')
    if(id==='cutout') await exported.locator('[data-mood="soft"]').click()
    else await exported.getByRole('button',{name:'Last frame',exact:true}).click()
    if(id==='cutout') await exported.waitForFunction(()=>document.querySelector('.board').dataset.phase==='open')
    else await exported.locator('.contact').getByRole('button').waitFor({state:'visible'})
    await exported.close()
    await dialog.getByRole('tab', { name: 'Preview', exact: true }).click()
    const frame = page.frameLocator('#component-playground iframe')
    if (id === 'cutout') {
      for (const mood of ['bold','soft','raw','dreamy','cinematic']) {
        await frame.locator(`[data-mood="${mood}"]`).click()
        await page.waitForFunction(() => document.querySelector('#component-playground iframe').contentDocument.querySelector('.board')?.dataset.phase==='open')
        assert.equal(await frame.locator('.sheet').evaluate(el => el.getAnimations({subtree:true}).length), 0, 'reduced motion has no animations')
        await frame.locator('.strip button').nth(2).focus()
        await page.keyboard.press('ArrowRight')
        assert.equal(await frame.locator('.counter').textContent(), '04 / 10')
        await frame.locator('.hero-image').evaluate(img => img.decode())
        await frame.locator('.back').click()
        await page.waitForFunction(() => document.querySelector('#component-playground iframe').contentDocument.querySelector('.board')?.dataset.phase==='idle')
        assert.equal(await frame.locator(`[data-mood="${mood}"]`).evaluate(el => document.activeElement === el), true)
      }
    } else {
      await frame.getByRole('button', { name: 'Last frame', exact: true }).click()
      await frame.locator('.contact').getByRole('button').waitFor({state:'visible'})
      await frame.locator('.contact').getByRole('button').click()
      await frame.locator('.scene').focus()
      await page.keyboard.press('End')
      assert.equal(await frame.locator('.contact').evaluate(el => !el.inert), true)
      assert.ok(await frame.locator('.contact').evaluate(el => {
        const lettering = el.ownerDocument.querySelector('.headline--photographer').getBoundingClientRect()
        const closing = el.getBoundingClientRect()
        return closing.left > lettering.right + el.ownerDocument.defaultView.innerWidth * 0.15
      }), 'last frame stays beyond the oversized lettering')
      await page.keyboard.press('Home')
      assert.equal(await frame.locator('.controls, .credits').count(), 0)
      assert.equal(await frame.locator('.headline').count(), 2)
      assert.equal(await frame.locator('.headline--worlds').textContent(), 'worlds')
      assert.ok(await frame.locator('.moments-copy h2').textContent())
      assert.equal(await frame.locator('.dimension-plane').count(), 1)
      assert.equal(await frame.locator('.print small').count(), 0)
      const collection=await readFile('public/components/reverie.html','utf8')
      const libraryPhotos=new Set([...collection.matchAll(/src: '(https:\/\/images\.steamusercontent\.com[^']+)'/g)].map(match=>new URL(match[1]).pathname))
      const expectedPhotos=new Set([...source.matchAll(/src: '(https:\/\/images\.steamusercontent\.com[^']+)'/g)].map(match=>new URL(match[1]).pathname))
      assert.deepEqual(new Set(await frame.locator('.print img').evaluateAll(images=>images.map(img=>new URL(img.src).pathname))),expectedPhotos,'Emulsion renders its curated photography collection')
      assert.ok(expectedPhotos.size<libraryPhotos.size&&[...expectedPhotos].every(path=>libraryPhotos.has(path)),'the denser Reverie archive remains separate from Emulsion’s selection')
      assert.equal(await frame.locator('.headline--photographer').textContent(), 'photographer')
      assert.equal(await frame.locator('.print').count(), expectedPhotos.size)
      assert.equal(await frame.locator('.print--portrait').count(), 4)
      await frame.locator('.print img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())))
      assert.ok(await frame.locator('.print__image').evaluateAll(images => images.every(image => {
        const portrait = image.closest('.print').classList.contains('print--portrait')
        const img=image.querySelector('img'),ratio=portrait?img.naturalHeight/img.naturalWidth:img.naturalWidth/img.naturalHeight
        return Math.abs(image.clientWidth / image.clientHeight - ratio) < 0.03
      })), 'portrait and landscape frames preserve their original compositions')
      const motion = await frame.locator('.scene').evaluate(scene => {
        const button = scene.querySelector('.topbar > [data-go="0"]'), samples = []
        for (let i = 0; i <= 100; i++) {
          button.dataset.go = String(i / 100); button.click()
          samples.push({
            phase: scene.dataset.phase,
            photo: new DOMMatrix(getComputedStyle(scene.querySelector('.print')).transform).e,
            photographer: scene.querySelector('.headline--photographer').getBoundingClientRect().left,
            photographerRight: scene.querySelector('.headline--photographer').getBoundingClientRect().right,
            viewport: scene.clientWidth,
            lastPhoto: new DOMMatrix(getComputedStyle(scene.querySelectorAll('.print')[12]).transform).e,
            worlds: scene.querySelector('.headline--worlds').getBoundingClientRect().left,
          })
        }
        button.dataset.go = '0'; button.click()
        return samples
      })
      const opening = motion.filter(sample => sample.phase === 'photographer')
      assert.ok(opening.some(sample => sample.photographer > opening[0].photographer + 50), 'photographer retains the opening counter-pan')
      assert.ok(opening.filter(sample => sample.photographer >= 0 && sample.photographerRight <= sample.viewport).length >= 3, 'the complete photographer word has a readable pause inside the viewport')
      assert.ok(opening.slice(1).every((sample, i) => sample.photo < opening[i].photo), 'opening photos travel continuously')
      const assembling = motion.filter(sample => sample.phase === 'assembling')
      assert.ok(assembling.at(-1).lastPhoto < assembling[0].lastPhoto - 50, 'gallery photos arrive from right to left')
      const settled = motion.filter(sample => sample.phase === 'worlds')
      assert.ok(settled.length > 2 && settled.every(sample => Math.abs(sample.lastPhoto - settled[0].lastPhoto) < 0.01 && Math.abs(sample.worlds - settled[0].worlds) < 0.01), 'photos stick around worlds for the settled wall')
      const closing = motion.filter(sample => sample.phase === 'closing')
      assert.ok(closing.at(-1).lastPhoto < settled[0].lastPhoto - 500, 'the complete formation releases together')
      assert.ok(motion.filter(sample=>sample.phase==='moments').length>2,'Moments has a settled pause before the ending')
      const wheelTravel = await frame.locator('.scene').evaluate(scene => {
        const home = scene.querySelector('.topbar [data-go="0"]')
        return [[480], [120, 120, 120, 120]].map(deltas => {
          home.click()
          deltas.forEach(deltaY => scene.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })))
          const x = new DOMMatrix(getComputedStyle(scene.querySelector('.intro')).transform).e
          home.click()
          return x
        })
      })
      assert.ok(Math.abs(wheelTravel[0] - wheelTravel[1]) < 0.1 && Math.abs(wheelTravel[0]) > 400, 'wheel travel is independent of event batching')
      assert.ok(await frame.locator('.print img').evaluateAll(images => images.every(img => img.src.startsWith('https://images.steamusercontent.com/'))))
      await frame.locator('.print img').first().evaluate(img => img.decode())
    }
    await page.screenshot({path:resolve(out,`${id}-expanded.png`)})
    await dialog.getByRole('button', {name:'Close component playground'}).click()
  }
  await page.emulateMedia({reducedMotion:'no-preference'})
  await page.locator('[data-component-open="cutout"][data-component-view="preview"]').click()
  const cutout = page.frameLocator('#component-playground iframe')
  const introStart = Date.now()
  await cutout.locator('.board').evaluate(board=>{
    const win=board.ownerDocument.defaultView
    win.__introTrace=[]
    const until=performance.now()+6000
    const sample=()=>{
      const piece=board.querySelector('.letter-piece')
      if(piece) {const m=new DOMMatrix(getComputedStyle(piece).transform);win.__introTrace.push({x:m.e,y:m.f})}
      if(board.dataset.phase!=='developed' && performance.now()<until) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await cutout.locator('[data-mood="bold"]').click()
  const waitPhase = phase => page.waitForFunction(value => document.querySelector('#component-playground iframe').contentDocument.querySelector('.board')?.dataset.phase===value,phase)
  await waitPhase('developed')
  const recoil=await cutout.locator('.letter-piece').first().evaluate(el=>{
    const trace=el.ownerDocument.defaultView.__introTrace, matrix=new DOMMatrix(getComputedStyle(el).transform), first=trace[0]
    const dx=matrix.e-first.x,dy=matrix.f-first.y,distance=Math.hypot(dx,dy)
    return Math.max(...trace.map(p=>((p.x-matrix.e)*dx+(p.y-matrix.f)*dy)/distance))
  })
  assert.ok(recoil>2 && recoil<20,'intro letters visibly recoil past the destination and settle with a small bounce')
  assert.equal(await cutout.locator('.letter-piece').count(),4,'all cut letters reform the word')
  assert.ok(await cutout.locator('.letter-glyph').evaluateAll(glyphs => glyphs.every(g => getComputedStyle(g).backgroundImage.includes('images.unsplash.com') && getComputedStyle(g).backgroundClip==='text')),'each letter contains a photograph')
  await page.screenshot({path:resolve(out,'cutout-photo-letters.png')})
  await waitPhase('unpacking')
  assert.equal(await cutout.locator('.photo-face').count(),4,'letter photographs are carried toward the contact sheet')
  await waitPhase('open')
  const introDuration = Date.now()-introStart
  assert.equal(await cutout.locator('.sheet footer').count(),0,'contact sheet omits the hover instruction and Unsplash link')
  assert.equal(await cutout.locator('.strip .keeper-mark').count(),2,'contact sheet marks the two keeper frames')
  assert.equal(await cutout.locator('.strip button').nth(2).locator('.keeper-mark').count(),1)
  assert.equal(await cutout.locator('.strip button').nth(4).locator('.keeper-mark').count(),1)
  assert.ok(await cutout.locator('.strip img').evaluateAll(images=>images.every(img=>{const r=img.getBoundingClientRect(),style=getComputedStyle(img);return Math.abs(r.width/r.height-1.5)<.03 && parseFloat(style.borderTopWidth)===2 && style.boxShadow!=='none'})),'contact sheet uses landscape images, dark frames and print shadows')
  assert.equal(await cutout.locator('.letter-piece,.photo-transfer').count(),0,'intro handoffs clean up their moving elements')
  assert.equal(await cutout.locator('.card-mask [data-hole]').count(),4,'the original paper retains letter-shaped holes')
  await page.screenshot({path:resolve(out,'cutout-developed.png')})
  const outroStart = Date.now()
  await cutout.locator('.back').click()
  await waitPhase('reforming')
  assert.equal(await cutout.locator('.letter-piece').count(),4,'outro reforms the same image-filled letters')
  await page.screenshot({path:resolve(out,'cutout-reverse.png')})
  await waitPhase('returning')
  await waitPhase('idle')
  assert.ok(Date.now()-outroStart < introDuration,'the reverse sequence is quicker than the intro')
  assert.equal(await cutout.locator('.letter-piece,.photo-transfer,.card-mask').count(),0,'outro cleans up all temporary elements')
  assert.equal(await cutout.locator('[data-mood="bold"] .paper').textContent(),'BOLD','letters return to their original card')
  await cutout.locator('[data-mood="cinematic"]').click()
  await waitPhase('cutting')
  await page.keyboard.press('Escape')
  await waitPhase('idle')
  assert.equal(await cutout.locator('.letter-piece,.photo-transfer,.card-mask').count(),0,'Escape safely cancels an in-progress sequence')
  await page.setViewportSize({width:390,height:844})
  await page.waitForTimeout(400)
  await cutout.locator('[data-mood="cinematic"]').click()
  await waitPhase('developed')
  assert.equal(await cutout.locator('.letter-piece').count(),9,'the longest mood keeps all nine photograph letters')
  const boardBounds = await cutout.locator('.board').boundingBox()
  const letterBounds = await cutout.locator('.letter-piece').evaluateAll(elements => elements.map(el=>({x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right})))
  const boardLocal = await cutout.locator('.board').evaluate(el=>({x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right}))
  assert.ok(letterBounds.every(b=>b.x>=boardLocal.x-1 && b.right<=boardLocal.right+1),'the entire nine-letter word fits the phone canvas')
  assert.ok(boardBounds.height>300)
  await page.screenshot({path:resolve(out,'cutout-phone-letters.png')})
  await waitPhase('open')
  assert.equal(await cutout.locator('.sheet').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'phone contact sheet has no horizontal overflow')
  assert.equal(await cutout.locator('.counter').textContent(),'01 / 10','stationary cursor does not switch images when the sheet arrives')
  await cutout.locator('.strip button').nth(7).hover()
  assert.equal(await cutout.locator('.counter').textContent(),'08 / 10','moving onto a thumbnail changes the image')
  await cutout.locator('.hero-image').evaluate(img=>img.decode())
  await page.screenshot({path:resolve(out,'cutout-phone-sheet.png')})
  await cutout.locator('.back').click(); await waitPhase('idle')
  await cutout.locator('[data-mood="raw"]').click()
  await waitPhase('cutting')
  await page.setViewportSize({width:1440,height:1000})
  await waitPhase('idle')
  assert.equal(await cutout.locator('.letter-piece,.photo-transfer,.card-mask').count(),0,'resize safely cancels a moving sequence')
  await dialog.getByRole('button',{name:'Close component playground'}).click()
  await page.locator('[data-component-open="emulsion"][data-component-view="preview"]').click()
  const emulsion = page.frameLocator('#component-playground iframe')
  const print = emulsion.locator('.print').first()
  const start = await print.evaluate(el => getComputedStyle(el).transform)
  await print.focus(); await page.keyboard.press('Enter')
  await page.waitForTimeout(120)
  assert.notEqual(await print.evaluate(el => getComputedStyle(el).transform),start,'pendulum responds to keyboard')
  const b = await print.boundingBox()
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2)
  await page.mouse.down(); await page.mouse.move(b.x+b.width/2,b.y+b.height/2+50,{steps:10}); await page.mouse.up()
  assert.equal(await print.evaluate(el => el.classList.contains('dragging')),false,'pointer release clears drag state')
  await page.mouse.wheel(0,300)
  await page.waitForFunction(() => {
    const intro = document.querySelector('#component-playground iframe').contentDocument.querySelector('.intro')
    return new DOMMatrix(getComputedStyle(intro).transform).e < -10
  })
  await dialog.getByRole('button',{name:'Close component playground'}).click()
  await page.evaluate(() => document.documentElement.classList.add('theme-dark'))
  await page.emulateMedia({colorScheme:'dark'})
  await page.locator('#components').scrollIntoViewIfNeeded()
  await page.locator('#components').screenshot({path:resolve(out,'gallery-dark.png')})
  for (const id of ['cutout','emulsion']) {
    await page.locator(`[data-component-open="${id}"]`).click()
    const demo = page.frameLocator('#component-playground iframe')
    await demo.locator(id==='cutout' ? '.board' : '.scene').waitFor()
    assert.equal(await demo.locator('.theme').count(),0,'there is no demo theme control')
    assert.equal(await demo.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),id==='cutout' ? 'rgb(231, 223, 204)' : 'rgb(238, 231, 218)','demo palette remains fixed under a dark host and device preference')
    await dialog.getByRole('button',{name:'Close component playground'}).click()
  }
  // 1440×700 at 200% browser zoom has a 720×350 CSS viewport at 2× scale.
  const zoomContext = await browser.newContext({viewport:{width:720,height:350},deviceScaleFactor:2,reducedMotion:'reduce'})
  const zoomPage = await zoomContext.newPage()
  zoomPage.on('pageerror', error => errors.push(error.message))
  await zoomPage.goto(url,{waitUntil:'domcontentloaded'})
  await zoomPage.locator('.site-intro').waitFor({state:'detached'})
  await zoomPage.locator('[data-component-open="emulsion"][data-component-view="preview"]').click()
  const zoomDialog = zoomPage.locator('#component-playground'), zoomBounds = await zoomDialog.boundingBox()
  assert.ok(zoomBounds.x>=0 && zoomBounds.x+zoomBounds.width<=720 && zoomBounds.y>=0 && zoomBounds.y+zoomBounds.height<=350,'200% equivalent viewport fits the dialog')
  assert.equal(await zoomDialog.evaluate(el => el.scrollWidth<=el.clientWidth),true,'200% equivalent viewport has no horizontal dialog overflow')
  await zoomPage.screenshot({path:resolve(out,'playground-zoom-200.png')})
  await zoomPage.keyboard.press('Escape')
  await zoomContext.close()
  assert.deepEqual(errors,[],'no runtime errors')
  console.log('Component QA passed: deferred demos/source, static cards, 7 widths, IDE file navigation, syntax colors, per-file copy/download and runnable split exports, all moods, photo-letter intro and quicker reverse, interruption cleanup, reduced motion, pendulum/drag/wheel, fixed palettes, iframe Escape, focus/scroll restoration and 200% equivalent viewport. Screenshots: .astro/components-qa/')
} finally {
  await browser.close()
  server.closeAllConnections()
  await new Promise(done => server.close(done))
}
