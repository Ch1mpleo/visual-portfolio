// Run after a build, or set EMULSION_QA_URL to a running site's base URL.
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { splitComponentSource } from '../src/utils/component-source.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const out = resolve('.astro/emulsion-qa')
await mkdir(out,{recursive:true})
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'}
const server=createServer(async(request,response)=>{
  try {
    const path=decodeURIComponent(new URL(request.url,'http://local').pathname).replace(/^\/visual-portfolio/,'')
    const file=resolve('dist','.'+(path.endsWith('/')?`${path}index.html`:path))
    if(!file.startsWith(resolve('dist')+sep))throw new Error('outside dist')
    response.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream')
    response.end(await readFile(file))
  }catch{response.statusCode=404;response.end('Not found')}
})
await new Promise(done=>server.listen(0,'127.0.0.1',done))
const base=process.env.EMULSION_QA_URL||`http://127.0.0.1:${server.address().port}/visual-portfolio/`
const browser=await chromium.launch({channel:'msedge',executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true})
const errors=[]
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
  page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.emulsionFrames=0;window.requestAnimationFrame=fn=>raf(time=>{window.emulsionFrames++;fn(time)})})
  await page.goto(new URL('components/emulsion.html',base).href)
  const scene=page.locator('.scene')
  assert.equal(await page.getByRole('button',{name:'Moments',exact:true}).count(),1,'Moments is a reachable chapter between Worlds and Last frame')
  assert.equal(await page.locator('.dimension-plane').count(),1,'Moments enters directly into the Dimension-style card sequence')
  const reverie=await readFile('public/components/reverie.html','utf8')
  const libraryPaths=new Set([...reverie.matchAll(/src: '(https:\/\/images\.steamusercontent\.com[^']+)'/g)].map(match=>new URL(match[1]).pathname))
  const source=await readFile('public/components/emulsion.html','utf8')
  const expectedPaths=new Set([...source.matchAll(/src: '(https:\/\/images\.steamusercontent\.com[^']+)'/g)].map(match=>new URL(match[1]).pathname))
  const actualPaths=await page.locator('.print img').evaluateAll(images=>images.map(img=>new URL(img.src).pathname))
  assert.deepEqual(new Set(actualPaths),expectedPaths,'the curated photography collection is rendered completely')
  assert.ok(expectedPaths.size<libraryPaths.size&&[...expectedPaths].every(path=>libraryPaths.has(path)),'Emulsion uses a smaller selection from the complete Reverie collection')
  assert.equal(actualPaths.length,expectedPaths.size,'each photograph appears once in the story')
  assert.ok(await page.locator('.print img').evaluateAll(images=>images.every(img=>img.naturalWidth>0&&img.naturalWidth<=960)),'the extended wall loads lightweight images')
  const boundaryReversal=await scene.evaluate(el=>{
    el.querySelector('[data-moments-link]').click()
    const wheel=deltaY=>el.dispatchEvent(new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true}))
    const x=()=>new DOMMatrix(el.querySelector('.intro').style.transform).m41
    wheel(-40);const before=x()
    wheel(40);const forward=x()
    wheel(-40);return {before,forward,back:x()}
  })
  assert.ok(Math.abs(boundaryReversal.forward-boundaryReversal.before)>30,'reverse input can move after leaving Moments')
  assert.ok(Math.abs(boundaryReversal.back-boundaryReversal.before)<.1,'a second reversal outside Moments is not mistaken for stale momentum')
  const sweep=()=>scene.evaluate(el=>{
    const home=el.querySelector('.topbar > [data-go]'),visited=new Set(),phases=new Set(),readable=[]
    for(let i=0;i<=240;i++){
      home.dataset.go=String(i/240);home.click();phases.add(el.dataset.phase)
      const word=el.querySelector('.headline--photographer').getBoundingClientRect()
      if(word.left>=0&&word.right<=innerWidth)readable.push(i)
      for(const card of el.querySelectorAll('.print')){
        const r=card.getBoundingClientRect()
        if(!card.inert&&r.x+r.width/2>0&&r.x+r.width/2<innerWidth&&r.y+r.height/2>48&&r.bottom<innerHeight*.88)visited.add(new URL(card.querySelector('img').src).pathname)
      }
    }
    home.dataset.go='0';home.click()
    return {visited:[...visited],phases:[...phases],readable:readable.length}
  })
  for(const [width,height] of [[1440,900],[390,844],[320,720],[844,390],[720,350]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(80)
    const journey=await sweep()
    assert.deepEqual(new Set(journey.visited),expectedPaths,`every print is reachable at ${width}x${height}`)
    assert.ok(journey.phases.includes('worlds')&&journey.phases.includes('moments')&&journey.phases.includes('closing'),'both walls settle before the ending')
    assert.ok(journey.readable>=3,'photographer retains its readable pause')
    for(const name of ['Worlds','Moments']){
      await page.getByRole('button',{name,exact:true}).click()
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'the wall never widens the page')
      if(name==='Worlds'&&height>700){
        const large=await page.locator('.print:not([inert])').evaluateAll(cards=>cards.filter(c=>!c.classList.contains('print--portrait')).map(c=>c.getBoundingClientRect().width))
        assert.ok(large.length&&large.every(w=>w>width*(width<600?.30:.195)),'Worlds uses larger readable landscape prints')
      }
      if(name==='Moments'){
        const title=await page.locator('[data-moment-title]').textContent()
        assert.ok(await page.locator('[data-moment-place]').textContent(),'Moments place labels stay game-specific')
        assert.ok(await page.locator('[data-moment-beat]').textContent(),'Moments beats describe the locked photograph')
        assert.ok(await page.locator('[data-moment-detail]').textContent(),'Moments keep denser supporting copy on the flanking side')
        if(width/height<=.8){
          const copy=await page.locator('.moments-copy').boundingBox(),game=await page.locator('.moment-game').boundingBox()
          assert.ok(game.y>=copy.y+copy.height+8,'phone captions flow without overlapping their game details')
        }
        const first=await page.locator('.print--dimension').first().boundingBox()
        const depth=await page.locator('.print--dimension').evaluateAll(cards=>{
          const matrix=el=>new DOMMatrix(getComputedStyle(el).transform)
          const current=cards.findIndex(card=>card.classList.contains('is-current'))
          const center=matrix(cards[current]),above=matrix(cards[current+1]||cards[current-1])
          return {current,hasNeighbor:Boolean(cards[current+1]||cards[current-1]),smaller:Math.hypot(above.a,above.b)<Math.hypot(center.a,center.b)-0.02,tilted:Math.abs(above.b)>0.05,deeper:above.m43<center.m43-40}
        })
        assert.ok(depth.current>=0&&depth.hasNeighbor,'one centered card carries the current state among visible neighbours')
        assert.ok(depth.smaller&&depth.tilted&&depth.deeper,'neighbour cards recede with scale, tilt, and depth')
        assert.equal(await page.locator('.dimension-threads .thread-glow').count(),7,'premium connector glows sit behind the card stack')
        assert.equal(await page.locator('.dimension-threads .thread-core').count(),7,'gradient cores run between the eight cards')
        assert.equal(await page.locator('.dimension-threads .thread-sheen').count(),7,'a fine sheen rides the connector thread')
        assert.ok(await page.locator('.dimension-threads .thread-core').first().evaluate(el=>{
          const style=getComputedStyle(el)
          return parseFloat(style.strokeWidth)>=3.5&&parseFloat(style.strokeDashoffset)===0
        }),'the next card is visibly connected before scrolling along its gradient')
        assert.ok(await page.locator('.print--dimension').first().evaluate(el=>!/c84e30|e8b45a|232,\s*78,\s*48/i.test(getComputedStyle(el).boxShadow)),'Moments cards keep depth shadow without colored glow halos')
        assert.match(source,/\.print--dimension:hover \.print__image img/,'Moments cards include a hover zoom on the photograph')
        assert.match(source,/transform: scale\(1\.06\)/,'Moments hover zoom scales the photograph in')
        await scene.press('ArrowDown')
        assert.notEqual(await page.locator('[data-moment-title]').textContent(),title,'arrow keys select the next photo and its caption')
        assert.ok((await page.locator('.print--dimension').first().boundingBox()).y<first.y-40,'cards travel vertically through the main view')
        await scene.press('ArrowUp')
        assert.equal(await page.locator('[data-moment-title]').textContent(),title,'the vertical sequence reverses to the first card')
        if(width===1440&&height===900){
          const unlocked=await scene.evaluate(el=>{
            el.querySelector('[data-moments-link]').click()
            const before=el.querySelector('[data-moment-title]').textContent
            for(let i=0;i<3;i++)el.dispatchEvent(new WheelEvent('wheel',{deltaY:40,bubbles:true,cancelable:true}))
            return {before,phase:el.dataset.phase,title:el.querySelector('[data-moment-title]').textContent}
          })
          assert.equal(unlocked.phase,'moments','wheel selection stays inside Moments')
          await page.waitForTimeout(320)
          const locked=await scene.evaluate(el=>({
            title:el.querySelector('[data-moment-title]').textContent,
            current:el.querySelector('.print--dimension.is-current')?.getAttribute('aria-label')||'',
          }))
          assert.equal(locked.title,await page.locator('.dimension-index button').nth(1).textContent(),'one wheel gesture advances exactly one card despite momentum events')
          assert.ok(locked.current.includes('Select this moment.'), 'the locked card remains the current Moment')
          await scene.evaluate(el=>{
            for(let i=0;i<4;i++)el.dispatchEvent(new WheelEvent('wheel',{deltaY:2200,bubbles:true,cancelable:true}))
          })
          assert.equal(await page.locator('[data-moment-title]').textContent(),await page.locator('.dimension-index button').nth(2).textContent(),'a later large wheel gesture still advances only one card')
          await page.getByRole('button',{name:'Moments',exact:true}).click()
        }
      }
      await page.screenshot({path:resolve(out,`${name.toLowerCase()}-${width}.png`)})
    }
    await page.getByRole('button',{name:'Last frame',exact:true}).click()
    assert.equal(await page.locator('.contact').evaluate(el=>!el.inert),true,'the final return control remains reachable')
    await page.locator('.contact button').click()
    assert.equal(await scene.getAttribute('data-phase'),'photographer','the ending returns to the first frame')
  }
  await page.setViewportSize({width:1440,height:900})
  await page.getByRole('button',{name:'Worlds',exact:true}).click()
  const worldCards=page.locator('.scene > .print')
  const worldPose=await worldCards.evaluateAll(cards=>cards.slice(4).map(c=>c.style.transform).join('|'))
  await scene.press('ArrowRight')
  assert.equal(await scene.getAttribute('data-phase'),'worlds')
  assert.equal(await worldCards.evaluateAll(cards=>cards.slice(4).map(c=>c.style.transform).join('|')),worldPose,'all nine Worlds prints stay pinned while the chapter holds')
  await page.getByRole('button',{name:'Moments',exact:true}).click()
  await page.getByRole('button',{name:'Worlds',exact:true}).click()
  assert.equal(await worldCards.evaluateAll(cards=>cards.slice(4).map(c=>c.style.transform).join('|')),worldPose,'chapters reverse to the same Worlds formation')
  const wheelTravel=await scene.evaluate(el=>[[480],[120,120,120,120]].map(deltas=>{
    const home=el.querySelector('.topbar > [data-go="0"]');home.click()
    deltas.forEach(deltaY=>el.dispatchEvent(new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true})))
    return new DOMMatrix(getComputedStyle(el.querySelector('.intro')).transform).m41
  }))
  assert.ok(Math.abs(wheelTravel[0]-wheelTravel[1])<.1&&wheelTravel[0]<-400,'wheel travel remains independent of event batching')
  await page.getByRole('button',{name:'Moments',exact:true}).click()
  await page.emulateMedia({reducedMotion:'no-preference'})
  const cardMotion=await scene.evaluate(async el=>{
    el.focus()
    el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}))
    const gaps=[],positions=[]
    await new Promise(done=>{
      const start=performance.now()
      function frame(time){
        const cards=[...el.querySelectorAll('.print--dimension')]
        const first=new DOMMatrix(cards[0].style.transform),next=new DOMMatrix(cards[1].style.transform)
        gaps.push(next.m42-first.m42);positions.push(first.m42)
        if(time-start<1600)requestAnimationFrame(frame);else done()
      }
      requestAnimationFrame(frame)
    })
    return {spacingChange:Math.max(...gaps)-Math.min(...gaps),reversals:positions.slice(1).filter((y,i)=>y>positions[i]+.1).length}
  })
  assert.ok(cardMotion.spacingChange<.1,'changing the active card never kicks it away from the shared ribbon')
  assert.equal(cardMotion.reversals,0,'keyboard selection slows into place without rebound')
  const capture=await scene.evaluate(async el=>{
    const wheel=deltaY=>el.dispatchEvent(new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true}))
    wheel(520)
    await new Promise(done=>setTimeout(done,90))
    wheel(-90)
    await new Promise(done=>setTimeout(done,2400))
    const card=el.querySelector('.print--dimension.is-current')
    return {offset:new DOMMatrix(card.style.transform).m42,index:[...el.querySelectorAll('.print--dimension')].indexOf(card),frames:window.emulsionFrames}
  })
  assert.ok(Math.abs(capture.offset)<.1,'interrupted wheel input settles precisely onto the nearest card')
  assert.equal(capture.index,1,'a reverse gesture returns to the preceding card during an unfinished selection')
  await page.waitForTimeout(200)
  assert.equal(await page.evaluate(()=>window.emulsionFrames),capture.frames,'magnetic capture sleeps after settling')
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.getByRole('button',{name:'Worlds',exact:true}).click()
  await page.emulateMedia({reducedMotion:'no-preference'})
  const index=await page.locator('.print').evaluateAll(cards=>cards.findIndex(c=>{const r=c.getBoundingClientRect();return !c.inert&&r.left>0&&r.right<innerWidth&&r.top>60&&r.bottom<innerHeight*.8}))
  const print=page.locator('.print').nth(index)
  const before=await print.evaluate(el=>getComputedStyle(el).transform)
  await print.hover();await page.waitForTimeout(120)
  assert.notEqual(await print.evaluate(el=>getComputedStyle(el).transform),before,'the pinned Worlds prints retain their wind hover')
  await print.focus();await page.keyboard.press('Enter')
  const r=await print.boundingBox()
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2+25)
  assert.equal(await print.evaluate(el=>el.classList.contains('dragging')),true,'print dragging retains the pin interaction')
  await page.mouse.up();await page.mouse.move(0,0);await page.waitForTimeout(4000)
  const frames=await page.evaluate(()=>window.emulsionFrames)
  await page.waitForTimeout(200)
  assert.equal(await page.evaluate(()=>window.emulsionFrames),frames,'the pendulum clock sleeps after settling')
  await page.getByRole('button',{name:'Worlds',exact:true}).click()
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.waitForTimeout(80)
  assert.equal(await scene.evaluate(el=>el.getAnimations({subtree:true}).length),0,'reduced motion finishes transitions')
  await scene.press('End');assert.equal(await page.locator('.contact').evaluate(el=>!el.inert),true)
  await scene.press('Home');assert.equal(await scene.getAttribute('data-phase'),'photographer')
  const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'})
  touch.on('pageerror',error=>errors.push(error.message))
  await touch.goto(new URL('components/emulsion.html',base).href)
  await touch.getByRole('button',{name:'Worlds',exact:true}).tap()
  const beforeSwipe=await touch.locator('.print').nth(5).evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41)
  const beforeJourney=await touch.locator('.intro').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41)
  const cdp=await touch.context().newCDPSession(touch)
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:715}]})
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:300-i*28,y:715}]})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  assert.ok(await touch.locator('.intro').evaluate((el,before)=>new DOMMatrix(getComputedStyle(el).transform).m41<before-200,beforeJourney),'a real background swipe advances the journey')
  assert.ok(await touch.locator('.print').nth(5).evaluate((el,before)=>Math.abs(new DOMMatrix(getComputedStyle(el).transform).m41-before)<.1,beforeSwipe),'Worlds remains fixed during a swipe inside its readable hold')
  await touch.close()
  await page.goto(base)
  const trigger=page.locator('[data-component-open="emulsion"]'),playground=page.locator('#component-playground')
  assert.equal(await trigger.getAttribute('aria-label'),'Explore Fieldnotes')
  await trigger.click()
  assert.equal(await playground.locator('#playground-title').textContent(),'Fieldnotes')
  const frame=page.frameLocator('#component-playground iframe')
  await frame.getByRole('button',{name:'Moments',exact:true}).click()
  assert.equal(await frame.locator('.scene').getAttribute('data-phase'),'moments','the Dimension Moments sequence is reachable in the shared viewer')
  await page.keyboard.press('Escape');await playground.waitFor({state:'hidden'})
  assert.equal(await trigger.evaluate(el=>document.activeElement===el),true,'Escape returns focus to the gallery card')
  await trigger.click();await playground.getByRole('tab',{name:'Code',exact:true}).click()
  await playground.locator('[data-code-pane="html"] pre').waitFor()
  const files=splitComponentSource(source,'emulsion')
  for(const language of ['html','css','js']){
    await playground.locator(`[data-source-file="${language}"]`).click()
    assert.equal((await playground.locator(`[data-code-pane="${language}"] code`).textContent()).replace(/\r\n/g,'\n').trimEnd(),files[language].replace(/\r\n/g,'\n').trimEnd(),'highlighted source matches the revised standalone demo')
  }
  const downloadPromise=page.waitForEvent('download')
  await playground.getByRole('link',{name:'Download complete demo'}).click()
  const download=await downloadPromise
  assert.equal(download.suggestedFilename(),'fieldnotes.html')
  assert.equal(await readFile(await download.path(),'utf8'),source,'the complete download preserves the Dimension Moments sequence and fixed wall')
  await playground.getByRole('button',{name:'Close component playground'}).click()
  assert.deepEqual(errors,[],'no runtime errors')
  console.log('Emulsion QA passed: curated collection, fixed Worlds composition, continuous gradient connectors, smooth Moments selection and interrupted wheel capture, five responsive sizes, wind/drag/keyboard/touch, wheel batching, idle clock, reduced motion and source/viewer integration. Screenshots remain in ignored .astro/emulsion-qa/.')
}finally{await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done))}
