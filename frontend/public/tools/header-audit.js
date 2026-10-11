/* MYB-GRAPHICS-002: deterministic, dependency-free raster header audit.
 * Visual slots are NOT electrical pins. Never use them for wiring.
 * Pure functions can be tested under Node without a browser.
 */
(function(root){
  'use strict';
  const frame={width:180,height:120};
  const digital=[85.55,91.17,96.91,102.77,108.75,114.61,125.51,131.13,136.76,142.38,148.12,153.75,159.38,165];
  // The following are approximate *visual-only* header slots, not canonical electrical contacts.
  // Their placement is for anomaly detection, not pin identity or electrical behavior.
  const power=[95.0,100.7,106.41,112.15,117.9,123.6];
  const analog=[134.0,139.75,145.5,151.25,157.0,162.75];
  const slots=[
    ...digital.map((x,i)=>({group:'DIGITAL',label:'digital-'+i,x,y:8.35,electrical:true})),
    ...power.map((x,i)=>({group:'POWER',label:'power-visual-'+i,x,y:107.96,electrical:i===2||i===3})),
    ...analog.map((x,i)=>({group:'ANALOG IN',label:'analog-visual-'+i,x,y:107.96,electrical:false}))
  ];
  function luminance(data,idx){return (299*data[idx]+587*data[idx+1]+114*data[idx+2])/1000}
  function audit(data,width,height,options={}){
    if(!data||data.length!==width*height*4||width<=0||height<=0)throw Error('Invalid RGBA raster');
    const radius=options.radius??0.65,threshold=options.threshold??48,minimumAlpha=options.minimumAlpha??200;
    if(radius<=0||radius>2||threshold<0||threshold>255)throw Error('Invalid audit parameters');
    const entries=slots.map(slot=>{
      const cx=slot.x*width/frame.width,cy=slot.y*height/frame.height;
      const rx=Math.max(1,radius*width/frame.width),ry=Math.max(1,radius*height/frame.height);
      let total=0,bright=0,transparent=0,peak=0;
      const bad=[];
      for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(height-1,Math.ceil(cy+ry));y++)
        for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(width-1,Math.ceil(cx+rx));x++){
          if(Math.abs(x+.5-cx)>rx||Math.abs(y+.5-cy)>ry)continue;
          const k=(y*width+x)*4;total++;
          if(data[k+3]<minimumAlpha){transparent++;continue}
          const lum=luminance(data,k);peak=Math.max(peak,lum);
          if(lum>threshold){bright++;bad.push([x,y])}
        }
      return {...slot,center:[cx,cy],total,bright,transparent,peak:Math.round(peak),suspect:bright>0,pixels:bad};
    });
    return {width,height,threshold,radius,entries,suspectCount:entries.filter(x=>x.suspect).length,
      suspectPixels:entries.reduce((n,x)=>n+x.bright,0),visualOnlyCount:entries.filter(x=>!x.electrical).length};
  }
  function repair(data,width,height,report,groups=['DIGITAL','POWER','ANALOG IN']){
    if(data.length!==width*height*4||report.width!==width||report.height!==height)throw Error('Raster/report mismatch');
    const copy=new Uint8ClampedArray(data),allowed=new Set(groups);let changed=0;
    for(const slot of report.entries){if(!allowed.has(slot.group))continue;
      for(const [x,y] of slot.pixels){const k=(y*width+x)*4;
        // Never alter transparent pixels or pixels changed since the audit.
        if(copy[k+3]<200||luminance(copy,k)<=report.threshold)continue;
        copy[k]=11;copy[k+1]=12;copy[k+2]=13;changed++;
      }
    }
    return {data:copy,changed};
  }
  root.MYBHeaderAudit=Object.freeze({frame,slots,audit,repair});
  if(typeof module==='object'&&module.exports)module.exports=root.MYBHeaderAudit;
})(typeof globalThis!=='undefined'?globalThis:this);
