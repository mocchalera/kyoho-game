/* KYOHO — tiny, dependency-free WebGL renderer. Coordinates are kilometres. */
'use strict';
const R_EARTH=6371.0088, RAD=Math.PI/180;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const V={add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),mul:(a,s)=>a.map(x=>x*s),dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{let n=Math.hypot(...a)||1;return a.map(x=>x/n)}};
const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul:(a,b)=>{let c=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)c[j*4+i]+=a[k*4+i]*b[j*4+k];return c},
 perspective:(fov,asp,n,f)=>{const s=1/Math.tan(fov/2),q=1/(n-f);return new Float32Array([s/asp,0,0,0,0,s,0,0,0,0,(f+n)*q,-1,0,0,2*f*n*q,0])},
 view:(eye,at,up=[0,1,0])=>{const z=V.norm(V.sub(eye,at)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1])},
 trs:(p,s=[1,1,1],yaw=0,rx=0)=>{const c=Math.cos(yaw),n=Math.sin(yaw),cx=Math.cos(rx),sx=Math.sin(rx);return new Float32Array([c*s[0],0,-n*s[0],0,n*sx*s[1],cx*s[1],c*sx*s[1],0,n*cx*s[2],-sx*s[2],c*cx*s[2],0,p[0],p[1],p[2],1])},
 segment:(a,b,w,d=w)=>{const y=V.sub(b,a),l=Math.hypot(...y),yn=V.norm(y),x=V.norm(V.cross(Math.abs(yn[2])>.95?[0,1,0]:[0,0,1],yn)),z=V.cross(x,yn),p=V.mul(V.add(a,b),.5);return new Float32Array([x[0]*w,x[1]*w,x[2]*w,0,yn[0]*l,yn[1]*l,yn[2]*l,0,z[0]*d,z[1]*d,z[2]*d,0,...p,1])}
};
function ecef(lat,lon,h=0){const a=lat*RAD,b=lon*RAD,r=R_EARTH+h;return[r*Math.cos(a)*Math.cos(b),r*Math.sin(a),r*Math.cos(a)*Math.sin(b)]}
function frameAt(lat,lon){let a=lat*RAD,b=lon*RAD;return {origin:ecef(lat,lon),east:[-Math.sin(b),0,Math.cos(b)],up:[Math.cos(a)*Math.cos(b),Math.sin(a),Math.cos(a)*Math.sin(b)],south:[Math.sin(a)*Math.cos(b),-Math.cos(a),Math.sin(a)*Math.sin(b)]}}
function localGeo(lat,lon,h,f){const d=V.sub(ecef(lat,lon,h),f.origin);return[V.dot(d,f.east),V.dot(d,f.up),V.dot(d,f.south)]}
function haversine(a,b,c,d){const v=Math.sin((c-a)*RAD/2)**2+Math.cos(a*RAD)*Math.cos(c*RAD)*Math.sin((d-b)*RAD/2)**2;return 2*R_EARTH*Math.asin(Math.sqrt(clamp(v,0,1)))}
function offsetLL(lat,lon,east,south){return[lat-south/R_EARTH/RAD,lon+east/(R_EARTH*Math.cos(lat*RAD))/RAD]}
const VS=`precision highp float;
attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;
uniform mat4 uVP,uModel;uniform vec3 uOrigin,uEast,uUp,uSouth,uPlanar;
uniform float uSpace;
varying vec3 vP,vN,vC,vWorld;varying float vHeight;
void main(){vec3 p=(uModel*vec4(aP,1.)).xyz;vec3 n=mat3(uModel)*aN;vWorld=p;vHeight=p.y;
if(uSpace>.5&&uSpace<1.5){vec3 q=p-uOrigin;p=vec3(dot(q,uEast),dot(q,uUp),dot(q,uSouth));n=vec3(dot(n,uEast),dot(n,uUp),dot(n,uSouth));vHeight=length(vWorld)-6371.0088;}
else if(uSpace>1.5){p-=uPlanar;}
vP=p;vN=normalize(n);vC=aC;gl_Position=uVP*vec4(p,1.);}`;
const FS=`precision highp float;
varying vec3 vP,vN,vC,vWorld;varying float vHeight;
uniform vec3 uEye,uSun;uniform vec4 uColor;uniform float uKind,uTime,uFog,uScale,uGround,uContour,uDusk,uEmission;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
vec3 sky(vec3 d){vec3 h=mix(vec3(.72,.84,.82),vec3(.83,.60,.48),uDusk);vec3 t=mix(vec3(.16,.44,.53),vec3(.20,.28,.43),uDusk);return mix(h,t,smoothstep(-.08,.75,d.y));}
void main(){vec3 n=normalize(vN),view=normalize(uEye-vP);float ndl=max(dot(n,uSun),0.);vec3 col=uColor.rgb*vC;float alpha=uColor.a;
if(uKind<.5){
 float alt=max(vHeight,0.);float grain=noise(vWorld.xz*7.)*.55+noise(vWorld.xz*27.)*.18;
 vec3 low=vec3(.24,.38,.23),forest=vec3(.095,.245,.18),alpine=vec3(.36,.43,.34),rock=vec3(.40,.43,.42),snow=vec3(.88,.90,.86);
 col=mix(low,forest,smoothstep(.06,.50,alt));col=mix(col,alpine,smoothstep(1.55,2.5,alt));
 float steep=1.-n.y;col=mix(col,rock,smoothstep(.2,.6,steep)*smoothstep(.5,1.8,alt));
 float snowmask=smoothstep(2.6+grain*.65,3.25+grain*.2,alt)*smoothstep(.45,.80,n.y);col=mix(col,snow,snowmask);
 col*=.87+grain*.32;col*=vec3(.48,.66,.73)*(.60+.28*n.y)+vec3(1.15,1.10,.88)*ndl*.85;
 float foot=exp(-dot(vP.xz/vec2(uScale*.65,uScale*.4),vP.xz/vec2(uScale*.65,uScale*.4))*1.7);col*=1.-foot*.48*exp(-abs(uGround-vP.y)*1.8/max(uScale,.1));
 if(uContour>.5){float f=abs(fract(vHeight*5.)-.5);float line=1.-smoothstep(.012,.035,f);col=mix(col,vec3(.72,.87,.67),line*.23);}
 if(alt<.025)col=mix(vec3(.61,.60,.43),col,smoothstep(0.,.025,alt));
}else if(uKind<1.5){float rim=pow(1.-max(dot(n,view),0.),3.);col*=.47+ndl*.64;col+=vec3(.49,.68,.69)*rim*.38+uColor.rgb*uEmission;
}else if(uKind<2.5){vec2 w=vP.xz;float wave=sin(w.x*7.+uTime*.8)*sin(w.y*9.-uTime*.65)*.012;vec3 norm=normalize(vec3(wave,.9,wave));float fres=pow(1.-max(dot(norm,view),0.),4.);col=mix(vec3(.07,.25,.28),sky(reflect(-view,norm)),.25+fres*.55);float spec=pow(max(dot(reflect(-uSun,norm),view),0.),96.);col+=vec3(1.,.85,.52)*spec*.5;col+=.014*sin(w.y*21.+w.x*4.+uTime);
}else if(uKind<3.5){col=uColor.rgb*(1.+uEmission);}
float dist=length(vP-uEye);float fog=1.-exp(-dist/max(uFog,.1));fog=clamp(fog,0.,.98);col=mix(col,sky(normalize(vP-uEye)),fog);
col=mix(col,col*vec3(1.09,.93,.86),uDusk*.55);gl_FragColor=vec4(col,alpha);}`;
const SKYVS=`attribute vec2 aP;varying vec2 vUV;void main(){vUV=aP;gl_Position=vec4(aP,.99999,1.);}`;
const SKYFS=`precision highp float;varying vec2 vUV;uniform vec3 uRight,uCamUp,uDir,uSun;uniform float uAspect,uFov,uTime,uDusk;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}float fbm(vec2 p){float t=0.;t+=noise(p)*.5;t+=noise(p*2.03)*.25;t+=noise(p*4.09)*.125;t+=noise(p*8.2)*.0625;return t;}
void main(){vec3 d=normalize(uDir+uRight*vUV.x*uAspect*uFov+uCamUp*vUV.y*uFov);vec3 h=mix(vec3(.72,.84,.82),vec3(.83,.60,.48),uDusk),top=mix(vec3(.16,.44,.53),vec3(.20,.28,.43),uDusk);vec3 c=mix(h,top,smoothstep(-.08,.75,d.y));float s=max(dot(d,uSun),0.);c+=vec3(1.,.72,.32)*pow(s,16.)*.17;c=mix(c,vec3(1.,.96,.75),smoothstep(.9994,.99975,s));
if(d.y>.015){vec2 p=d.xz/(d.y+.05)*1.1+vec2(uTime*.003,0.);float n=fbm(p);float cloud=smoothstep(.49,.68,n)*smoothstep(.015,.22,d.y);vec3 cc=mix(vec3(.88,.91,.88),vec3(.97,.75,.55),uDusk);c=mix(c,cc,cloud*.62);}gl_FragColor=vec4(c,1.);}`;
class TinyGL{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGLを利用できません。Safari / Chromeで開いてください。');const gl=this.gl;gl.getExtension('OES_element_index_uint');this.main=this.program(VS,FS);this.sky=this.program(SKYVS,SKYFS);this.I=M.identity();this.screen=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.screen);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);this.draws=0;this.tris=0;this.lastAttributes=[];}
 program(v,f){const gl=this.gl;function shader(type,s){const sh=gl.createShader(type);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return{p,u:new Map(),a:{}};}
 use(p){this.current=p;this.gl.useProgram(p.p);}
 u(name,value){const gl=this.gl,p=this.current;let l=p.u.get(name);if(l===undefined){l=gl.getUniformLocation(p.p,name);p.u.set(name,l)}if(l===null)return;if(typeof value==='number')gl.uniform1f(l,value);else if(value.length===16)gl.uniformMatrix4fv(l,false,value);else if(value.length===4)gl.uniform4fv(l,value);else if(value.length===3)gl.uniform3fv(l,value);else if(value.length===2)gl.uniform2fv(l,value);}
 mesh(data,indices,dynamic=false){const gl=this.gl,vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);const a=data instanceof Float32Array?data:new Float32Array(data);gl.bufferData(gl.ARRAY_BUFFER,a,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);let ibo=null,typ=gl.UNSIGNED_SHORT;if(indices){ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);let ia=indices instanceof Uint32Array?indices:new Uint16Array(indices);typ=ia instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,ia,gl.STATIC_DRAW)}return{vbo,ibo,count:indices?indices.length:a.length/9,type:typ,dynamic};}
 destroy(mesh){if(mesh){this.gl.deleteBuffer(mesh.vbo);if(mesh.ibo)this.gl.deleteBuffer(mesh.ibo)}}
 update(mesh,data){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);mesh.count=data.length/9;}
 attrib(p,name,size,stride,offset){const gl=this.gl;let l=p.a[name];if(l===undefined)l=p.a[name]=gl.getAttribLocation(p.p,name);if(l<0)return;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,stride,offset);}
 resize(w,h,dpr){const c=this.canvas;let a=Math.round(w*dpr),b=Math.round(h*dpr);if(c.width!==a||c.height!==b){c.width=a;c.height=b;}this.gl.viewport(0,0,a,b)}
 begin(eye,at,frame,planar,time,scale,opts){this.draws=0;this.tris=0;const gl=this.gl,asp=this.canvas.width/this.canvas.height,fov=opts.fov||58*RAD;this.eye=eye;this.frame=frame;this.planar=planar;const far=1800,near=Math.max(.001,scale*.006);this.VP=M.mul(M.perspective(fov,asp,near,far),M.view(eye,at));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);this.use(this.sky);const dir=V.norm(V.sub(at,eye)),right=V.norm(V.cross(dir,[0,1,0])),up=V.cross(right,dir);this.u('uDir',dir);this.u('uRight',right);this.u('uCamUp',up);this.u('uAspect',asp);this.u('uFov',Math.tan(fov/2));this.u('uSun',V.norm([-.55,.47,-.72]));this.u('uTime',time);this.u('uDusk',opts.dusk||0);gl.bindBuffer(gl.ARRAY_BUFFER,this.screen);this.attrib(this.sky,'aP',2,0,0);gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);this.use(this.main);this.u('uVP',this.VP);this.u('uEye',eye);this.u('uOrigin',frame.origin);this.u('uEast',frame.east);this.u('uUp',frame.up);this.u('uSouth',frame.south);this.u('uPlanar',planar);this.u('uSun',V.norm([-.55,.47,-.72]));this.u('uTime',time);this.u('uScale',scale);this.u('uGround',opts.ground||0);this.u('uFog',opts.fog||60);this.u('uContour',opts.contour?1:0);this.u('uDusk',opts.dusk||0);}
 draw(mesh,model=this.I,color=[1,1,1,1],kind=1,space=0,emission=0){if(!mesh||!mesh.count)return;const gl=this.gl;this.u('uModel',model);this.u('uColor',color);this.u('uKind',kind);this.u('uSpace',space);this.u('uEmission',emission);if(color[3]<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}else{gl.disable(gl.BLEND);gl.depthMask(true)}gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vbo);this.attrib(this.main,'aP',3,36,0);this.attrib(this.main,'aN',3,36,12);this.attrib(this.main,'aC',3,36,24);if(mesh.ibo){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ibo);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.type,0)}else gl.drawArrays(gl.TRIANGLES,0,mesh.count);gl.depthMask(true);this.draws++;this.tris+=mesh.count/3;}
 project(p){const m=this.VP,x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];return{x:((m[0]*x+m[4]*y+m[8]*z+m[12])/w*.5+.5)*innerWidth,y:(.5-(m[1]*x+m[5]*y+m[9]*z+m[13])/w*.5)*innerHeight,w};}
}
function vertex(data,p,n,c=[1,1,1]){data.push(...p,...n,...c)}
function cubeMesh(r){const d=[];for(let k=0;k<3;k++)for(let sign of[-1,1]){let n=[0,0,0];n[k]=sign;let a=(k+1)%3,b=(k+2)%3;let pts=[];for(let uv of[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){let p=[0,0,0];p[k]=sign*.5;p[a]=uv[0];p[b]=uv[1];pts.push(p)}for(let i of[0,1,2,0,2,3])vertex(d,pts[i],n)}return r.mesh(d)}
function sphereMesh(r,n=12,m=8){const d=[],ix=[];for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){let a=i/n*Math.PI*2,b=j/m*Math.PI,p=[Math.sin(b)*Math.cos(a)*.5,Math.cos(b)*.5,Math.sin(b)*Math.sin(a)*.5];vertex(d,p,V.norm(p));}for(let j=0;j<m;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i,b=a+n+1;ix.push(a,b,a+1,a+1,b,b+1)}return r.mesh(d,ix)}
function ringMesh(r,segments=64,thin=.025){const d=[],ix=[];for(let j=0;j<=segments;j++){let a=j/segments*Math.PI*2;for(let k=0;k<2;k++){let rad=1+(k?thin:-thin);vertex(d,[Math.cos(a)*rad,Math.sin(a)*rad,0],[0,0,1]);}}for(let i=0;i<segments;i++){let a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}return r.mesh(d,ix)}
function planeMesh(r,span=1100,n=80){const d=[],ix=[];for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){let x=(i/n-.5)*span,z=(j/n-.5)*span;vertex(d,[x,-.012-(x*x+z*z)/(R_EARTH*2),z],[0,1,0]);}for(let j=0;j<n;j++)for(let i=0;i<n;i++){let a=j*(n+1)+i;ix.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2)}return r.mesh(d,ix)}
