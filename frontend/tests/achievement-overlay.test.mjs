import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { AchievementOverlay, achievementHtml } from '../backend/achievementOverlay.mjs';
test('provider text is escaped and overlay has no remote scripts or images',()=>{
  const html=achievementHtml({locale:'en',gameTitle:'<script>bad</script>',achievement:{title:'<img onerror=bad>'}});
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes("default-src 'none'"));
});
test('overlay is sandboxed, nonfocusing, click-through and closes before the next toast',async()=>{
  const windows=[],timers=[];
  class Window extends EventEmitter {
    constructor(options){super();this.options=options;this.webContents={setWindowOpenHandler:()=>{},on:()=>{}};windows.push(this);}
    setIgnoreMouseEvents(value){this.ignore=value;}setAlwaysOnTop(value){this.top=value;}async loadURL(url){this.url=url;}showInactive(){this.inactive=true;}isDestroyed(){return !!this.closed;}close(){this.closed=true;this.emit('closed');}
  }
  const overlay=new AchievementOverlay(Window,()=>({workArea:{x:0,y:0,width:1920,height:1080}}),{schedule:fn=>{timers.push(fn);return fn;},cancel:()=>{}});
  const notice={locale:'fr',gameTitle:'Game',achievement:{title:'Real unlock'}};overlay.show(notice);overlay.show(notice);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(windows.length,1);assert.equal(windows[0].ignore,true);assert.equal(windows[0].inactive,true);assert.equal(windows[0].options.focusable,false);assert.equal(windows[0].options.webPreferences.sandbox,true);
  timers[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(windows.length,2);overlay.dispose();assert.equal(windows[1].closed,true);overlay.show(notice);assert.equal(windows.length,2);
});
