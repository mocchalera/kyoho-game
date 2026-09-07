/* Terrain loading: GSI PNG DEM, with explicit unknown / no-data handling.
   The offline island is deliberately fictional and never labelled as Japan. */
const DESTINATIONS=[
 {id:'alps',name:'北アルプス',sub:'谷の奥に、また山がある。',lat:36.26,lon:137.66,heading:-.25,region:'中部',size:.6},
 {id:'fuji',name:'富士山',sub:'知っている輪郭を、足元から。',lat:35.31,lon:138.73,heading:0,region:'中部',size:.6},
 {id:'south',name:'南アルプス',sub:'街からは見えない、山の奥行き。',lat:35.61,lon:138.25,heading:-.4,region:'中部',size:.6},
 {id:'yatsu',name:'八ヶ岳',sub:'いくつもの稜線を、ひと息に。',lat:35.96,lon:138.36,heading:.2,region:'中部',size:.6},
 {id:'daisetsu',name:'大雪山',sub:'山の上にも、大地が続く。',lat:43.62,lon:142.84,heading:.4,region:'北海道',size:3},
 {id:'hidaka',name:'日高山脈',sub:'道のないほうへ、想像を伸ばす。',lat:42.58,lon:142.72,heading:.2,region:'北海道',size:.6},
 {id:'rishiri',name:'利尻島',sub:'海からそびえる、ひとつの山。',lat:45.14,lon:141.20,heading:.4,region:'北海道',size:.6},
 {id:'iwate',name:'岩手山',sub:'平野の向こうを、駆け上がる。',lat:39.80,lon:141.02,heading:-.6,region:'東北',size:.6},
 {id:'chokai',name:'鳥海山',sub:'山の向こうで、海が待つ。',lat:39.06,lon:140.10,heading:-.6,region:'東北',size:.6},
 {id:'oze',name:'尾瀬・燧ヶ岳',sub:'なだらかさと険しさの、境界へ。',lat:36.92,lon:139.28,heading:.7,region:'関東・東北',size:.6},
 {id:'takao',name:'高尾・奥多摩',sub:'生活圏のすぐ裏にも、山は続く。',lat:35.62,lon:139.25,heading:-.8,region:'関東',size:.18},
 {id:'kii',name:'紀伊山地',sub:'名前を知らない谷を、いくつ越える？',lat:34.11,lon:135.94,heading:-.1,region:'近畿',size:.6},
 {id:'daisen',name:'大山',sub:'ひとつの山から、山地の広がりへ。',lat:35.34,lon:133.57,heading:0,region:'中国',size:.6},
 {id:'ishizuchi',name:'石鎚山',sub:'四国の内側を、身体で知る。',lat:33.75,lon:133.13,heading:0,region:'四国',size:.6},
 {id:'aso',name:'阿蘇',sub:'山だと思ったら、その外にも山。',lat:32.88,lon:131.05,heading:1.3,region:'九州',size:.6},
 {id:'kirishima',name:'霧島',sub:'火山の連なりを、自由に渡る。',lat:31.89,lon:130.86,heading:0,region:'九州',size:.6},
 {id:'yakushima',name:'屋久島',sub:'島の奥へ、山の奥へ。',lat:30.31,lon:130.50,heading:0,region:'南西諸島',size:.6},
 {id:'yanbaru',name:'やんばる',sub:'低い山にも、深い奥行きがある。',lat:26.74,lon:128.22,heading:.6,region:'南西諸島',size:.18}
];
function hash2(x,z){let n=Math.sin(x*127.1+z*311.7)*43758.5453123;return n-Math.floor(n)}
function valueNoise(x,z){let i=Math.floor(x),j=Math.floor(z),u=smooth(0,1,x-i),v=smooth(0,1,z-j);return mix(mix(hash2(i,j),hash2(i+1,j),u),mix(hash2(i,j+1),hash2(i+1,j+1),u),v)}
function demoHeight(x,z){let pz=z+16,edge=1-smooth(.48,1.03,Math.sqrt((x/48)**2+(pz/62)**2));if(edge<.001)return -.05;
 let ridge=0,amp=1,f=.042;for(let k=0;k<6;k++){let n=valueNoise((x+21)*f,(z-52)*f);ridge+=(1-Math.abs(n*2-1))**2*amp;amp*=.49;f*=2.03;}
 let chain=1.4*Math.exp(-Math.pow((x-4-Math.sin(z*.08)*8)/15,2)-((z+14)/44)**2);
 let cone=.7*Math.exp(-Math.pow((x+17)/7,2)-((z+10)/10)**2);
 let river=.85*Math.exp(-Math.pow((x-Math.sin(z*.075)*9-8)/2.5,2));
 return Math.max(-.05,((ridge*1.7+chain+cone-river-.23)*edge)-.04);
}
function createDemoTerrain(renderer){const meshes=[],size=16,n=40;for(let tz=-5;tz<3;tz++)for(let tx=-4;tx<4;tx++){let d=[],ix=[];for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){let x=tx*size+i/n*size,z=tz*size+j/n*size,h=demoHeight(x,z),dx=(demoHeight(x+.08,z)-demoHeight(x-.08,z))/.16,dz=(demoHeight(x,z+.08)-demoHeight(x,z-.08))/.16;vertex(d,[x,h,z],V.norm([-dx,1,-dz]));}for(let j=0;j<n;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i;ix.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2)}const mesh=renderer.mesh(d,ix);mesh.cx=tx*size+size*.5;mesh.cz=tz*size+size*.5;meshes.push(mesh);}return meshes;}
function tileXY(lat,lon,z){const n=2**z;return[(lon+180)/360*n,(1-Math.asinh(Math.tan(lat*RAD))/Math.PI)/2*n]}
function tileLL(x,y,z){const n=2**z;return[Math.atan(Math.sinh(Math.PI*(1-2*y/n)))/RAD,x/n*360-180]}
function decodeDEM(rgba){const out=new Float32Array(256*256);let valid=0;for(let i=0;i<out.length;i++){let v=rgba[i*4]*65536+rgba[i*4+1]*256+rgba[i*4+2];let h=(v<8388608?v:v-16777216)*.01;out[i]=(rgba[i*4+3]===0||v===8388608||h< -500||h>9000)?NaN:h/1000;if(Number.isFinite(out[i]))valid++;}return {data:out,valid};}
function sampleArray(a,x,y){x=clamp(x,0,255);y=clamp(y,0,255);let ix=Math.floor(x),iy=Math.floor(y),jx=Math.min(ix+1,255),jy=Math.min(iy+1,255),u=x-ix,v=y-iy;
 let vals=[a[iy*256+ix],a[iy*256+jx],a[jy*256+ix],a[jy*256+jx]],w=[(1-u)*(1-v),u*(1-v),(1-u)*v,u*v],s=0,t=0;for(let i=0;i<4;i++)if(Number.isFinite(vals[i])){s+=vals[i]*w[i];t+=w[i]}return t>.001?s/t:NaN;
}
class TileCache{
 constructor(){this.db=null;this.ready=new Promise(resolve=>{try{const r=indexedDB.open('kyoho-gsi-png-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('tiles',{keyPath:'key'});r.onsuccess=()=>{this.db=r.result;resolve()};r.onerror=()=>resolve();}catch(e){resolve()}})}
 async get(key){await this.ready;if(!this.db)return null;return new Promise(res=>{try{let r=this.db.transaction('tiles').objectStore('tiles').get(key);r.onsuccess=()=>res(r.result?.blob||null);r.onerror=()=>res(null)}catch{res(null)}})}
 async put(key,blob){await this.ready;if(!this.db)return;try{const tx=this.db.transaction('tiles','readwrite'),s=tx.objectStore('tiles');s.put({key,blob,time:Date.now()});const q=s.count();q.onsuccess=()=>{if(q.result>100){let c=s.openCursor(),left=q.result-100;c.onsuccess=()=>{const v=c.result;if(v&&left-->0){v.delete();v.continue()}}}}}catch(e){}}
}
class JapanTerrain{
 constructor(renderer){this.r=renderer;this.cache=new TileCache;this.tiles=new Map;this.queue=[];this.active=0;this.zoom=11;this.renderZoom=11;this.wanted=new Set;this.failures=0;this.totalSuccess=0;this.networkBytes=0;this.enabled=false;this.token=0;this.lastUpdate=0;this.quality=64;this.onChange=()=>{};}
 selectZoom(s){return s<.35?12:s<1.5?11:s<6?9:7}
 key(z,x,y){return z+'/'+x+'/'+y}
 update(lat,lon,s,now,force=false){if(!this.enabled)return;const zoom=this.selectZoom(s);if(!force&&now-this.lastUpdate<.4&&zoom===this.zoom)return;this.lastUpdate=now;this.zoom=zoom;const xy=tileXY(lat,lon,zoom),x=Math.floor(xy[0]),y=Math.floor(xy[1]);const wanted=[],set=new Set;const rad=3;for(let j=-rad;j<=rad;j++)for(let i=-rad;i<=rad;i++)wanted.push({z:zoom,x:x+i,y:y+j,d:i*i+j*j});wanted.sort((a,b)=>a.d-b.d);
 for(let v of wanted){const key=this.key(v.z,v.x,v.y);set.add(key);let tile=this.tiles.get(key);if(!tile){tile={...v,key,status:'queued',data:null,mesh:null,time:now};this.tiles.set(key,tile);this.queue.push(tile)}tile.used=now;}
 this.wanted=set;this.queue=this.queue.filter(t=>set.has(t.key));this.queue.sort((a,b)=>wanted.findIndex(t=>this.key(t.z,t.x,t.y)===a.key)-wanted.findIndex(t=>this.key(t.z,t.x,t.y)===b.key));
 for(const v of wanted){const t=this.tiles.get(this.key(v.z,v.x,v.y));if(t.status==='queued'&&!this.queue.includes(t))this.queue.push(t)}
 const center=this.tiles.get(this.key(zoom,x,y));if(center?.status==='ready')this.renderZoom=zoom;
 if(this.tiles.size>140){for(const[k,t]of this.tiles){if(!set.has(k)&&now-(t.used||0)>20&&t.status!=='loading'){this.r.destroy(t.mesh);this.tiles.delete(k);if(this.tiles.size<=100)break}}}
 this.pump();}
 async blobData(blob){const url=URL.createObjectURL(blob);try{const img=new Image;await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(Error('PNGの展開に失敗'));img.src=url});if(img.width!==256||img.height!==256)throw Error('予期しないタイル寸法');const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);return decodeDEM(g.getImageData(0,0,256,256).data);}finally{URL.revokeObjectURL(url)}}
 pump(){while(this.enabled&&this.active<3&&this.queue.length){const t=this.queue.shift();if(t.status!=='queued'||!this.wanted.has(t.key))continue;this.active++;t.status='loading';this.load(t).finally(()=>{this.active--;this.onChange();this.pump()})}}
 async load(t){try{let blob=await this.cache.get(t.key),cached=!!blob;if(!blob){const ctl=new AbortController,timeout=setTimeout(()=>ctl.abort(),10000);try{let response=await fetch(`https://cyberjapandata.gsi.go.jp/xyz/dem_png/${t.key}.png`,{mode:'cors',signal:ctl.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('HTTP '+response.status);blob=await response.blob();this.networkBytes+=blob.size;}finally{clearTimeout(timeout)}}const result=await this.blobData(blob);t.data=result.data;t.valid=result.valid;t.status='ready';t.cached=cached;this.totalSuccess++;if(!cached)this.cache.put(t.key,blob);t.mesh=this.buildMesh(t);if(this.zoom===t.z)this.renderZoom=t.z;
 }catch(e){t.status='failed';t.error=e.message;this.failures++;}}
 buildMesh(t){const n=this.quality,d=[],ix=[],positions=[],heights=[];for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const u=i/n,v=j/n;let h=sampleArray(t.data,u*256-.5,v*256-.5),ll=tileLL(t.x+u,t.y+v,t.z);heights.push(h);positions.push(ecef(ll[0],ll[1],Number.isFinite(h)?h:-.1));}
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){let a=j*(n+1)+i,l=j*(n+1)+Math.max(i-1,0),rr=j*(n+1)+Math.min(i+1,n),up=Math.max(j-1,0)*(n+1)+i,dn=Math.min(j+1,n)*(n+1)+i;let normal=V.norm(V.cross(V.sub(positions[dn],positions[up]),V.sub(positions[rr],positions[l])));vertex(d,positions[a],normal);}
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i,b=a+n+1;if(Number.isFinite(heights[a])&&Number.isFinite(heights[b])&&Number.isFinite(heights[a+1]))ix.push(a,b,a+1);if(Number.isFinite(heights[a+1])&&Number.isFinite(heights[b])&&Number.isFinite(heights[b+1]))ix.push(a+1,b,b+1);}
 return this.r.mesh(d,ix);}
 sample(lat,lon){for(let z of[this.zoom,this.renderZoom,12,11,9,7]){const xy=tileXY(lat,lon,z),t=this.tiles.get(this.key(z,Math.floor(xy[0]),Math.floor(xy[1])));if(t?.status==='ready'){let h=sampleArray(t.data,(xy[0]%1)*256-.5,(xy[1]%1)*256-.5);return{h:Number.isFinite(h)?Math.max(h,0):0,valid:Number.isFinite(h),zoom:z}}}return null;}
 draw(lat,lon){const xy=tileXY(lat,lon,this.renderZoom);for(const t of this.tiles.values())if(t.status==='ready'&&t.z===this.renderZoom&&Math.abs(t.x-xy[0])<4.5&&Math.abs(t.y-xy[1])<4.5)this.r.draw(t.mesh,this.r.I,[1,1,1,1],0,1);}
 progress(){let ready=0,failed=0;for(const k of this.wanted){const t=this.tiles.get(k);if(t?.status==='ready')ready++;if(t?.status==='failed')failed++;}return{ready,failed,total:this.wanted.size,active:this.active,bytes:this.networkBytes};}
 retry(){for(const t of this.tiles.values())if(t.status==='failed'&&this.wanted.has(t.key)){t.status='queued';this.queue.push(t)}this.failures=0;this.pump()}
}
