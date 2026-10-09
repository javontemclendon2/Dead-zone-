/* Dead Zone 0.6.1: original mobile scenery plus CC0 Poly Haven surface scans. */
window.DeadZoneVisuals = (() => {
  'use strict';
  function install(c) {
    const {T,scene,renderer,camera,mats,ground,groundH,houses,cars,loot,infected,
      avatar,fpGun,pickups,containers,doors,grass,trunks,canopy,treePoints,sun,hemiLight}=c;
    const PI=Math.PI;
    let seed=94721;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const r=(a,b)=>a+(b-a)*rand();
    const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8);
    const details=new T.Group();details.name='Optional street detail';scene.add(details);
    const material=(color,options={})=>{const m=new T.MeshStandardMaterial({color,roughness:.9,...options});m.color.convertSRGBToLinear();m.userData.linearPalette=true;return m;};
    const paint=material(0x6c7771),trim=material(0x85867c),soil=material(0x413d30),
      rubber=material(0x222725),paper=material(0xc6bc99,{side:T.DoubleSide}),
      brick=material(0x837060,{map:mats.brick.map}),glass=material(0x172d35,{roughness:.18,metalness:.25}),
      rust=material(0x624a35,{map:mats.rust.map}),lampGlass=material(0xc6c6a1,{emissive:0x806538,emissiveIntensity:.35});
    function mesh(geo,mat,x,y,z,s,parent=scene){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);if(s)o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
    const cube=(x,y,z,w,h,d,m,parent)=>mesh(box,m,x,y,z,[w,h,d],parent);
    function beam(a,b,radius,m,parent){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);
      const o=mesh(new T.CylinderGeometry(radius*.65,radius,d.length(),7),m,0,0,0,null,parent);
      o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
    function label(text,sub,w=5,h=.8,bg='#20352f',fg='#d5cfb5'){
      const cv=document.createElement('canvas');cv.width=512;cv.height=128;
      const g=cv.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,512,128);g.strokeStyle=fg;g.lineWidth=5;g.strokeRect(6,6,500,116);
      g.fillStyle=fg;g.textAlign='center';g.font='bold 44px sans-serif';g.fillText(text,256,61);
      g.font='18px sans-serif';g.fillText(sub,256,98);
      for(let i=0;i<80;i++){g.fillStyle=rand()>.5?'#00000025':'#e5d4b320';g.fillRect(r(0,512),r(0,128),r(2,30),r(1,3));}
      const tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;
      return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tx,roughness:1,side:T.DoubleSide}));
    }
    // Bake real-world texture density into UVs before combining static geometry.
    const scales={road:4,grass:4,plaster:3,brick:1.5,bark:2,concrete:2};
    const names=new Map();
    scene.traverse(o=>{if(o.isMesh&&o.material&&!Array.isArray(o.material)&&o.material.map&&scales[o.material.map.name]){
      const name=o.material.map.name,size=scales[name];names.set(o.material,name);
      if(o.geometry.type==='BoxGeometry'){
        const geo=o.geometry.clone(),uv=geo.attributes.uv,s=o.scale;
        for(let i=0;i<uv.count;i++){const face=Math.floor(i/4),w=face<2?s.z:s.x,h=face<2?s.y:face<4?s.z:s.y;
          uv.setXY(i,uv.getX(i)*w/size,uv.getY(i)*h/size);}
        o.geometry=geo;
      }else if(o===ground){const geo=o.geometry.clone(),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*226/size,uv.getY(i)*226/size);o.geometry=geo;}
      o.material.map.repeat.set(1,1);
    }});
    const loader=new T.TextureLoader(),pending=[];
    const scanFiles={road:'asphalt',grass:'grass',plaster:'plaster',bark:'bark',brick:'brick',concrete:'concrete'};
    for(const [name,file]of Object.entries(scanFiles)){
      const targets=[...names].filter(([,n])=>n===name).map(([m])=>m);
      if(!targets.includes(mats[name]))targets.push(mats[name]);
      const configure=(tx,color)=>{tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());if(color)tx.encoding=T.sRGBEncoding;};
      pending.push(new Promise(resolve=>loader.load('assets/'+file+'.jpg',tx=>{
        configure(tx,true);for(const mat of targets){mat.map=tx;mat.needsUpdate=true;}resolve(true);
      },undefined,()=>resolve(false))));
      if(['road','grass','plaster','bark'].includes(name))pending.push(new Promise(resolve=>loader.load('assets/'+name+'-normal.jpg',tx=>{
        configure(tx,false);for(const mat of targets){mat.normalMap=tx;mat.normalScale=new T.Vector2(.45,.45);mat.needsUpdate=true;}resolve(true);
      },undefined,()=>resolve(false))));
    }
    // Hex palette values are authored in sRGB; convert once for the linear lighting pipeline.
    const authoredMaterials=new Set();
    scene.traverse(o=>{if(o.isMesh&&o.material&&!Array.isArray(o.material))authoredMaterials.add(o.material);});
    for(const m of authoredMaterials)if(m.color&&!m.userData.linearPalette)m.color.convertSRGBToLinear();
    mats.grass.color.set(0xaeb398).convertSRGBToLinear();
    mats.plaster.color.set(0xaba99b).convertSRGBToLinear();
    // A leaf cluster has individually shaded, cut-out leaves, rather than a solid sphere.
    function foliageTexture(grassy=false){
      const cv=document.createElement('canvas');cv.width=cv.height=512;const g=cv.getContext('2d');
      if(grassy){
        for(let i=0;i<110;i++){const x=r(45,470),h=r(65,470),lean=r(-90,90);
          const gr=g.createLinearGradient(0,512,0,512-h);gr.addColorStop(0,'#252c1c');gr.addColorStop(.65,'#71835c');gr.addColorStop(1,'#b2b18a');
          g.fillStyle=gr;g.beginPath();g.moveTo(x,512);g.quadraticCurveTo(x+lean*.4,512-h*.6,x+lean,512-h);g.quadraticCurveTo(x+lean*.45+5,512-h*.55,x+5,512);g.fill();}
      }else{
        g.lineCap='round';g.strokeStyle='#5a5036';g.lineWidth=6;g.beginPath();g.moveTo(240,430);g.lineTo(260,240);g.lineTo(140,85);g.moveTo(255,265);g.lineTo(420,105);g.stroke();
        for(let i=0;i<610;i++){const a=r(0,PI*2),radius=Math.sqrt(rand())*190,x=256+Math.cos(a)*radius,y=242+Math.sin(a)*radius;
          const bright=r(28,58),grad=g.createLinearGradient(x-8,y-8,x+8,y+8);grad.addColorStop(0,`hsl(${r(70,105)},24%,${bright+8}%)`);grad.addColorStop(1,`hsl(90,24%,${bright-12}%)`);
          g.fillStyle=grad;g.beginPath();g.ellipse(x,y,r(4,12),r(3,7),r(0,PI),0,PI*2);g.fill();}
      }
      const tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;return tx;
    }
    scene.remove(grass,trunks,canopy);for(const o of [...scene.children])if(o.userData.oldShrub)scene.remove(o);
    const leafTx=foliageTexture(),leafMat=material(0xc7cbb3,{map:leafTx,alphaTest:.45,side:T.DoubleSide}),
      grassMat=material(0xb0b89b,{map:foliageTexture(true),alphaTest:.45,side:T.DoubleSide});
    // Low emissive fill prevents back-facing foliage from becoming black silhouettes.
    leafMat.emissive.set(0x303323);leafMat.emissiveIntensity=.18;
    const points=treePoints.filter(p=>!houses.some(h=>Math.abs(h.x-p.x)<h.w*.5+4&&Math.abs(h.z-p.z)<h.d*.5+4));
    for(let i=0;i<28;i++){const x=i%2?-r(49,98):r(49,98),z=r(-95,100);points.push({x,z,y:groundH(x,z),s:r(.9,1.55)});}
    const twigs=new T.InstancedMesh(new T.CylinderGeometry(.065,.13,1,7),mats.bark,points.length*7),
      leaves=new T.InstancedMesh(new T.PlaneGeometry(1,1),leafMat,points.length*24),
      stems=new T.InstancedMesh(new T.CylinderGeometry(.13,.28,1,8),mats.bark,points.length);
    const d=new T.Object3D();let ti=0,li=0;
    function instance(o,i,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){d.position.set(x,y,z);d.rotation.set(rx,ry,rz);d.scale.set(sx,sy,sz);d.updateMatrix();o.setMatrixAt(i,d.matrix);}
    points.forEach((p,i)=>{
      const s=p.s,top=7.4*s;
      instance(stems,i,p.x,p.y+top*.45,p.z,s,top*.9,s,0,r(-.2,.2),r(-.035,.035));
      for(let j=0;j<7;j++){const a=j*2.4+i,base=new T.Vector3(p.x,p.y+(2.4+j*.4)*s,p.z),end=new T.Vector3(p.x+Math.cos(a)*2*s,p.y+(4.2+j*.3)*s,p.z+Math.sin(a)*2*s),v=end.clone().sub(base);
        d.position.copy(base.add(end).multiplyScalar(.5));d.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());d.scale.set(s,v.length(),s);d.updateMatrix();twigs.setMatrixAt(ti++,d.matrix);}
      for(let j=0;j<24;j++){const a=j*2.399+i,rad=r(.25,2.7)*s,yy=p.y+(4.5+r(-1.4,2.6))*s;
        instance(leaves,li,p.x+Math.cos(a)*rad,yy,p.z+Math.sin(a)*rad,r(2.1,3.4)*s,r(2,3.4)*s,1,r(-.6,.6),a,r(-.3,.3));
        leaves.setColorAt(li++,new T.Color().setHSL(r(.19,.25),r(.1,.24),r(.58,.79)));}
    });
    for(const o of [twigs,stems,leaves]){o.instanceMatrix.needsUpdate=true;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;scene.add(o);}
    // All foliage uses shared instance buffers; avoid a draw call for each plant.
    const grasses=new T.InstancedMesh(new T.PlaneGeometry(1,1),grassMat,2400);let gi=0;
    while(gi<2400){const x=rand()<.65?(rand()<.5?-1:1)*r(8.2,17):r(-104,104),z=r(-103,104);if(Math.abs(x)<7.4||Math.abs(z-27)<6||houses.some(h=>Math.abs(x-h.x)<h.w*.5+1&&Math.abs(z-h.z)<h.d*.5+1))continue;
      const h=r(.2,.65);instance(grasses,gi,x,groundH(x,z)+h*.35,z,r(.4,.95),h,1,0,r(0,PI*2),0);grasses.setColorAt(gi++,new T.Color().setHSL(.2,.16,r(.55,.87)));}
    grasses.instanceMatrix.needsUpdate=true;grasses.receiveShadow=true;grasses.frustumCulled=false;details.add(grasses);
    const skyUniforms={top:{value:new T.Color(0x587f9b)},horizon:{value:new T.Color(0xd9d5bd)},day:{value:1}};
    const sky=new T.Mesh(new T.SphereGeometry(235,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:skyUniforms,
      vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec3 vDir;uniform vec3 top;uniform vec3 horizon;uniform float day;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 col=mix(horizon,top,pow(h,.48));
          vec2 uv=d.xz/(.15+abs(d.y));float n=noise(uv*1.8)*.6+noise(uv*4.2)*.25+noise(uv*10.)*.15;
          float cloud=smoothstep(.50,.70,n)*smoothstep(.02,.20,h);col=mix(col,vec3(.80,.82,.80),cloud*.65*day);gl_FragColor=vec4(col,1.);}`
    }));sky.frustumCulled=false;sky.renderOrder=-1;scene.add(sky);
    const mountains=new T.Group();scene.add(mountains);
    for(let i=0;i<9;i++){const a=i/9*PI*2,geo=new T.SphereGeometry(1,16,10),p=geo.attributes.position;
      for(let n=0;n<p.count;n++){const k=1+.14*Math.sin(p.getX(n)*9+p.getZ(n)*7);p.setXYZ(n,p.getX(n)*k,p.getY(n)*k,p.getZ(n)*k);}geo.computeVertexNormals();
      mesh(geo,material(0x4b615d),Math.cos(a)*160,-8,Math.sin(a)*160,[r(36,55),r(18,29),r(36,55)],mountains);}
    // Uneven moisture stains and peeling render across broad wall surfaces.
    const grimeCanvas=document.createElement('canvas');grimeCanvas.width=grimeCanvas.height=512;
    const gc=grimeCanvas.getContext('2d');
    for(let i=0;i<95;i++){const x=r(0,512),y=r(220,500),w=r(5,45),h=r(25,180),gr=gc.createLinearGradient(x,y-h,x,y);
      gr.addColorStop(0,'#27352b00');gr.addColorStop(1,'#27352b70');gc.fillStyle=gr;gc.fillRect(x,y-h,w,h);}
    for(let i=0;i<45;i++){gc.strokeStyle='#51453555';gc.lineWidth=r(.5,2);gc.beginPath();const x=r(0,512),y=r(0,512);gc.moveTo(x,y);gc.lineTo(x+r(-20,20),y+r(25,90));gc.stroke();}
    const grimeTex=new T.CanvasTexture(grimeCanvas);grimeTex.encoding=T.sRGBEncoding;
    const grimeMat=material(0xffffff,{map:grimeTex,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
    // Building silhouettes, trims, storefronts, boarded windows, gutters and awnings.
    for(const [i,h]of houses.entries()){
      const {g,w,d:dep,height,yy,face,kind}=h;
      if(kind===0){
        const geometry=new T.BufferGeometry(),v=[-w*.55,0,-dep*.55,w*.55,0,-dep*.55,0,2.0,-dep*.55,
          -w*.55,0,dep*.55,0,2.0,dep*.55,w*.55,0,dep*.55,
          -w*.55,0,-dep*.55,0,2,-dep*.55,0,2,dep*.55,-w*.55,0,-dep*.55,0,2,dep*.55,-w*.55,0,dep*.55,
          w*.55,0,-dep*.55,w*.55,0,dep*.55,0,2,dep*.55,w*.55,0,-dep*.55,0,2,dep*.55,0,2,-dep*.55];
        geometry.setAttribute('position',new T.Float32BufferAttribute(v,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(v.flatMap((_,n)=>n%3===0?[v[n]/3,v[n+2]/3]:[]),2));geometry.computeVertexNormals();
        mesh(geometry,mats.roof,0,yy+height+.26,0,null,g);
        cube(w*.24,yy+height+1.1,-dep*.22,.8,2,.75,brick,g);
      }
      cube(0,yy+.3,face*(dep*.5+.07),w,.35,.18,trim,g);
      cube(0,yy+height-.15,face*(dep*.5+.12),w+.3,.20,.25,trim,g);
      for(const s of [-1,1]){
        const grime=mesh(new T.PlaneGeometry(dep,height-.25),grimeMat,s*(w*.5+.02),yy+height/2,0,null,g);grime.rotation.y=s*PI*.5;grime.castShadow=false;
        cube(s*(w*.5+.09),yy+height/2,face*(dep*.5-.25),.12,height,.16,mats.metal,g);
        for(let j=0;j<2;j++){
          const z=(j-.5)*dep*.44,x=s*(w*.5+.025),win=new T.Group();win.position.set(x,yy+2.2,z);win.rotation.y=s*PI*.5;g.add(win);
          cube(0,0,.01,2.2,1.75,.04,mats.dark,win);cube(0,0,.04,2,1.55,.04,glass,win);
          cube(0,0,.085,.08,1.7,.05,trim,win);cube(0,0,.085,2.1,.08,.05,trim,win);cube(0,-.90,.07,2.3,.12,.25,trim,win);
          if((i+j)%2===0)for(let k=0;k<2;k++){const b=cube(0,k*.5-.25,.13,2.2,.19,.09,mats.wood,win);b.rotation.z=(k?-.10:.16);}
        }
      }
      const sign=label(['ASHWOOD SHELTER','COUNTY CLINIC','JUNCTION SUPPLY','AUTO REPAIR','NO ENTRY','RESIDENTIAL'][i],['SURVIVORS WELCOME','EMERGENCY SERVICES','FOOD • TOOLS • FUEL','SERVICE & RECOVERY','EVACUATION ZONE','ASHWOOD COUNTY'][i],Math.min(w*.7,8),.92);
      sign.position.set(0,yy+height-.95,face*(dep*.5+.2));if(face<0)sign.rotation.y=PI;g.add(sign);
      if(kind!==0){const awn=cube(0,yy+3.1,face*(dep*.5+.7),w*.69,.12,1.5,i===1?mats.red:paint,g);awn.rotation.x=face*.14;
        for(const s of [-1,1])cube(s*w*.32,yy+1.55,face*(dep*.5+1.1),.12,3.1,.12,mats.metal,g);}
      const walkway=cube(h.x,yy-.005,h.z+face*(dep*.5+2.8),3,.06,5,mats.concrete);walkway.castShadow=false;
      // Stains, cracks and missing render give broad walls scale without dense geometry.
      for(let j=0;j<6;j++){const patch=cube(r(-w*.45,w*.45),yy+r(.4,1.1),face*(dep*.5+.035),r(.3,1.8),r(.3,.8),.025,soil,g);patch.castShadow=false;}
    }
    // Body panels, side windows, mirrors and wheel arches improve the existing cars.
    for(const [i,car]of cars.entries()){
      const {g}=car,base=groundH(car.x,car.z);
      for(const s of [-1,1]){
        cube(s*.93,base+1.58,-.32,.06,.56,2.05,glass,g);
        cube(s*1.03,base+.92,-.1,.07,.04,1.8,mats.metal,g);
        cube(s*1.02,base+1.5,.48,.11,.75,.10,mats.metal,g);
        cube(s*1.15,base+1.49,.82,.24,.16,.32,mats.dark,g);
        cube(s*1.105,base+.65,-.95,.015,.36,.42,rust,g);
        for(const z of [-1.32,1.32]){const arch=mesh(new T.TorusGeometry(.48,.06,5,16,PI),mats.dark,s*1.15,base+.47,z,null,g);arch.rotation.y=PI*.5;}
      }
      for(let j=0;j<5;j++)cube(0,base+.68+j*.054,2.18,1.22,.018,.025,mats.metal,g);
      cube(0,base+.45,2.17,2.12,.12,.10,mats.dark,g);
      const plate=label('AW '+(317+i*139),'NORTH CAROLINA',.62,.22,'#b3b5a3','#2b3838');plate.position.set(0,base+.60,2.185);g.add(plate);
    }
    // Scattered abandoned possessions and curb-level detail. No new collision obstacles.
    for(let i=0;i<38;i++){
      const side=i%2?-1:1,x=side*r(7.5,10.4),z=r(-94,96),y=.14;
      const sheet=mesh(new T.PlaneGeometry(r(.1,.4),r(.1,.5)),paper,x,y,z,null,details);sheet.rotation.set(-PI/2,0,r(-PI,PI));sheet.castShadow=false;
      if(i%4===0){const bag=mesh(sphere,rubber,x+.4,.28,z,[.32,.22,.30],details);bag.rotation.y=r(0,PI);}
    }
    for(let i=0;i<6;i++){
      const x=i%2?-11.5:11.5,z=-75+i*30;beam([x,.1,z],[x,6.4,z],.09,mats.metal);
      const arm=beam([x,6.4,z],[x-Math.sign(x)*1.6,6.8,z],.07,mats.metal);
      cube(x-Math.sign(x)*1.6,6.72,z,.6,.18,.42,mats.dark);cube(x-Math.sign(x)*1.6,6.61,z,.48,.035,.30,lampGlass);
      cube(x+Math.sign(x)*.3,.45,z+2,.6,.9,.65,paint);
    }
    const polePairs=[[-12,-45],[12,67],[-12,78],[12,-82]];
    for(let i=0;i<polePairs.length-1;i++){const [x,z]=polePairs[i],[xx,zz]=polePairs[i+1];
      for(const offset of [-.8,.8]){const points=[];for(let j=0;j<=16;j++){const t=j/16;points.push(new T.Vector3(x+offset+(xx-x)*t,10.5-Math.sin(t*PI)*1.9,z+(zz-z)*t));}
        const cable=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x363b32}));scene.add(cable);}
    }
    const junction=label('ASHWOOD JUNCTION','SECTOR 7 • EVACUATION CHECKPOINT',6.8,1.35,'#233b37','#d0cdb4');junction.position.set(7.8,3.4,21);junction.rotation.y=PI;scene.add(junction);
    beam([5,0,21],[5,4.2,21],.09,mats.metal);beam([10.5,0,21],[10.5,4.2,21],.09,mats.metal);
    for(const s of [-1,1])for(let j=0;j<4;j++){const x=s*(1.4+j*.9),z=24+j*.45;
      cube(x,.27,z,.95,.5,.6,material(0x786e55),details);cube(x+.12,.65,z,.9,.24,.56,material(0x72694f),details);}
    // Detailed sleeves and gloved hands in the first-person view.
    for(const weapon of [c.gun,c.sidearmGun]){
      const hand=mesh(sphere,material(0x4b4c3f),.11,-.17,.20,[.10,.16,.13],weapon);hand.rotation.x=-.2;
      beam([.12,-.21,.24],[.33,-.43,.65],.095,mats.cloth,weapon);
      if(weapon===c.gun){mesh(sphere,material(0x4b4c3f),-.06,-.13,-.41,[.13,.07,.16],weapon);beam([-.1,-.16,-.35],[-.27,-.39,.25],.085,mats.cloth,weapon);}
      weapon.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
    }
    for(const supply of loot)if(supply.light)supply.light.visible=false;
    // Each animated limb stays independent; its stationary pieces share material batches.
    function combineLocal(group,excluded=[]){
      const sets=new Map();group.updateMatrixWorld(true);
      for(const o of [...group.children])if(o.isMesh&&!excluded.includes(o)&&!Array.isArray(o.material)&&!o.material.transparent){
        if(!sets.has(o.material))sets.set(o.material,[]);sets.get(o.material).push(o);}
      for(const [mat,meshes]of sets){if(meshes.length<2)continue;const p=[],n=[],u=[];
        for(const o of meshes){o.updateMatrix();const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);
          for(const v of geo.attributes.position.array)p.push(v);for(const v of geo.attributes.normal.array)n.push(v);for(const v of geo.attributes.uv.array)u.push(v);geo.dispose();group.remove(o);}
        const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(u,2));geo.computeBoundingSphere();
        const o=new T.Mesh(geo,mat);o.castShadow=meshes[0].castShadow;o.receiveShadow=meshes[0].receiveShadow;group.add(o);
      }
    }
    for(const rig of [c.soldier,...infected.map(e=>e.rig)]){combineLocal(rig.root,[rig.head]);for(const limb of [...rig.arms,...rig.legs])combineLocal(limb);}
    combineLocal(c.gun);combineLocal(c.sidearmGun);
    // Combine stationary meshes by material; hinged doors and gameplay objects stay independent.
    const animated=new Set([camera,avatar,fpGun,...infected.map(e=>e.g),...loot.map(e=>e.g),...pickups.map(e=>e.g),...containers.map(e=>e.g),...doors.map(e=>e.hinge),...cars.map(e=>e.hatch)]);
    scene.updateMatrixWorld(true);
    const batches=new Map();
    scene.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||!o.geometry.attributes.position||!o.geometry.attributes.normal||!o.geometry.attributes.uv||o===sky)return;
      let parent=o,optional=false;while(parent){if(animated.has(parent))return;if(parent===details)optional=true;parent=parent.parent;}
      const key=o.material.uuid+':'+o.castShadow+':'+optional;
      if(!batches.has(key))batches.set(key,{mat:o.material,shadow:o.castShadow,optional,meshes:[]});batches.get(key).meshes.push(o);
    });
    for(const b of batches.values()){
      if(b.meshes.length<2)continue;
      const positions=[],normals=[],uvs=[];
      for(const o of b.meshes){const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());g.applyMatrix4(o.matrixWorld);
        for(const v of g.attributes.position.array)positions.push(v);for(const v of g.attributes.normal.array)normals.push(v);for(const v of g.attributes.uv.array)uvs.push(v);g.dispose();o.parent.remove(o);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingSphere();
      const o=new T.Mesh(g,b.mat);o.castShadow=b.shadow;o.receiveShadow=true;(b.optional?details:scene).add(o);
    }
    const shadows=new T.Vector3(-38,55,-24);
    sun.shadow.camera.left=sun.shadow.camera.bottom=-48;sun.shadow.camera.right=sun.shadow.camera.top=48;sun.shadow.camera.far=155;sun.shadow.normalBias=.035;
    renderer.toneMappingExposure=1.0;hemiLight.color.set(0xd3e2eb);hemiLight.groundColor.set(0x555142);
    return {
      ready:Promise.all(pending),
      atmosphere(state,daylight){
        const h=(((state.clock%1440)+1440)%1440)/60,warm=Math.max(0,1-Math.abs(h-7)/3)*.45+Math.max(0,1-Math.abs(h-18)/3)*.55;
        skyUniforms.top.value.set(0x111b31).lerp(new T.Color(0x69879b),daylight);
        skyUniforms.horizon.value.set(0x192536).lerp(new T.Color(0xcbd2cb),daylight).lerp(new T.Color(0xe4b78e),warm);
        skyUniforms.day.value=daylight;sky.position.set(state.x,0,state.z);
        scene.fog.color.copy(skyUniforms.horizon.value);scene.fog.density=.0035+.007*(1-daylight);
        hemiLight.intensity=.19+1.25*daylight;sun.intensity=.05+2.15*daylight;sun.color.set(0xf6e8c9).lerp(new T.Color(0xffbe80),warm);
        sun.target.position.set(state.x,0,state.z);sun.position.copy(sun.target.position).add(shadows);
      },
      quality(preset){details.visible=preset!=='low';leaves.castShadow=preset!=='low';leaves.count=preset==='low'?Math.floor(li*.72):li;grasses.count=preset==='high'?2400:1500;}
    };
  }
  function human(T,parent,zombie,mats){
    const root=new T.Group();root.scale.setScalar(.72);parent.add(root);
    const body=zombie?mats.red:mats.cloth,skin=zombie?mats.skinZombie:mats.skin,legsMat=zombie?mats.pants:mats.dark;
    const sphere=new T.SphereGeometry(1,12,8);
    function mesh(g,m,p,s,group=root){const o=new T.Mesh(g,m);o.position.set(...p);o.scale.set(...s);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
    const ell=(m,p,s,group)=>mesh(sphere,m,p,s,group);
    const box=(m,p,s,group)=>mesh(new T.BoxGeometry(1,1,1),m,p,s,group);
    const shape=new T.LatheGeometry([new T.Vector2(.23,0),new T.Vector2(.29,.12),new T.Vector2(.34,.55),new T.Vector2(.30,.78),new T.Vector2(.17,.9)],12);
    mesh(shape,body,[0,1.19,0],[1.1,1,.67]);ell(legsMat,[0,1.17,0],[.34,.18,.23]);
    ell(skin,[0,2.13,0],[.13,.19,.12]);const head=ell(skin,[0,2.43,0],[.23,.30,.235]);
    ell(skin,[0,2.42,.218],[.05,.075,.075]);ell(mats.dark,[0,2.23,.18],[.12,.03,.06]);
    for(const x of [-.09,.09]){ell(mats.black,[x,2.48,.213],[.033,.018,.016]);ell(skin,[x*2.8,2.44,0],[.037,.08,.05]);}
    if(zombie){box(mats.rust,[-.15,1.59,.23],[.11,.25,.018]);box(mats.black,[.14,1.93,.22],[.13,.17,.018]);}
    else{
      ell(mats.dark,[0,2.64,-.02],[.29,.15,.28]);box(mats.dark,[0,1.70,.22],[.53,.66,.11]);
      box(mats.wood,[0,1.67,-.32],[.49,.67,.27]);
      for(const x of [-.18,0,.18])box(mats.rust,[x,1.45,.32],[.15,.25,.09]);
      for(const x of [-.25,.25])box(mats.black,[x,1.89,.21],[.07,.39,.065]);
    }
    const arms=[],legs=[];
    for(const s of [-1,1]){
      const arm=new T.Group();arm.position.set(s*.39,2.01,0);root.add(arm);
      ell(body,[s*.01,-.22,0],[.14,.26,.14],arm);ell(skin,[s*.01,-.44,0],[.10,.10,.10],arm);
      const fore=ell(body,[s*.01,-.63,.055],[.10,.23,.10],arm);fore.rotation.x=-.20;
      ell(zombie?skin:mats.dark,[s*.01,-.84,.11],[.10,.13,.09],arm);arms.push(arm);
      const leg=new T.Group();leg.position.set(s*.18,1.14,0);root.add(leg);
      ell(legsMat,[0,-.23,0],[.16,.31,.18],leg);ell(legsMat,[0,-.62,-.015],[.13,.26,.145],leg);
      ell(mats.black,[0,-.96,.085],[.145,.14,.25],leg);if(!zombie)ell(mats.black,[0,-.47,.13],[.14,.13,.065],leg);legs.push(leg);
    }
    return {root,arms,legs,head};
  }
  function weapon(T,parent,mats){
    const g=new T.Group();parent.add(g);
    const metal=new T.MeshStandardMaterial({color:0x454d50,metalness:.48,roughness:.48}),poly=new T.MeshStandardMaterial({color:0x252c2c,roughness:.74});
    function box(x,y,z,w,h,d,m=metal){const shape=new T.Shape();const b=.018;
      shape.moveTo(-w/2+b,-h/2);shape.lineTo(w/2-b,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+b);
      shape.lineTo(w/2,h/2-b);shape.quadraticCurveTo(w/2,h/2,w/2-b,h/2);shape.lineTo(-w/2+b,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-b);shape.lineTo(-w/2,-h/2+b);shape.quadraticCurveTo(-w/2,-h/2,-w/2+b,-h/2);
      const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:3});geo.translate(0,0,-d/2);const o=new T.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;
    }
    function barrel(x,y,z,r,len,m=metal){const o=new T.Mesh(new T.CylinderGeometry(r,r,len,12),m);o.rotation.x=Math.PI/2;o.position.set(x,y,z);g.add(o);return o;}
    box(0,0,.03,.14,.20,.48);box(0,.045,-.37,.145,.155,.41,poly);
    barrel(0,.045,-.80,.024,.48);barrel(0,.045,-1.02,.035,.10,poly);
    const mag=box(0,-.235,.08,.095,.32,.18,poly);mag.rotation.x=.14;
    const grip=box(0,-.205,.30,.085,.25,.095,poly);grip.rotation.x=-.22;
    box(0,-.015,.60,.12,.14,.40,poly);box(0,-.045,.77,.15,.24,.06,poly);
    for(let i=0;i<10;i++)box(0,.132,-.5+i*.065,.165,.023,.025);
    for(let i=0;i<5;i++){box(.077,.038,-.52+i*.055,.018,.035,.035,poly);box(-.077,.038,-.52+i*.055,.018,.035,.035,poly);}
    box(.084,.033,.15,.025,.055,.15,poly);box(.11,.04,.23,.075,.04,.06);
    box(0,.18,-.045,.10,.035,.16,poly);
    // Hollow optic frame: the view through the sights stays clear.
    box(-.056,.24,-.05,.025,.12,.09,poly);box(.056,.24,-.05,.025,.12,.09,poly);box(0,.30,-.05,.135,.025,.09,poly);
    box(0,.165,-.73,.025,.10,.025,poly);
    box(0,-.125,.24,.095,.022,.14);box(0,-.18,.18,.095,.1,.02);
    return g;
  }
  return {install,human,weapon};
})();
