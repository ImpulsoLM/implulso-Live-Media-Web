// Decorative motion stays local: no libraries, tracking or network requests.
(() => {
  const canvas = document.getElementById('impulso-flow');
  const reactions = document.getElementById('live-reactions');
  const toggle = document.getElementById('visual-effects-toggle');
  const label = document.getElementById('visual-effects-label');
  if (!canvas || !reactions || !toggle || !label) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) { toggle.hidden = true; return; }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = [[64,229,245], [129,141,255], [198,101,255], [255,90,176]];
  let saved = 'auto';
  try { saved = localStorage.getItem('impulso-visual-effects') || 'auto'; } catch {}
  let enabled = saved === 'on' || (!reduced.matches && saved !== 'off');
  let width = 0, height = 0, points = [], frame = 0, emission = 0;
  let previous = 0, elapsed = 0, burstCount = 0;
  let pointer = null;

  function resize() {
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = width < 600 ? 145 : width < 1000 ? 245 : 360;
    points = Array.from({length:count},(_,index)=>{
      const angle=Math.random()*Math.PI*2;
      return {x:Math.random()*width,y:Math.random()*height,
        vx:Math.cos(angle)*1.3,vy:Math.sin(angle)*1.3,
        size:index%9===0?2.5:1.1+Math.random()*.8,
        color:colors[index%colors.length],light:Math.random()*Math.PI*2};
    });
  }

  function draw(now) {
    frame=0;
    if(!enabled||document.hidden)return;
    if(now-previous<33){frame=requestAnimationFrame(draw);return;}
    const dt=Math.min((now-previous)/33,2);previous=now;elapsed+=.033*dt;
    context.clearRect(0,0,width,height);
    // Free flocking agents. No point follows a closed curve or index-based target.
    // Neighbours share direction while personal space breathes over time.
    const expansion=.5+.5*Math.sin(elapsed*.49);
    const separationRadius=24+expansion*42;
    const cellSize=110,grid=new Map();
    for(const p of points){const key=Math.floor(p.x/cellSize)+','+Math.floor(p.y/cellSize);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p);}
    const centerX=width*(.5+.13*Math.sin(elapsed*.21));
    const centerY=height*(.5+.13*Math.sin(elapsed*.27+.8));
    for(const p of points){
      let neighbours=0,avgX=0,avgY=0,avgVx=0,avgVy=0,repelX=0,repelY=0;
      const gx=Math.floor(p.x/cellSize),gy=Math.floor(p.y/cellSize);
      for(let x=gx-1;x<=gx+1;x++)for(let y=gy-1;y<=gy+1;y++){
        const cell=grid.get(x+','+y);if(!cell)continue;
        for(const q of cell){if(q===p)continue;const dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy;
          if(d2<110*110){neighbours++;avgX+=q.x;avgY+=q.y;avgVx+=q.vx;avgVy+=q.vy;
            if(d2<separationRadius*separationRadius&&d2>.01){const force=(1-Math.sqrt(d2)/separationRadius)/Math.max(d2,16);repelX+=dx*force;repelY+=dy*force;}
          }
        }
      }
      let ax=repelX*.8,ay=repelY*.8;
      if(neighbours){
        ax+=(avgVx/neighbours-p.vx)*.022+(avgX/neighbours-p.x)*.00012*(1-expansion*.7);
        ay+=(avgVy/neighbours-p.vy)*.022+(avgY/neighbours-p.y)*.00012*(1-expansion*.7);
      }
      // A slowly changing wind bends the whole swarm; local flow keeps it organic.
      ax+=Math.sin(elapsed*.36)*.023+Math.sin(p.y*.006+elapsed*.65)*.025;
      ay+=Math.cos(elapsed*.29)*.023+Math.cos(p.x*.005-elapsed*.58)*.025;
      const dx=p.x-centerX,dy=p.y-centerY,distance=Math.max(Math.hypot(dx,dy),1);
      const gather=.000025+(1-expansion)*.00014;
      ax-=dx*gather;ay-=dy*gather;
      ax+=dx/distance*expansion*.026;ay+=dy/distance*expansion*.026;
      const margin=55;
      if(p.x<margin)ax+=(margin-p.x)*.002;
      if(p.x>width-margin)ax-=(p.x-width+margin)*.002;
      if(p.y<margin)ay+=(margin-p.y)*.002;
      if(p.y>height-margin)ay-=(p.y-height+margin)*.002;
      if(pointer){const px=p.x-pointer.x,py=p.y-pointer.y,d=Math.hypot(px,py);if(d>1&&d<120){const f=(1-d/120)*.18;ax+=px/d*f;ay+=py/d*f;}}
      p.nextVx=(p.vx+ax*dt)*.992;p.nextVy=(p.vy+ay*dt)*.992;
      const speed=Math.hypot(p.nextVx,p.nextVy),limit=1.65+expansion*.85;
      if(speed>limit){p.nextVx=p.nextVx/speed*limit;p.nextVy=p.nextVy/speed*limit;}
    }
    for(const p of points){
      p.vx=p.nextVx;p.vy=p.nextVy;p.x+=p.vx*dt;p.y+=p.vy*dt;
      const [r,g,b]=p.color,alpha=.65+.25*Math.sin(elapsed*.7+p.light);
      // Tiny direction marks, never accumulated ribbons or connected paths.
      context.beginPath();context.moveTo(p.x-p.vx*2,p.y-p.vy*2);context.lineTo(p.x,p.y);
      context.strokeStyle=`rgba(${r},${g},${b},.24)`;context.lineWidth=.8;context.stroke();
      if(p.size>2){context.beginPath();context.arc(p.x,p.y,p.size*3,0,Math.PI*2);context.fillStyle=`rgba(${r},${g},${b},.07)`;context.fill();}
      context.beginPath();context.arc(p.x,p.y,p.size,0,Math.PI*2);context.fillStyle=`rgba(${r},${g},${b},${alpha})`;context.fill();
    }
    frame=requestAnimationFrame(draw);
  }

  function emitReaction() {
    if (!enabled || document.hidden || reactions.childElementCount >= 8) return;
    const glyphs = ['💖','🌹','💎','✦','👑','🚀','🦁','🦋','🎁','💖'];
    const node = document.createElement('span');
    node.className = 'live-reaction';
    node.style.setProperty('--reaction-left', (22 + Math.random() * 48) + '%');
    node.style.setProperty('--reaction-size', (19 + Math.random() * 17) + 'px');
    node.style.setProperty('--reaction-color', ['#fb7caf','#9df2e3','#c9a1f2','#ffb6cb'][burstCount % 4]);
    node.style.setProperty('--reaction-drift', (-19 + Math.random() * 38) + 'px');
    node.style.setProperty('--reaction-rotate', (-18 + Math.random() * 36) + 'deg');
    node.style.setProperty('--reaction-duration', (4.4 + Math.random() * 1.4) + 's');
    const inner = document.createElement('span');
    inner.textContent = glyphs[burstCount++ % glyphs.length];
    node.append(inner);
    node.addEventListener('animationend', (event) => {
      if (event.target === node) node.remove();
    }, { once: true });
    reactions.append(node);
  }

  function stop() {
    cancelAnimationFrame(frame);
    clearInterval(emission);
    frame = 0;
    emission = 0;
    reactions.replaceChildren();
  }

  function start() {
    stop();
    if (!enabled || document.hidden) return;
    previous = performance.now();
    frame = requestAnimationFrame(draw);
    emitReaction();
    emission = setInterval(emitReaction, 2000);
  }

  function sync() {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Pausar efectos visuales' : 'Activar efectos visuales');
    label.textContent = enabled ? 'Pausar efectos' : 'Activar efectos';
    toggle.title = reduced.matches ? 'Tu dispositivo prefiere menos movimiento. Puedes activar los efectos si lo deseas.' : '';
    document.body.classList.toggle('effects-enabled', enabled);
    document.body.classList.toggle('effects-paused', !enabled);
    if (enabled) start();
    else { stop(); context.clearRect(0, 0, width, height); }
  }

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('impulso-visual-effects', enabled ? 'on' : 'off'); } catch {}
    sync();
  });
  reduced.addEventListener('change', () => {
    enabled = localStoragePreference() === 'on' || (!reduced.matches && localStoragePreference() !== 'off');
    sync();
  });
  function localStoragePreference() {
    try { return localStorage.getItem('impulso-visual-effects'); } catch { return null; }
  }
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; });
  document.getElementById('gift-burst')?.addEventListener('click', () => { if (!enabled) { enabled=true; sync(); } for(let i=0;i<3;i++) emitReaction(); });
  resize();
  sync();
})();

