/* Named landmarks and stylised town rest stops. All distances are kilometres. */
const TownRules = {
  evaluate(s, town, ground) {
    const distance = town ? haversine(s.lat,s.lon,town.lat,town.lon) : Infinity;
    const inside = s.mode==='japan' && s.started && town && distance<=town.radius;
    const small = s.size<=.601;
    const landed = s.grounded && ground?.valid && Math.abs(s.y-ground.h)<Math.max(.08,s.size*.3);
    const still = Math.hypot(s.vx,s.vz)<.08;
    const recovering = !!(inside && small && landed && still && !s.modal && !s.loadingMove);
    return {distance,inside:!!inside,small,landed:!!landed,still,recovering};
  },
  recover(energy,dt) { return clamp(energy+Math.max(0,Math.min(dt,.5))*.45,0,1); }
};
class JapanPlaces {
  constructor(renderer,cube,ring) {
    this.r=renderer;this.cube=cube;this.ring=ring;this.near=[];this.towns=[];
    this.lastScan=-Infinity;this.lastLabels=-Infinity;this.nearestTown=null;this.resting=null;
    this.labels=document.getElementById('placeLabels');this.card=document.getElementById('townStatus');
    this.nodes=Array.from({length:8},()=>{const el=document.createElement('div');el.className='place-label';el.hidden=true;this.labels.appendChild(el);return el});
    this.lastMode=null;
  }
  scan(s) {
    if(s.mode!=='japan'||!s.started){this.near=[];this.towns=[];this.nearestTown=null;return}
    if(s.time-this.lastScan<.6&&this.lastMode===s.mode&&this.scanPos&&haversine(s.lat,s.lon,...this.scanPos)<2&&this.scanSize===s.sizeIndex)return;
    this.lastScan=s.time;this.lastMode=s.mode;this.scanPos=[s.lat,s.lon];this.scanSize=s.sizeIndex;
    const townDistances=WORLD_TOWNS.map(p=>({...p,distance:haversine(s.lat,s.lon,p.lat,p.lon)})).sort((a,b)=>a.distance-b.distance);
    this.nearestTown=townDistances[0]||null;
    this.towns=townDistances.filter(p=>p.distance<Math.max(25,s.size*18)).slice(0,3);
    const range=Math.max(30,s.size*28);
    this.near=[...townDistances.filter(p=>p.distance<range).slice(0,4),...WORLD_MOUNTAINS.map(p=>({...p,distance:haversine(s.lat,s.lon,p.lat,p.lon)})).filter(p=>p.distance<range).sort((a,b)=>a.distance-b.distance).slice(0,36)];
  }
  update(s,terrain,dt) {
    this.scan(s);
    const ground=s.mode==='japan'?terrain.sample(s.lat,s.lon):null;
    const status=TownRules.evaluate(s,this.nearestTown,ground);
    this.resting=status.recovering?this.nearestTown:null;
    if(status.recovering)s.energy=TownRules.recover(s.energy,dt);
    this.status=status;
  }
  draw(s,terrain,frame) {
    if(s.mode!=='japan'||!s.started)return;
    this.scan(s);
    for(const town of this.towns){
      const ground=terrain.sample(town.lat,town.lon);if(!ground?.valid)continue;
      const center=localGeo(town.lat,town.lon,ground.h+.015,frame);
      // Fixed-size buildings suggest a town; they are not real building footprints.
      for(let i=0;i<18;i++){
        const col=i%6,row=Math.floor(i/6),east=(col-2.5)*.21,south=(row-1)*.28;
        const ll=offsetLL(town.lat,town.lon,east,south),sample=terrain.sample(...ll);
        if(!sample?.valid)continue;
        const h=.045+(i*7%9)*.009,pos=localGeo(ll[0],ll[1],sample.h+h/2+.006,frame);
        const color=i%4===0?[.88,.73,.45,1]:[.66,.76,.70,1];
        this.r.draw(this.cube,M.trs(pos,[.095+(i%3)*.018,h,.11]),color,1,0,.2);
        const roof=[pos[0],pos[1]+h*.5+.007,pos[2]];
        this.r.draw(this.cube,M.trs(roof,[.11+(i%3)*.018,.014,.13]),[.21,.39,.38,1],1);
      }
      this.r.draw(this.ring,M.trs(center,[town.radius,town.radius,town.radius],0,Math.PI/2),[.50,.91,.79,.65],3,0,.4);
      this.r.draw(this.cube,M.trs([center[0],center[1]+.36,center[2]],[.018,.72,.018]),[.73,1,.83,.65],3,0,.5);
    }
  }
  updateLabels(s,terrain,frame,enabled) {
    const active=s.mode==='japan'&&s.started&&!s.modal;
    this.labels.hidden=!active||!enabled;
    this.card.hidden=!active||!this.nearestTown;
    if(!active){for(const n of this.nodes)n.hidden=true;return}
    const town=this.nearestTown,st=this.status;
    if(town&&st){
      document.getElementById('townName').textContent=town.name;
      document.getElementById('townDistance').textContent=st.distance.toFixed(1)+' km';
      const desc=!st.inside?'緑の光が、街の休息地。':!st.small?'600m以下に縮んで、街でひと休み。':!st.landed?'街に降りると休めます。':!st.still?'立ち止まると風のエネルギーが回復。':s.energy<.999?'ひと休み。風のエネルギーを回復中…':'回復完了。また、山の向こうへ。';
      document.getElementById('townHint').textContent=desc;
      this.card.classList.toggle('recovering',!!this.resting);
      this.card.classList.toggle('near-town',st.inside);
    }
    if(!enabled||s.time-this.lastLabels<.12)return;
    this.lastLabels=s.time;
    const mobile=innerWidth<700,max=mobile?3:8,used=[];
    const left=mobile?8:255,right=innerWidth-(mobile?8:185),top=mobile?155:105,bottom=innerHeight-(mobile?315:190);
    let count=0;
    for(const place of this.near){
      if(count>=max)break;
      if(place.kind==='town'&&haversine(s.lat,s.lon,place.lat,place.lon)<=place.radius)continue;
      const ground=terrain.sample(place.lat,place.lon);
      const elevation=place.kind==='mountain'?Math.max(place.height/1000,ground?.valid?ground.h:0):ground?.valid?ground.h:null;
      if(elevation===null)continue;
      const position=localGeo(place.lat,place.lon,elevation+Math.max(.12,s.size*.18),frame);
      const p=this.r.project(position);if(p.w<=0||p.x<left+80||p.x>right-80||p.y<top||p.y>bottom)continue;
      const w=mobile?152:184,h=49,rect={x:p.x-w/2,y:p.y-h,w,h};
      if(used.some(b=>Math.abs(b.x-rect.x)<w+12&&Math.abs(b.y-rect.y)<h+16))continue;
      // Suppress labels hidden by intervening loaded terrain.
      let blocked=false;
      for(let k=1;k<=5;k++){
        const f=k/6,ray=V.add(this.r.eye,V.mul(V.sub(position,this.r.eye),f));
        const ll=offsetLL(s.lat,s.lon,ray[0],ray[2]),g=terrain.sample(...ll);
        if(g?.valid){const surface=localGeo(ll[0],ll[1],g.h,frame);if(surface[1]>ray[1]+Math.max(.05,s.size*.04)){blocked=true;break}}
      }
      if(blocked)continue;
      const n=this.nodes[count++];n.hidden=false;n.className='place-label '+place.kind;n.style.left=rect.x+'px';n.style.top=rect.y+'px';
      n.replaceChildren();const title=document.createElement('strong');title.textContent=(place.kind==='town'?'▦ ':'△ ')+place.name;
      const detail=document.createElement('small');detail.textContent=(place.kind==='mountain'?place.height.toLocaleString()+' m · ':'街 / 休息地 · ')+haversine(s.lat,s.lon,place.lat,place.lon).toFixed(1)+' km';n.append(title,detail);used.push(rect);
    }
    for(let i=count;i<this.nodes.length;i++)this.nodes[i].hidden=true;
  }
  minimap(g,frame,scale){
    for(const p of this.near){const v=localGeo(p.lat,p.lon,0,frame),x=v[0]*scale,y=v[2]*scale;if(Math.hypot(x,y)>118)continue;
      g.fillStyle=p.kind==='town'?'#9ce4d0':'#c0d0bb';
      if(p.kind==='town')g.fillRect(x-4,y-4,8,8);else{g.beginPath();g.moveTo(x,y-4);g.lineTo(x-3,y+3);g.lineTo(x+3,y+3);g.fill()}
    }
  }
}
