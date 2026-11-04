import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const url = process.env.COMPONENT_BOARD_URL || 'http://localhost:4321/components/cutout.html'
const out = resolve('.astro/components-qa')
await mkdir(out,{recursive:true})
const browser = await chromium.launch({channel:'msedge',headless:true})
const errors = []
try {
  const context = await browser.newContext({viewport:{width:1200,height:800}})
  await context.addInitScript(() => {
    const frame = requestAnimationFrame.bind(window)
    window.__boardFrames = 0
    window.requestAnimationFrame = callback => frame(time=>{window.__boardFrames++;callback(time)})
  })
  const page = await context.newPage()
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(url,{waitUntil:'load'})
  await page.locator('[data-sticker]').evaluateAll(images=>Promise.all(images.map(img=>img.decode())))
  assert.equal(await page.locator('[data-sticker]').count(),3)
  assert.ok(await page.locator('[data-sticker]').evaluateAll(images=>images.every(img=>img.src.startsWith('data:image/webp;base64,') && img.naturalWidth>100)),'real photo stickers remain embedded in the copied component')
  assert.ok(Number(await page.locator('.desk-sticker').first().evaluate(el=>getComputedStyle(el).opacity))<=.7,'decorative stickers are subdued')
  // Independently clip the rendered DOM quadrilaterals. This checks visible overlap,
  // rather than repeating the component's separating-axis collision implementation.
  await page.evaluate(() => {
    window.inspectCards = () => {
      const cards = [...document.querySelectorAll('.mood')].map(el=>{
        const m = new DOMMatrix(getComputedStyle(el).transform), w=el.offsetWidth, h=el.offsetHeight
        const points = [[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>({x:el.offsetLeft+w/2+m.a*(x-w/2)+m.c*(y-h/2)+m.e,y:el.offsetTop+h/2+m.b*(x-w/2)+m.d*(y-h/2)+m.f}))
        return {name:el.dataset.mood,points}
      })
      const cross = (a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)
      function clipped(subject,clip) {
        let output=subject
        for(let i=0;i<clip.length;i++) {
          const a=clip[i],b=clip[(i+1)%clip.length],input=output;output=[]
          if(!input.length) break
          let previous=input[input.length-1]
          for(const current of input) {
            const ds=cross(a,b,previous),de=cross(a,b,current)
            if((de>=0)!==(ds>=0)) {const t=ds/(ds-de);output.push({x:previous.x+t*(current.x-previous.x),y:previous.y+t*(current.y-previous.y)})}
            if(de>=0) output.push(current)
            previous=current
          }
        }
        return Math.abs(output.reduce((sum,p,i)=>{const q=output[(i+1)%output.length];return sum+p.x*q.y-q.x*p.y},0))/2
      }
      const overlaps=[]
      for(let i=0;i<cards.length;i++) for(let j=i+1;j<cards.length;j++) {const area=clipped(cards[i].points,cards[j].points);if(area>1) overlaps.push({a:cards[i].name,b:cards[j].name,area})}
      const board=document.querySelector('.board')
      const outside=cards.filter(card=>card.points.some(p=>p.x< -1||p.y< -1||p.x>board.clientWidth+1||p.y>board.clientHeight+1)).map(card=>card.name)
      return {overlaps,outside}
    }
  })
  const geometry = async () => assert.deepEqual(await page.evaluate(()=>window.inspectCards()),{overlaps:[],outside:[]},'rendered cards stay separate and inside the mat')
  await geometry()
  const soft=page.locator('[data-mood="soft"]'), raw=page.locator('[data-mood="raw"]')
  await soft.hover()
  const ants=soft.locator('.selection-outline rect')
  const first=await ants.evaluate(el=>getComputedStyle(el).strokeDashoffset)
  await page.waitForTimeout(180)
  assert.notEqual(await ants.evaluate(el=>getComputedStyle(el).strokeDashoffset),first,'dashed hover border keeps running')
  const softStart=await soft.boundingBox(), rawBox=await raw.boundingBox()
  await page.mouse.move(softStart.x+softStart.width/2,softStart.y+softStart.height/2)
  await page.mouse.down()
  for(let i=1;i<=12;i++) {
    await page.mouse.move(softStart.x+softStart.width/2+(rawBox.x+rawBox.width/2-softStart.x-softStart.width/2)*i/12,softStart.y+softStart.height/2)
    await page.waitForTimeout(20); await geometry()
  }
  await page.mouse.move(2000,-300)
  await page.waitForTimeout(300); await geometry()
  await page.mouse.up(); await page.waitForTimeout(400); await geometry()
  assert.equal(await page.locator('.board').getAttribute('data-phase'),'idle','dropping never opens the component')
  assert.equal(await page.locator('.board').evaluate(el=>el.classList.contains('is-arranging')),false,'collision release settles cleanly')
  const offset=await soft.evaluate(el=>[el.style.getPropertyValue('--drag-x'),el.style.getPropertyValue('--drag-y')])
  assert.notDeepEqual(offset,['0px','0px'],'card actually moved')
  await page.screenshot({path:resolve(out,'cutout-board-dragged.png')})
  await soft.click()
  await page.waitForFunction(()=>document.querySelector('.board').dataset.phase==='open')
  await page.locator('.back').click()
  await page.waitForFunction(()=>document.querySelector('.board').dataset.phase==='idle')
  assert.deepEqual(await soft.evaluate(el=>[el.style.getPropertyValue('--drag-x'),el.style.getPropertyValue('--drag-y')]),offset,'the cutout sequence returns to the dragged position')
  await geometry()
  // Keyboard movement uses the same board constraints.
  await soft.focus(); await page.keyboard.press('Shift+ArrowLeft'); await geometry()
  // Escape cancels a pointer drag without closing the component or leaving capture active.
  const beforeCancel=await raw.evaluate(el=>[el.style.getPropertyValue('--drag-x'),el.style.getPropertyValue('--drag-y')])
  const r=await raw.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+60,r.y-100,{steps:10});await page.waitForTimeout(120)
  await page.keyboard.press('Escape');await page.mouse.up()
  assert.deepEqual(await raw.evaluate(el=>[el.style.getPropertyValue('--drag-x'),el.style.getPropertyValue('--drag-y')]),beforeCancel)
  await geometry()
  for(const [width,height] of [[390,844],[844,390],[768,550],[1200,400],[1440,1000]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(100);await geometry()
  }
  await page.emulateMedia({reducedMotion:'reduce'})
  await raw.hover()
  assert.equal(await raw.locator('.selection-outline rect').evaluate(el=>getComputedStyle(el).animationName),'none','reduced motion uses a static border')
  await page.mouse.move(0,0);await page.waitForTimeout(150)
  const frames=await page.evaluate(()=>window.__boardFrames)
  await page.waitForTimeout(200)
  assert.equal(await page.evaluate(()=>window.__boardFrames),frames,'the arrangement clock sleeps when idle')
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})
  const touch=await mobile.newPage();touch.on('pageerror',error=>errors.push(error.message));await touch.goto(url,{waitUntil:'load'})
  const card=touch.locator('[data-mood="soft"]'), box=await card.boundingBox(), cdp=await mobile.newCDPSession(touch)
  const x=box.x+box.width/2,y=box.y+box.height/2
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
  for(let i=1;i<=10;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+70*i/10,y:y-150*i/10}]})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await touch.waitForTimeout(400)
  assert.equal(await touch.locator('.board').getAttribute('data-phase'),'idle','touch drag does not activate the card')
  assert.notEqual(await card.evaluate(el=>el.style.getPropertyValue('--drag-y')),'0px','touch drag moves the card')
  await touch.screenshot({path:resolve(out,'cutout-board-touch.png')})
  await card.tap();await touch.waitForFunction(()=>document.querySelector('.board').dataset.phase==='open')
  assert.deepEqual(errors,[])
  console.log('Board QA passed: real embedded stickers, subdued backdrop, running/static hover border, rotated-card separation, fast drag and walls, click after drag, position-preserving cutout sequence, keyboard, Escape, 5 responsive layouts, touch drag/tap, idle clock and no runtime errors.')
  await mobile.close()
} finally { await browser.close() }
