/* game.js — LUMEN : scène Three.js, banc de poissons (boids), requin (machine à états), audio synthétisé.
   Chargé après vehicle.js ; fauna.js est chargé après ce fichier. */
const T=THREE,$=id=>document.getElementById(id),R=(a,b)=>a+Math.random()*(b-a);
const W={x:60,z:32,y1:42};let GOAL=14;const SRC=new T.Vector3(50,12,0);
const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
function floorY(x,z){return 9+Math.sin(x*.045)*3.2+Math.cos(z*.05+1)*2.8+Math.sin((x+z)*.11)*1.2+Math.sin(x*.013+1)*Math.cos(z*.017)*6+Math.sin(x*.21)*Math.cos(z*.19)*.35}
const rn=new T.WebGLRenderer({antialias:true,canvas:$('c')});rn.setPixelRatio(Math.min(devicePixelRatio,2));
rn.outputEncoding=T.sRGBEncoding;rn.toneMapping=T.ACESFilmicToneMapping;rn.toneMappingExposure=1.15;
const sc=new T.Scene(),FOG=0x053a54;sc.background=new T.Color(FOG);sc.fog=new T.FogExp2(FOG,.016);
const cam=new T.PerspectiveCamera(60,1,.1,400);
sc.add(new T.HemisphereLight(0x8fe0ff,0x0b2a3a,1.0));
const sun=new T.DirectionalLight(0xcff4ff,1.2);const SUN=new T.Vector3(-.3,1,.15).normalize();sun.position.copy(SUN).multiplyScalar(100);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const shc=sun.shadow.camera;shc.left=shc.bottom=-90;shc.right=shc.top=90;shc.near=1;shc.far=260;sun.shadow.bias=-.0006;sc.add(sun,sun.target);rn.shadowMap.enabled=true;rn.shadowMap.type=T.PCFSoftShadowMap;
const swl=new T.PointLight(0x66f0ff,1.6,45);sc.add(swl);
const U={uT:{value:0}};
// ---------- shaders helpers
function swim(m,L,A,F){const uF={value:F};m.userData.uF=uF;m.onBeforeCompile=s=>{s.uniforms.uT=U.uT;s.uniforms.uA={value:A};s.uniforms.uF=uF;s.uniforms.uL={value:L};
s.vertexShader='uniform float uT,uA,uF,uL;attribute float aPhase;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat k=clamp((.3*uL-position.z)/(1.4*uL),0.,1.);k*=k;transformed.x+=sin(uT*uF+aPhase+position.z*3./uL)*uA*k;transformed.y+=sin(uT*uF*.5+aPhase)*uA*.12*k;')}}
function body(L,wid,hei,tailH,cB,cV){const S=16,Rg=10,P=[],C=[],I=[];
for(let i=0;i<=S;i++){const t=i/S;let w,h;if(t<=.72){const s=t/.72,f=Math.max(.14,Math.sin(Math.PI*Math.pow(s,.7)));w=wid*f;h=hei*f}else{const u=(t-.72)/.28;w=wid*.13*(1-.6*u);h=hei*(.14+tailH*u*u)}
for(let j=0;j<Rg;j++){const a=j/Rg*Math.PI*2;let y=Math.sin(a)*h;if(y<0)y*=.8;P.push(Math.cos(a)*w,y,L*(1-2*t));
const k=sm(.3,-.6,Math.sin(a));let c=[cB[0]+(cV[0]-cB[0])*k,cB[1]+(cV[1]-cB[1])*k,cB[2]+(cV[2]-cB[2])*k];
if(i===2&&(j===0||j===Rg/2))c=[.01,.01,.02];if(i===4&&(j===0||j===Rg/2))c=c.map(x=>x*.6);if(t>.8)c=cB.map(x=>x*.9);C.push(...c)}}
for(let i=0;i<S;i++)for(let j=0;j<Rg;j++){const a=i*Rg+j,b=i*Rg+(j+1)%Rg,c=(i+1)*Rg+j,d=(i+1)*Rg+(j+1)%Rg;I.push(a,c,b,b,c,d)}
const fin=(a,b,tx,ty,tz,c)=>{const n=P.length/3;P.push(tx,ty,tz);C.push(...c);I.push(a,b,n)},ix=(i,j)=>i*Rg+j,zz=t=>L*(1-2*t),dc=cB.map(x=>x*.75);
fin(ix(5,2),ix(9,2),0,hei*1.55,zz(.46),dc);fin(ix(5,3),ix(9,3),0,hei*1.55,zz(.46),dc);fin(ix(4,0),ix(7,0),wid*2.1,-hei*.75,zz(.4),dc);fin(ix(4,5),ix(7,5),-wid*2.1,-hei*.75,zz(.4),dc);
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.setIndex(I);g.computeVertexNormals();return g}
function glowTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(120,240,255,.4)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c)}
// ---------- seabed (infini : le maillage suit la caméra, hauteurs calculées en coordonnées monde)
const SEG=128,SZ=256,seaG=new T.PlaneGeometry(SZ,SZ,SEG,SEG);seaG.rotateX(-Math.PI/2);seaG.setAttribute('color',new T.BufferAttribute(new Float32Array(seaG.attributes.position.count*3),3));
const seaM=new T.MeshStandardMaterial({vertexColors:true,roughness:.95});
seaM.onBeforeCompile=s=>{s.uniforms.uT=U.uT;s.vertexShader='varying vec3 vWP;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
s.fragmentShader='uniform float uT;varying vec3 vWP;\n'+s.fragmentShader.replace('#include <dithering_fragment>','gl_FragColor.rgb*=.9+.2*fract(sin(dot(floor(vWP.xz*5.),vec2(12.9898,78.233)))*43758.5453);vec2 p=vWP.xz*.22;float a=sin(p.x*3.+uT*.8+sin(p.y*2.+uT*.5)),b=sin(p.y*3.1-uT*.7+sin(p.x*2.3-uT*.4));float c=pow(1.-abs(a*b),6.);gl_FragColor.rgb+=vec3(.25,.6,.7)*c*.55*clamp(1.-vWP.y/26.,0.,1.);\n#include <dithering_fragment>')};
const seaMesh=new T.Mesh(seaG,seaM);seaMesh.frustumCulled=false;seaMesh.receiveShadow=true;sc.add(seaMesh);let seaX=1e9,seaZ=1e9;
function updSeabed(cx,cz){const gx=Math.round(cx/8)*8,gz=Math.round(cz/8)*8;if(gx===seaX&&gz===seaZ)return;seaX=gx;seaZ=gz;seaMesh.position.set(gx,0,gz);const p=seaG.attributes.position,c=seaG.attributes.color;
for(let i=0;i<p.count;i++){const x=p.getX(i)+gx,z=p.getZ(i)+gz,y=floorY(x,z);p.setY(i,y);const r=sm(11,20,y),n=.9+.1*Math.sin(x*.9)*Math.cos(z*.8)+.05*Math.sin((x*.5+Math.sin(z*.12)*4)*1.3);c.setXYZ(i,(.66*(1-r)+.3*r)*n,(.58*(1-r)+.32*r)*n,(.42*(1-r)+.34*r)*n)}
p.needsUpdate=true;c.needsUpdate=true;seaG.computeVertexNormals()}
// ---------- rochers par « chunks » déterministes autour du joueur (monde sans limite)
const rocks=[],CH=40,cells=new Map(),rmat=new T.MeshStandardMaterial({vertexColors:true,roughness:.92});
const hh=(a,b,c)=>{const h=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return h-Math.floor(h)};
function makeCell(ix,iz){const cell={ms:[],ob:[]},n=hh(ix,iz,1)<.3?0:hh(ix,iz,2)<.55?1:2;
for(let k=0;k<n;k++){const x=(ix+hh(ix,iz,3+k))*CH,z=(iz+hh(ix,iz,6+k))*CH,r=3+hh(ix,iz,9+k)*3.5;if(Math.hypot(x,z)<16||Math.hypot(x-SRC.x,z-SRC.z)<18)continue;
const y=floorY(x,z)+r*.55,ph2=hh(ix,iz,12+k)*9,g=new T.IcosahedronGeometry(1,3),p=g.attributes.position,col=[];
for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i),q=1+.22*Math.sin(v.x*3+ph2)*Math.cos(v.y*3.3+ph2)+.12*Math.sin(v.z*7+ph2);v.multiplyScalar(q);v.y*=1.35;p.setXYZ(i,v.x,v.y,v.z);const l=.35+.25*(v.y+1)/2;col.push(l*.9,l,l*1.05)}
g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();const m=new T.Mesh(g,rmat);m.castShadow=m.receiveShadow=true;m.position.set(x,y,z);m.scale.setScalar(r);sc.add(m);cell.ms.push(m);cell.ob.push({p:new T.Vector3(x,y,z),r:r*1.15})}
return cell}
let chX=1e9,chZ=1e9;
function updChunks(cx,cz,force){const ix=Math.floor(cx/CH),iz=Math.floor(cz/CH);if(!force&&ix===chX&&iz===chZ)return;chX=ix;chZ=iz;
for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++){const k=(ix+a)+','+(iz+b);if(!cells.has(k))cells.set(k,makeCell(ix+a,iz+b))}
for(const [k,c] of cells){const [a,b]=k.split(',').map(Number);if(Math.abs(a-ix)>5||Math.abs(b-iz)>5){c.ms.forEach(m=>{sc.remove(m);m.geometry.dispose()});cells.delete(k)}}
rocks.length=0;for(const c of cells.values())rocks.push(...c.ob)}
function clearCells(){for(const c of cells.values())c.ms.forEach(m=>{sc.remove(m);m.geometry.dispose()});cells.clear()}
// ---------- kelp (réparti par pavage infini autour de la caméra)
const KN=160,kg=new T.CylinderGeometry(.06,.28,1,5,8,true);kg.translate(0,.5,0);const km=new T.MeshStandardMaterial({color:0x2f8a52,emissive:0x0a3a22,roughness:.6,side:T.DoubleSide});
km.onBeforeCompile=s=>{s.uniforms.uT=U.uT;s.vertexShader='uniform float uT;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uT*.9+instanceMatrix[3].x*.3+position.y*3.)*1.3*position.y*position.y;')};
const kim=new T.InstancedMesh(kg,km,KN),kd=new T.Object3D(),kO=[...Array(KN)].map(()=>[R(-110,110),R(-110,110),R(.8,1.6),R(6,16)]);kim.frustumCulled=false;sc.add(kim);let kX=1e9,kZ=1e9;
function updKelp(cx,cz){const gx=Math.round(cx/10)*10,gz=Math.round(cz/10)*10;if(gx===kX&&gz===kZ)return;kX=gx;kZ=gz;
kO.forEach((o,i)=>{const x=o[0]+220*Math.round((gx-o[0])/220),z=o[1]+220*Math.round((gz-o[1])/220);kd.position.set(x,floorY(x,z)-.3,z);kd.scale.set(o[2],o[3],o[2]);kd.updateMatrix();kim.setMatrixAt(i,kd.matrix)});kim.instanceMatrix.needsUpdate=true}
function tiled(geo,mat,N,span,s0,s1,sx,sy,col){const im=new T.InstancedMesh(geo,mat,N),d=new T.Object3D(),O=[...Array(N)].map(()=>[R(-span/2,span/2),R(-span/2,span/2),R(s0,s1),R(0,6.28)]);im.frustumCulled=false;sc.add(im);let g0=1e9,g1=1e9;
if(col)for(let i=0;i<N;i++)im.setColorAt(i,new T.Color(col[i%col.length]));
return (cx,cz)=>{const gx=Math.round(cx/10)*10,gz=Math.round(cz/10)*10;if(gx===g0&&gz===g1)return;g0=gx;g1=gz;
O.forEach((o,i)=>{const x=o[0]+span*Math.round((gx-o[0])/span),z=o[1]+span*Math.round((gz-o[1])/span);d.position.set(x,floorY(x,z)-.1,z);d.rotation.y=o[3];d.scale.set(o[2]*sx,o[2]*sy,o[2]*sx);d.updateMatrix();im.setMatrixAt(i,d.matrix)});im.instanceMatrix.needsUpdate=true}}
const blade=new T.ConeGeometry(.12,1,4,3);blade.translate(0,.5,0);const gm=new T.MeshStandardMaterial({color:0x4a9a4a,roughness:.7,side:T.DoubleSide});
gm.onBeforeCompile=q=>{q.uniforms.uT=U.uT;q.vertexShader='uniform float uT;\n'+q.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uT*1.4+instanceMatrix[3].x*.5+instanceMatrix[3].z*.3)*.5*position.y;')};
const updG=tiled(blade,gm,420,200,.7,1.6,1,2.2),updC=tiled(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0xffffff,roughness:.7,emissive:0x220a10}),140,220,.5,1.5,1,1.3,[0xe0607a,0xf09040,0xb070d0,0xe0c050]);
function worldUpdate(cx,cz,force){updSeabed(cx,cz);updKelp(cx,cz);updG(cx,cz);updC(cx,cz);updChunks(cx,cz,force)}
// ---------- rays, snow, source
const rays=[];for(let i=0;i<18;i++){const m=new T.ShaderMaterial({uniforms:{uT:U.uT,uK:{value:i},uS:{value:SUN}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false,
vertexShader:'varying vec2 vUv;varying vec3 vWP,vN;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vWP=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}',
fragmentShader:'uniform float uT,uK;uniform vec3 uS;varying vec2 vUv;varying vec3 vWP,vN;void main(){vec3 vd=normalize(vWP-cameraPosition);float st=pow(.5+.5*sin(vUv.x*60.+uK*7.+sin(uT*.2+uK)*2.),2.)*.6+pow(.5+.5*sin(vUv.x*19.-uK*3.),3.)*.4;float d=pow(vUv.y,1.6);float fl=.7+.3*sin(uT*.6+uK*5.+vUv.y*6.);float g=.35+.9*pow(max(dot(vd,uS),0.),2.5);float e=pow(abs(dot(normalize(vN),vd)),1.4);gl_FragColor=vec4(.6,.88,1.,st*d*fl*g*e*.11);}'});
const rd=R(3.5,8),r=new T.Mesh(new T.CylinderGeometry(rd,rd*1.15,90,18,1,true),m);r.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),SUN);r.userData.b=R(-110,110);r.userData.z=R(-70,70);sc.add(r);rays.push(r)}
{const n=1500,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=R(-95,95);p[i*3+1]=R(0,45);p[i*3+2]=R(-65,65)}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));
sc.add(new T.Points(g,new T.ShaderMaterial({uniforms:{uT:U.uT},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
vertexShader:'uniform float uT;void main(){vec3 p=position;p.y=mod(p.y-uT*1.2,45.);p.x+=sin(uT*.3+position.z)*1.5;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(110./-mv.z,1.,5.);gl_Position=projectionMatrix*mv;}',
fragmentShader:'void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.8,.95,1.,.5*(1.-d*2.));}'})))}
const snow=sc.children[sc.children.length-1];var pl,pil;
const UF={uC:{value:new T.Color()}};
const surf=new T.Mesh(new T.PlaneGeometry(900,900).rotateX(-Math.PI/2),new T.ShaderMaterial({uniforms:{uT:U.uT,uC:UF.uC},transparent:true,depthWrite:false,side:T.DoubleSide,fog:false,
vertexShader:'varying vec3 vWP;void main(){vec4 w=modelMatrix*vec4(position,1.);vWP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
fragmentShader:'uniform float uT;uniform vec3 uC;varying vec3 vWP;float rip(vec2 p){return sin(p.x*.9+uT*.9+sin(p.y*.7+uT*.6))*sin(p.y*.8-uT*.8+sin(p.x*.6))*.5+.5;}void main(){vec3 vd=normalize(vWP-cameraPosition);float up=abs(vd.y);float c=pow(rip(vWP.xz*.5),3.);vec3 sky=vec3(.55,.85,.95)*(1.+.7*c);vec3 deep=uC*.5+vec3(.04,.1,.12)*c;float w=smoothstep(.62,.7,up);float d=distance(cameraPosition,vWP);float f=exp(-pow(d*.009,2.));gl_FragColor=vec4(mix(deep,sky,w),mix(.55,.95,w)*f);}'}));
surf.position.y=W.y1+6;surf.frustumCulled=false;sc.add(surf);
const fc=new T.Color(),domeU=UF,dome=new T.Mesh(new T.SphereGeometry(380,24,16),new T.ShaderMaterial({uniforms:domeU,side:T.BackSide,depthWrite:false,fog:false,
vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:'uniform vec3 uC;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(uC*.4,uC,smoothstep(-.5,.05,h));c=mix(c,uC*1.3+vec3(.03,.08,.1),smoothstep(0.,.9,h));gl_FragColor=vec4(c,1.);}'}));
dome.renderOrder=-10;dome.frustumCulled=false;sc.add(dome);
const src=new T.Group();{const t=new T.Mesh(new T.TorusGeometry(5,.4,12,48),new T.MeshStandardMaterial({color:0x55ffee,emissive:0x33ffe0,emissiveIntensity:1.6}));src.add(t);
const t2=t.clone();t2.scale.setScalar(.7);t2.rotation.x=1.2;src.add(t2);src.position.copy(SRC);sc.add(src);
pl=new T.PointLight(0x66ffee,2.2,55);pl.position.copy(SRC);sc.add(pl);
pil=new T.Mesh(new T.CylinderGeometry(.5,.5,120,10,1,true),new T.MeshBasicMaterial({fog:false,color:0x66ffee,transparent:true,opacity:.18,blending:T.AdditiveBlending,depthWrite:false}));pil.position.set(SRC.x,SRC.y+8,SRC.z);sc.add(pil)}
const bsp=new T.Sprite(new T.SpriteMaterial({map:glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:.5,depthWrite:false}));bsp.scale.setScalar(3);sc.add(bsp);
// ---------- fish
const NF=40,F=[];
const fg=body(1.2,.34,.4,1.7,[.35,.55,.62],[.9,.95,1]),ph=new Float32Array(NF);for(let i=0;i<NF;i++)ph[i]=R(0,6.28);
fg.setAttribute('aPhase',new T.InstancedBufferAttribute(ph,1));
const fmat=new T.MeshStandardMaterial({vertexColors:true,roughness:.32,metalness:.4,emissive:0x1a8fa5,emissiveIntensity:.28,side:T.DoubleSide});swim(fmat,1.2,.2,10);
const fm=new T.InstancedMesh(fg,fmat,NF);fm.frustumCulled=false;fm.setColorAt(0,new T.Color(1,1,1));sc.add(fm);
const gp=new Float32Array(NF*3),gc=new Float32Array(NF*3),gg=new T.BufferGeometry();gg.setAttribute('position',new T.BufferAttribute(gp,3));gg.setAttribute('aC',new T.BufferAttribute(gc,3));
const glow=new T.Points(gg,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
vertexShader:'attribute vec3 aC;varying vec3 vC;void main(){vC=aC;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(300./-mv.z,2.,64.);gl_Position=projectionMatrix*mv;}',
fragmentShader:'varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC,pow(1.-d,2.)*.4);}'}));glow.frustumCulled=false;sc.add(glow);
// ---------- shark
const sg=body(5.5,1.5,1.5,1.7,[.27,.33,.38],[.92,.94,.94]);sg.setAttribute('aPhase',new T.BufferAttribute(new Float32Array(sg.attributes.position.count),1));
const smat=new T.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.15,side:T.DoubleSide});swim(smat,5.5,.55,4);
const shark=new T.Group(),sb=new T.Mesh(sg,smat);shark.add(sb);sb.castShadow=true;
{const fin=(sx,px,py,pz,rx,rz)=>{const m=new T.Mesh(new T.ConeGeometry(.8,2.6,3),new T.MeshStandardMaterial({color:0x4a5660,roughness:.5,side:T.DoubleSide}));m.scale.x=sx;m.position.set(px,py,pz);m.rotation.set(rx,0,rz);shark.add(m)};
fin(.2,0,1.8,.8,-.4,0);fin(.2,-1.3,-.7,1.4,0,Math.PI/2+.5);fin(.2,1.3,-.7,1.4,0,-(Math.PI/2+.5))}
sc.add(shark);
const SH={p:new T.Vector3(10,16,-18),v:new T.Vector3(.1,0,.05),st:'patrol',t:0,tg:new T.Vector3(),eats:0};
// ---------- state
let beacon=new T.Vector3(),goal=new T.Vector3(),D=0,lost=0,tension=0,shake=0,pulseCd=0,mode='title',cs=new T.Vector3(),cv=new T.Vector3(),nSw=0;
const _a=new T.Vector3(),_b=new T.Vector3(),acc=new T.Vector3(),_s=new T.Vector3(),_al=new T.Vector3(),_co=new T.Vector3(),_t=new T.Vector3();
const lim=(v,m)=>{const l=v.length();if(l>m)v.multiplyScalar(m/l);return v};
function seek(p,v,t,ms,arr){const d=_a.copy(t).sub(p),dist=d.length();let sp=ms;if(arr&&dist<arr)sp=ms*dist/arr;return d.setLength(sp).sub(v)}
function bounds(p,a){const fl=floorY(p.x,p.z)+6;if(p.y<fl)a.y+=(fl-p.y)*.03;if(p.y>W.y1-4)a.y-=(p.y-W.y1+4)*.03}
function rockAvoid(p,v,a,w,pad){for(const r of rocks){_b.copy(p).sub(r.p);const d=_b.length()-r.r;if(d<pad){a.addScaledVector(_b.setLength(.3),w*(1-Math.max(d,0)/pad))}
if(d<.8){p.addScaledVector(_b.setLength(1),.8-d)}}}
const nf=()=>F.filter(f=>f.s===1||f.s===0).length;
// ---------- niveaux : l'océan est infini, la Source est de plus en plus loin
const LV=[
{n:'EAUX CLAIRES',goal:8,dist:130,ang:0,sp:.9,aggr:44,fog:0x0a4a68,fd:.015,t:240,bc:0,ml:0,pu:99,cur:0,b:'DÉFI : atteignez la Source en moins de 4 minutes.'},
{n:'FORÊT DE VARECH',goal:9,dist:200,ang:1.0,sp:1,aggr:48,fog:0x0a5048,fd:.018,t:0,bc:3,ml:0,pu:99,cur:.15,b:'DÉFI : activez 3 balises avant que la Source ne s’ouvre.'},
{n:'BLEU PROFOND',goal:10,dist:280,ang:-1.6,sp:1.1,aggr:52,fog:0x063558,fd:.019,t:0,bc:0,ml:5,pu:99,cur:.25,b:'DÉFI : ne perdez pas plus de 5 Lumens. Courant sur la route.'},
{n:'CANYON ROCHEUX',goal:11,dist:340,ang:2.4,sp:1.15,aggr:56,fog:0x22384a,fd:.021,t:0,bc:2,ml:0,pu:3,cur:.3,b:'DÉFI : 2 balises, et seulement 3 Pulses pour repousser le requin.'},
{n:'ABYSSE',goal:12,dist:420,ang:-.5,sp:1.25,aggr:60,fog:0x041828,fd:.026,t:300,bc:0,ml:8,pu:99,cur:.35,b:'DÉFI : 5 minutes, 8 pertes maximum, dans le noir.'},
{n:'SOURCES CHAUDES',goal:13,dist:500,ang:3.5,sp:1.3,aggr:64,fog:0x32181c,fd:.024,t:360,bc:3,ml:6,pu:4,cur:.4,b:'DÉFI ULTIME : 3 balises, 6 pertes max, 4 Pulses, 6 minutes.'}];
let clk=0,bn=0,pUsed=0,why='',lastCh='';const bcs=[],GT=glowTex();
const curAt=p=>new T.Vector3(Math.sin(p.z*.02+tt*.05+1),0,Math.cos(p.x*.02-tt*.04));
function chalTxt(){const a=[];if(mode!=='play'&&mode!=='pause')return'';if(LVL.t){const r=Math.max(0,LVL.t-Math.floor(clk/60));a.push('⏱ '+Math.floor(r/60)+':'+String(r%60).padStart(2,'0'))}
if(LVL.bc)a.push('◈ Balises '+bn+'/'+LVL.bc);if(LVL.ml)a.push('☠ Pertes '+lost+'/'+LVL.ml);if(LVL.pu<99)a.push('◉ Pulses : '+(LVL.pu-pUsed)+' restants');if(LVL.cur)a.push('≈ Courant '+(LVL.cur>.3?'fort':'modéré'));return a.join('<br>')}
function makeBeacons(){for(const b of bcs)sc.remove(b.g);bcs.length=0;const a=LVL.ang;
for(let i=0;i<LVL.bc;i++){const t=(i+1)/(LVL.bc+1),pr=(i%2?1:-1)*R(12,24),x=SRC.x*t-Math.sin(a)*pr,z=SRC.z*t+Math.cos(a)*pr,y=Math.max(floorY(x,z)+10,16);
const g=new T.Group(),m=new T.MeshStandardMaterial({color:0xffc040,emissive:0xffa010,emissiveIntensity:1.4}),r=new T.Mesh(new T.TorusGeometry(3.5,.3,10,36),m),
pl2=new T.Mesh(new T.CylinderGeometry(.35,.35,70,8,1,true),new T.MeshBasicMaterial({color:0xffc040,transparent:true,opacity:.2,blending:T.AdditiveBlending,depthWrite:false,fog:false})),
sp=new T.Sprite(new T.SpriteMaterial({map:GT,blending:T.AdditiveBlending,transparent:true,opacity:.7,depthWrite:false,color:0xffc040}));sp.scale.setScalar(12);
g.add(r,pl2,sp);g.position.set(x,y,z);sc.add(g);bcs.push({p:g.position,g,m,r,sp,pl:pl2,on:false})}}
let lvl=0,LVL=LV[0];try{lvl=Math.min(LV.length-1,+localStorage.getItem('lumenLv')||0)}catch(e){}
$('go').textContent='Plonger (plongée '+(lvl+1)+')';
function compass(){const c=nSw?cs:beacon,tg=(bcs.find(b=>!b.on)||{p:SRC}).p,dx=tg.x-c.x,dz=tg.z-c.z,fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
$('arr').style.transform='rotate('+(Math.atan2(dx*rx+dz*rz,dx*fx+dz*fz)*57.3)+'deg)';$('dst').textContent=Math.round(Math.hypot(dx,dz))+' m'}
function reset(){LVL=LV[lvl];GOAL=LVL.goal;const a=LVL.ang;lost=0;D=0;$('ln').textContent=lvl+1;$('lname').textContent=LVL.n;
const sx=Math.cos(a)*LVL.dist,sz=Math.sin(a)*LVL.dist;SRC.set(sx,Math.max(14,floorY(sx,sz)+9),sz);src.position.copy(SRC);pl.position.copy(SRC);pil.position.set(SRC.x,SRC.y+40,SRC.z);
sc.fog.color.set(LVL.fog);sc.background.set(LVL.fog);sc.fog.density=LVL.fd;clearCells();worldUpdate(0,0,true);
const y0=Math.max(13,floorY(0,0)+8);SH.p.set(Math.cos(a)*70,y0+4,Math.sin(a)*70+20);SH.st='patrol';SH.t=0;SH.v.set(.1,0,.05);F.length=0;
for(let i=0;i<NF;i++){const w=i>=26,t=R(.12,.95),pr=R(-35,35),px=sx*t-Math.sin(a)*pr,pz=sz*t+Math.cos(a)*pr;
F.push({s:w?0:1,sz:R(.55,.85),pan:0,p:w?new T.Vector3(px,Math.max(R(10,24),floorY(px,pz)+7),pz):new T.Vector3(R(-5,5),y0+R(-2,2),R(-5,5)),v:new T.Vector3(R(-.1,.1),0,R(-.1,.1)),wd:new T.Vector3(R(-1,1),0,R(-1,1)).normalize()})}
beacon.set(0,y0,0);goal.copy(beacon);yaw=Math.atan2(-Math.cos(a),-Math.sin(a));pitch=.3;dist=36;clk=0;bn=0;pUsed=0;why='';makeBeacons()}
// ---------- sim step (60 Hz, dt = 1)
function step(){
cs.set(0,0,0);cv.set(0,0,0);nSw=0;for(const f of F)if(f.s===1){cs.add(f.p);cv.add(f.v);nSw++}if(nSw){cs.divideScalar(nSw);cv.divideScalar(nSw)}
let danger=0;for(const b of bcs)if(!b.on&&nSw&&cs.distanceTo(b.p)<10){b.on=true;bn++;A.deposit()}
for(const f of F){if(f.s>1)continue;acc.set(0,0,0);let ms=.3;const ds=f.p.distanceTo(SH.p);
if(f.s===0){f.wd.x+=R(-.15,.15);f.wd.z+=R(-.15,.15);f.wd.y=0;f.wd.normalize();acc.addScaledVector(f.wd,.1);ms=.17;
 let near=f.p.distanceTo(beacon)<5;if(!near)for(const o of F)if(o.s===1&&o.p.distanceTo(f.p)<5){near=true;break}
 if(near&&nSw){f.s=1;A.adopt()}}
else{acc.addScaledVector(seek(f.p,f.v,beacon,ms,16),1.2);_s.set(0,0,0);_al.set(0,0,0);_co.set(0,0,0);let n=0;
 for(const o of F){if(o===f||o.s!==1)continue;const d=f.p.distanceTo(o.p);if(d<12){n++;_al.add(o.v);_co.add(o.p);if(d<2.6)_s.add(_a.copy(f.p).sub(o.p).divideScalar(d*d+.01))}}
 if(_s.lengthSq()>0)acc.addScaledVector(_s.setLength(.3),1.5);
 if(n){_al.divideScalar(n).sub(f.v);acc.addScaledVector(_al,.7);_co.divideScalar(n).sub(f.p);acc.addScaledVector(_co.setLength(.15),.6)}
 if(ds<34){acc.addScaledVector(_a.copy(f.p).sub(SH.p).setLength(.4),3.5*(1-ds/34));f.pan=Math.min(1,f.pan+.08);ms=.37;danger=Math.max(danger,1-ds/60)}else f.pan=Math.max(0,f.pan-.01);
 if(bn>=LVL.bc&&f.p.distanceTo(SRC)<7.5){f.s=3;D++;A.deposit();continue}}
rockAvoid(f.p,f.v,acc,4,9);bounds(f.p,acc);if(LVL.cur)acc.addScaledVector(curAt(f.p),LVL.cur*.025);f.v.add(lim(acc,.017));lim(f.v,ms);f.p.add(f.v)}
// shark
const s=SH,rf=nSw?cs:beacon;s.t--;let ms=.26,tgt=s.tg;const dc=nSw?s.p.distanceTo(cs):1e9;
if(s.st==='patrol'){if(s.t<=0||s.p.distanceTo(s.tg)<8){s.tg.set(rf.x+R(-70,70),R(12,28),rf.z+R(-70,70));s.t=420}if(nSw&&dc<LVL.aggr){s.st='stalk';s.t=900}}
else if(s.st==='stalk'){ms=.30;tgt=_t.copy(cs).addScaledVector(cv,Math.min(dc/.3,40));if(dc<24){s.st='lunge';s.t=170;s.eats=0}else if(!nSw||dc>88||s.t<=0){s.st='patrol';s.t=0}}
else if(s.st==='lunge'){ms=.47;let bd=1e9;tgt=cs;for(const f of F)if(f.s===1){const d=f.p.distanceTo(s.p);if(d<bd){bd=d;tgt=f.p}}
 if(bd<3.4){for(const f of F)if(f.s===1&&f.p.distanceTo(s.p)<3.4&&s.eats<2){f.s=2;lost++;s.eats++;shake=.7;A.lost()}}
 if(s.t<=0||s.eats>=2||!nSw){s.st='gorge';s.t=420;s.tg.set(cs.x+R(-90,90),R(12,26),cs.z+R(-90,90))}}
else{ms=.17;if(s.t<=0){s.st='patrol';s.t=0}}
if(s.p.distanceTo(rf)>170){const a=R(0,6.28);s.p.set(rf.x+Math.cos(a)*100,R(14,26),rf.z+Math.sin(a)*100);s.v.set(0,0,0)}ms*=LVL.sp;acc.set(0,0,0);acc.copy(seek(s.p,s.v,tgt,ms));rockAvoid(s.p,s.v,acc,3,10);bounds(s.p,acc);s.v.add(lim(acc,.0065));lim(s.v,ms);s.p.add(s.v);
if(s.v.length()>ms)s.v.setLength(ms);
tension+=((s.st==='lunge'?1:s.st==='stalk'?.5:0)*(nSw?1:0)+danger*.4-tension)*.03;
pulseCd=Math.max(0,pulseCd-1);shake*=.93;
if(mode==='play'){clk++;const alive=nf();if(D>=GOAL)finish(true);else if(alive+D<GOAL){why='Le banc est trop réduit pour atteindre l’objectif.';finish(false)}else if(LVL.ml&&lost>LVL.ml){why='Trop de Lumens perdus ('+lost+').';finish(false)}else if(LVL.t&&clk>LVL.t*60){why='Temps écoulé.';finish(false)}}}
function finish(w){if(mode!=='play')return;mode='end';const st=lost<=4?3:lost<=9?2:1;w?A.win():A.lose();
$('et').textContent=w?'PLONGÉE RÉUSSIE':'LE BANC S’EST DISPERSÉ';$('ep').textContent=w?`${D} Lumens ramenés à la Source · ${'★'.repeat(st)}${'☆'.repeat(3-st)} · ${lost} perdus`:(why||'Le banc s’est dispersé.');const fin=w&&lvl===LV.length-1;if(w&&!fin)lvl++;try{localStorage.setItem('lumenLv',lvl)}catch(e){}$('re').textContent=w?(fin?'Rejouer la dernière plongée':'Plongée suivante'):'Réessayer';if(fin)$('et').textContent='OCÉAN CONQUIS';$('end').classList.remove('hid')}
function pulse(){if(mode!=='play'||pulseCd>0||pUsed>=LVL.pu)return;pUsed++;pulseCd=240;A.pulse();const d=SH.p.distanceTo(cs.lengthSq()?cs:beacon);if(d<45){SH.st='gorge';SH.t=260;SH.v.addScaledVector(_a.copy(SH.p).sub(cs).setLength(1),.25);SH.tg.set(cs.x+R(-90,90),R(12,26),cs.z+R(-90,90))}}
// ---------- audio (synth + HRTF spatial shark)
const A={c:null,mute:false,last:{},
initAmb(){if(this.a)return;this.ambOK=false;this.ai=0;const mk=()=>{const a=new Audio('audio/deep-sea-ambience.mp3');a.preload='auto';a.volume=0;a.addEventListener('canplay',()=>{this.ambOK=true});return a};
this.a=[mk(),mk()];const pr=this.a[0].play();if(pr&&pr.catch)pr.catch(()=>{})},
ambTick(){if(!this.a)return;const cl=v=>Math.min(1,Math.max(0,v)),cur=this.a[this.ai],nx=this.a[1-this.ai],d=cur.duration,XF=6;
const tv=this.mute?0:cl((.5+.07*lvl)*(1-.35*tension)*(mode==='end'?.6:mode==='pause'?.3:1));if(this.g1)this.g1.gain.value=this.ambOK?.1:.7;
if(isFinite(d)&&d>XF*3){const t=cur.currentTime;if(t>d-XF){if(nx.paused){nx.currentTime=0;const q=nx.play();if(q&&q.catch)q.catch(()=>{})}const k=cl((t-(d-XF))/XF);cur.volume=cl(tv*(1-k));nx.volume=cl(tv*k);
if(cur.ended||t>=d-.05){cur.pause();cur.currentTime=0;this.ai=1-this.ai}}else{cur.volume=cl(cur.volume+(tv-cur.volume)*.03);nx.volume=0}}else if(!cur.paused)cur.volume=cl(cur.volume+(tv-cur.volume)*.03)},
init(){this.initAmb();if(this.c)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{const c=this.c=new C();this.m=c.createGain();this.m.gain.value=.8;const lf=c.createBiquadFilter();lf.frequency.value=3200;this.m.connect(lf);lf.connect(c.destination);
const nb=(br)=>{const b=c.createBuffer(1,c.sampleRate*3,c.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;if(br){l=(l+.02*w)/1.02;d[i]=l*3.5}else d[i]=w}return b};
this.wb=nb(0);const bb=nb(1),lp=(b)=>{const s=c.createBufferSource();s.buffer=b;s.loop=true;s.start();return s};
const f1=c.createBiquadFilter();f1.frequency.value=380;const g1=c.createGain();g1.gain.value=.7;lp(bb).connect(f1);f1.connect(g1);g1.connect(this.m);this.g1=g1;
const o=c.createOscillator(),og=c.createGain();o.frequency.value=.07;og.gain.value=140;o.connect(og);og.connect(f1.frequency);o.start();
const f2=c.createBiquadFilter();f2.type='bandpass';f2.frequency.value=1100;const g2=c.createGain();g2.gain.value=.05;lp(this.wb).connect(f2);f2.connect(g2);g2.connect(this.m);
this.dr=c.createGain();this.dr.gain.value=0;const ds=c.createOscillator();ds.type='sawtooth';ds.frequency.value=49;const df=c.createBiquadFilter();df.frequency.value=180;ds.connect(df);df.connect(this.dr);this.dr.connect(this.m);ds.start();
this.pn=c.createPanner();this.pn.panningModel='HRTF';this.pn.distanceModel='inverse';this.pn.refDistance=14;this.pn.rolloffFactor=1.5;const sf=c.createBiquadFilter();sf.type='bandpass';sf.frequency.value=95;sf.Q.value=1.2;this.sg=c.createGain();this.sg.gain.value=0;lp(bb).connect(sf);sf.connect(this.sg);this.sg.connect(this.pn);this.pn.connect(this.m);
setInterval(()=>{if(Math.random()<.5)this.tone(R(500,1400),.1,'sine',.04,R(1500,2600))},600);this.nb=0}catch(e){this.c=null}},
tone(f,d,ty,v,sl,dl){if(!this.c)return;const c=this.c,t=c.currentTime+(dl||0),o=c.createOscillator(),g=c.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(sl,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(this.m);o.start(t);o.stop(t+d+.05)},
gap(k,ms){const n=performance.now();if(n-(this.last[k]||0)<ms)return false;this.last[k]=n;return true},
adopt(){if(!this.gap('a',120))return;this.tone(520*(1+R(-.04,.04)),.3,'sine',.16,800);this.tone(800,.35,'sine',.12,1000,.09)},
deposit(){if(!this.gap('d',200))return;[523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.4,'sine',.1,0,i*.07))},
lost(){if(!this.gap('l',250))return;this.tone(190,.6,'sine',.35,55);this.noise(.4,300,.25)},
pulse(){this.noise(.7,200,.35,2200)},win(){[523,659,784,1047,1319,1568].forEach((f,i)=>this.tone(f,.7,'triangle',.14,0,i*.12))},lose(){[392,330,262,196].forEach((f,i)=>this.tone(f,.8,'triangle',.14,0,i*.25))},
noise(d,f0,v,f1){if(!this.c)return;const c=this.c,t=c.currentTime,s=c.createBufferSource();s.buffer=this.wb;const b=c.createBiquadFilter();b.type='bandpass';b.frequency.setValueAtTime(f0,t);if(f1)b.frequency.exponentialRampToValueAtTime(f1,t+d);const g=c.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(b);b.connect(g);g.connect(this.m);s.start(t);s.stop(t+d)},
update(){if(!this.c)return;const c=this.c,t=c.currentTime,L=c.listener,fw=cam.getWorldDirection(_b),p=cam.position;
if(L.positionX){L.positionX.value=p.x;L.positionY.value=p.y;L.positionZ.value=p.z;L.forwardX.value=fw.x;L.forwardY.value=fw.y;L.forwardZ.value=fw.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0}else{L.setPosition(p.x,p.y,p.z);L.setOrientation(fw.x,fw.y,fw.z,0,1,0)}
const q=SH.p;if(this.pn.positionX){this.pn.positionX.value=q.x;this.pn.positionY.value=q.y;this.pn.positionZ.value=q.z}else this.pn.setPosition(q.x,q.y,q.z);
this.sg.gain.setTargetAtTime(mode==='play'?1.6+tension*2:0,t,.3);this.dr.gain.setTargetAtTime(mode==='play'?tension*.09:0,t,.5);
if(mode==='play'&&tension>.12&&t>this.nb){this.tone(55,.14,'sine',.5*tension+.1,40);this.tone(48,.16,'sine',.35*tension+.08,36,.2);this.nb=t+1.2-.7*tension}}};
// ---------- input / camera
let yaw=-Math.PI/2,pitch=.3,dist=36;const K={};let drag=null;
addEventListener('keydown',e=>{K[e.code]=1;if(/Arrow|Space/.test(e.code))e.preventDefault();if(e.code==='Space')pulse();if(e.code==='Escape'||e.code==='KeyP')setPause(mode==='play');if(e.code==='KeyG'&&composer){postOn=!postOn;rn.toneMapping=postOn?T.NoToneMapping:T.ACESFilmicToneMapping}if(e.code==='KeyM'){A.mute=!A.mute;if(A.m)A.m.gain.value=A.mute?0:.8}});
addEventListener('keyup',e=>K[e.code]=0);
const cvs=$('c');cvs.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t:performance.now()};cvs.setPointerCapture(e.pointerId)});
cvs.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.006;pitch=Math.min(1.25,Math.max(.05,pitch+(e.clientY-drag.y)*.005));drag.x=e.clientX;drag.y=e.clientY});
cvs.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<6&&performance.now()-drag.t<350&&mode==='play'){const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)),cam);const o=ray.ray.origin,d=ray.ray.direction;if(Math.abs(d.y)>.01){const t=(goal.y-o.y)/d.y;if(t>0){goal.x=o.x+d.x*t;goal.z=o.z+d.z*t}}}drag=null});
cvs.addEventListener('wheel',e=>{dist=Math.min(75,Math.max(16,dist+e.deltaY*.04));e.preventDefault()},{passive:false});
let postOn=false,composer=null,uwp=null;
const UW={uniforms:{tDiffuse:{value:null},uT:{value:0},uDep:{value:0},uK:{value:0}},
vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:`uniform sampler2D tDiffuse;uniform float uT,uDep,uK;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 c=vUv-.5;float r=dot(c,c);vec2 w=vec2(sin(vUv.y*38.+uT*1.4),cos(vUv.x*31.+uT*1.2))*.0011;vec2 uv=vUv+w+c*r*.012*(1.+uK*3.);
vec3 col=vec3(texture2D(tDiffuse,uv+c*.0035*(r*4.+.2)).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-c*.0035*(r*4.+.2)).b);
col*=vec3(exp(-uDep*1.1),exp(-uDep*.3),exp(-uDep*.1));col*=1.15;col=col*(2.51*col+.03)/(col*(2.43*col+.59)+.14);col=pow(clamp(col,0.,1.),vec3(1./2.2));
col*=1.-.55*smoothstep(.2,.75,r*2.2);col+=(h(vUv*vec2(1731.,1313.)+uT)-.5)*.025;gl_FragColor=vec4(col,1.);}`};
try{composer=new T.EffectComposer(rn);composer.setPixelRatio(Math.min(devicePixelRatio,1.5));composer.addPass(new T.RenderPass(sc,cam));
composer.addPass(new T.UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.38,.55,.92));uwp=new T.ShaderPass(UW);composer.addPass(uwp);postOn=true;rn.toneMapping=T.NoToneMapping}catch(e){composer=null;postOn=false}
function resize(){rn.setSize(innerWidth,innerHeight);if(composer)composer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function setPause(on){if(on&&mode==='play'){mode='pause';$('pn').textContent=LVL.n;$('pl').textContent=lvl+1;$('pause').classList.remove('hid')}else if(!on&&mode==='pause'){mode='play';$('pause').classList.add('hid')}}
$('rs').onclick=()=>setPause(false);$('rt').onclick=()=>{$('pause').classList.add('hid');start()};$('qt').onclick=()=>{$('pause').classList.add('hid');mode='title';reset();$('title').classList.remove('hid')};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
function start(){A.init();$('title').classList.add('hid');$('end').classList.add('hid');reset();camT.set(0,Math.max(13,floorY(0,0)+8),0);mode='play';$('ban').textContent=LVL.b;$('ban').style.opacity=1;setTimeout(()=>{$('ban').style.opacity=0},7000)}
$('go').onclick=start;$('re').onclick=start;reset();
// ---------- loop
const dm=new T.Object3D(),cl=new T.Color();let acct=0,last=performance.now(),tt=0,camT=new T.Vector3(-40,13,0),lastHud='';
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;if(mode!=='pause')tt+=dt;U.uT.value=tt;
if(mode==='play'){const sp=.5,fx=-Math.sin(yaw),fz=-Math.cos(yaw);let mx=(K.ArrowUp||K.KeyW?1:0)-(K.ArrowDown||K.KeyS?1:0),mz=(K.ArrowRight||K.KeyD?1:0)-(K.ArrowLeft||K.KeyA?1:0);
goal.x+=(fx*mx+Math.cos(yaw)*mz)*sp;goal.z+=(fz*mx-Math.sin(yaw)*mz)*sp;goal.y+=((K.KeyE?1:0)-(K.KeyQ?1:0))*sp*.6;
{const c=nSw?cs:beacon,dx=goal.x-c.x,dz=goal.z-c.z,d=Math.hypot(dx,dz);if(d>45){goal.x=c.x+dx/d*45;goal.z=c.z+dz/d*45}}goal.y=Math.min(W.y1-5,Math.max(floorY(goal.x,goal.z)+5,goal.y));beacon.lerp(goal,.12)}
if(mode!=='pause'){acct+=dt*60;let n=0;while(acct>=1&&n<4){step();acct--;n++}if(n>=4)acct=0}
// render fish
let i=0;for(const f of F){if(f.s>1){dm.scale.set(0,0,0);dm.position.set(0,-999,0);gp[i*3+1]=-999;dm.updateMatrix();fm.setMatrixAt(i,dm.matrix);i++;continue}
dm.position.copy(f.p);_a.copy(f.p).add(f.v);dm.lookAt(_a);dm.scale.setScalar(f.sz);dm.updateMatrix();fm.setMatrixAt(i,dm.matrix);
if(f.s===0)cl.setRGB(1.9,1.3,.5);else cl.setRGB(.9+f.pan*.8,1.05-f.pan*.55,1.2-f.pan*.3);fm.setColorAt(i,cl);
gp[i*3]=f.p.x;gp[i*3+1]=f.p.y;gp[i*3+2]=f.p.z;const g=f.s===0?[1,.8,.3]:[.3+f.pan*.7,.9-f.pan*.5,1-f.pan*.2];gc[i*3]=g[0];gc[i*3+1]=g[1];gc[i*3+2]=g[2];i++}
fm.instanceMatrix.needsUpdate=true;fm.instanceColor.needsUpdate=true;gg.attributes.position.needsUpdate=true;gg.attributes.aC.needsUpdate=true;
shark.position.copy(SH.p);_a.copy(SH.p).add(SH.v);shark.lookAt(_a);smat.userData.uF.value=3+SH.v.length()*14;
src.rotation.y=tt*.4;pil.material.opacity=bn>=LVL.bc?.18:.04;for(const b of bcs){b.r.rotation.y=tt*.8;if(b.on&&!b.d){b.d=1;b.m.color.set(0x55ffcc);b.m.emissive.set(0x22ffaa);b.pl.material.color.set(0x55ffcc);b.sp.material.color.set(0x55ffcc)}}src.rotation.x=Math.sin(tt*.3)*.15;bsp.position.copy(beacon);for(const r of rays)r.position.set(camT.x+r.userData.b+Math.sin(tt*.1+r.userData.b)*4-SUN.x*45,W.y1+6-SUN.y*45,camT.z+r.userData.z-SUN.z*45);snow.position.set(camT.x,0,camT.z);surf.position.x=camT.x;surf.position.z=camT.z;
// camera
const ct=nSw?cs:beacon;camT.lerp(ct,.04);worldUpdate(camT.x,camT.z);swl.position.copy(cs.lengthSq()?cs:beacon);
cam.position.set(camT.x+Math.sin(yaw)*Math.cos(pitch)*dist+R(-1,1)*shake,camT.y+Math.sin(pitch)*dist+R(-1,1)*shake,camT.z+Math.cos(yaw)*Math.cos(pitch)*dist);
cam.position.y=Math.min(W.y1+4,Math.max(cam.position.y,floorY(cam.position.x,cam.position.z)+2));cam.position.x+=Math.sin(tt*.6)*.25;cam.position.y+=Math.sin(tt*.8+1)*.2;cam.lookAt(camT);cam.fov+=((mode==='play'&&nSw&&SH.st==='lunge'?68:60)-cam.fov)*.06;cam.updateProjectionMatrix();
if(typeof Fauna!=='undefined'&&mode!=='pause')Fauna.update(dt,tt);A.update();{const df=Math.min(1,Math.max(.35,(cam.position.y+4)/48));fc.set(LVL.fog).multiplyScalar(.55+.45*df);if(postOn)fc.convertSRGBToLinear();sc.fog.color.copy(fc);sc.fog.density=LVL.fd*(1+.06*Math.sin(tt*.2));sc.background.copy(fc);domeU.uC.value.copy(fc);dome.position.copy(cam.position);sun.intensity=.45+.8*df;sun.target.position.copy(camT);sun.position.copy(camT).addScaledVector(SUN,100);sun.target.updateMatrixWorld()}
if(postOn&&composer){uwp.uniforms.uT.value=tt;uwp.uniforms.uDep.value=Math.min(1,Math.max(0,(38-cam.position.y)/45));uwp.uniforms.uK.value+=((SH.st==='lunge'&&nSw?1:0)-uwp.uniforms.uK.value)*.08;composer.render()}else rn.render(sc,cam);compass();{const h2=chalTxt();if(h2!==lastCh){lastCh=h2;$('chal').innerHTML=h2}}A.ambTick();
const h=`${D}|${nf()}|${SH.st}|${lvl}`;if(h!==lastHud){lastHud=h;$('sv').textContent=`${D} / ${nSw}`;$('goal').textContent=`Objectif : déposer ${GOAL} Lumens`;$('bar').firstChild.style.width=Math.min(100,D/GOAL*100)+'%';$('bn').textContent=`Banc : ${nSw} · Perdus : ${lost}`}
const hunt=mode==='play'&&nSw&&(SH.st==='lunge'||(SH.st==='stalk'&&SH.p.distanceTo(cs)<40));$('alert').style.opacity=hunt?(.5+.5*Math.sin(tt*10)):0}
requestAnimationFrame(frame);
