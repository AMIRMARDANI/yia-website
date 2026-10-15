(() => {
  const svg = document.getElementById("hospital-scene");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const STORAGE_KEY = "hospital-visual-editor-layout-v1";
  const toggle = document.getElementById("editor-toggle");
  const selectedLabel = document.getElementById("editor-selection");
  const fillPicker = document.getElementById("editor-fill");
  const overlay = document.createElementNS(NS, "g");
  overlay.setAttribute("id", "editor-overlay");
  overlay.setAttribute("pointer-events", "none");
  svg.appendChild(overlay);

  let enabled = false, selected = null, drag = null, layout = readLayout();
  const originalAttrs = new WeakMap();

  function readLayout() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch (_) { return {}; }
  }
  function saveLayout() {
    layout = {};
    document.querySelectorAll("#rooms [data-editor-id]").forEach(node => {
      const values = {};
      if (node.dataset.editorTransform) values.transform = node.dataset.editorTransform;
      if (node.hasAttribute("data-editor-fill")) values.fill = node.getAttribute("data-editor-fill");
      if (node.hasAttribute("data-editor-stroke")) values.stroke = node.getAttribute("data-editor-stroke");
      if (Object.keys(values).length) layout[node.dataset.editorId] = values;
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); }
    catch (_) {}
    selectedLabel.textContent = "Changes saved in this browser.";
  }
  function point(event) {
    const p = svg.createSVGPoint();
    p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function elementFor(target) {
    if (!(target instanceof Element)) return null;
    if (target.closest("#editor-overlay")) return null;
    const room = target.closest(".independent-room");
    if (!room) return null;
    const meaningful = target.closest(".room-object, #pediatric-wall-art, #pediatric-plush-toy");
    if (meaningful && room.contains(meaningful)) return meaningful;
    if (target === room || target.parentElement === room) return room;
    return target;
  }
  function ensureId(node) {
    if (!node.dataset.editorId) node.dataset.editorId = node.id || `editor-${Math.random().toString(36).slice(2,10)}`;
  }
  function baseTransform(node) {
    if (!originalAttrs.has(node)) {
      originalAttrs.set(node, {
        transform: node.dataset.editorTransform || "",
        fill: node.getAttribute("fill"),
        stroke: node.getAttribute("stroke")
      });
    }
    return originalAttrs.get(node);
  }
  function clearOverlay() { overlay.replaceChildren(); }
  function drawSelection() {
    clearOverlay();
    if (!selected || !selected.isConnected) return;
    let b;
    try { b = selected.getBBox(); } catch (_) { return; }
    const box = document.createElementNS(NS, "rect");
    box.setAttribute("x", b.x - 3); box.setAttribute("y", b.y - 3);
    box.setAttribute("width", Math.max(8,b.width + 6)); box.setAttribute("height", Math.max(8,b.height + 6));
    box.setAttribute("rx", "3"); box.setAttribute("fill", "none");
    box.setAttribute("stroke", "#1677d2"); box.setAttribute("stroke-width", "2");
    box.setAttribute("stroke-dasharray", "5 3"); box.setAttribute("vector-effect", "non-scaling-stroke");
    overlay.appendChild(box);
    [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].forEach(([x,y],i)=>{
      const handle=document.createElementNS(NS,"circle");
      handle.setAttribute("cx",x);handle.setAttribute("cy",y);handle.setAttribute("r","6");
      handle.setAttribute("fill","#fff");handle.setAttribute("stroke","#1677d2");handle.setAttribute("stroke-width","2");
      handle.style.pointerEvents = "all"; handle.style.cursor = ["nwse-resize","nesw-resize","nesw-resize","nwse-resize"][i];
      handle.dataset.handle=String(i); overlay.appendChild(handle);
    });
    overlay.setAttribute("pointer-events","none");
  }
  function select(node) {
    selected = node;
    if (node) {
      ensureId(node); baseTransform(node);
      selectedLabel.textContent = `${node.dataset.editorId} selected`;
      const fill = node.getAttribute("fill");
      if (fill && /^#[0-9a-f]{3,8}$/i.test(fill)) fillPicker.value = normalizeColor(fill);
      else fillPicker.value = "#d9f0ec";
    } else selectedLabel.textContent = "Nothing selected";
    drawSelection();
  }
  function normalizeColor(value) {
    if (value.length === 4) return "#" + value.slice(1).split("").map(c=>c+c).join("");
    return value.length === 7 ? value : "#d9f0ec";
  }
  function beginDrag(event, node, resizeIndex=null) {
    const p=point(event), b=node.getBBox();
    drag={node,start:p,b,resizeIndex,oldTransform:node.dataset.editorTransform||"",oldFill:node.getAttribute("fill"),oldStroke:node.getAttribute("stroke")};
    event.preventDefault();
  }
  function applyDrag(event) {
    if (!drag) return;
    const p=point(event), dx=p.x-drag.start.x, dy=p.y-drag.start.y;
    const node=drag.node, b=drag.b;
    let transform;
    if (drag.resizeIndex === null) {
      transform = `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) ${drag.oldTransform}`.trim();
    } else {
      const right = drag.resizeIndex===1 || drag.resizeIndex===3;
      const bottom = drag.resizeIndex>=2;
      const fixedX = right ? b.x : b.x+b.width;
      const fixedY = bottom ? b.y : b.y+b.height;
      const movingX = right ? b.x+b.width+dx : b.x+dx;
      const movingY = bottom ? b.y+b.height+dy : b.y+dy;
      const sx=Math.max(.2,Math.min(4,Math.abs(movingX-fixedX)/Math.max(1,b.width)));
      const sy=Math.max(.2,Math.min(4,Math.abs(movingY-fixedY)/Math.max(1,b.height)));
      const anchorX = right ? b.x : b.x+b.width;
      const anchorY = bottom ? b.y : b.y+b.height;
      transform = `translate(${anchorX*(1-sx)} ${anchorY*(1-sy)}) scale(${sx} ${sy}) ${drag.oldTransform}`.trim();
    }
    node.dataset.editorTransform=transform;
    node.setAttribute("transform",transform);
    drawSelection();
  }
  toggle.addEventListener("click",()=>{
    enabled=!enabled;
    toggle.textContent=enabled?"Disable edit mode":"Enable edit mode";
    toggle.setAttribute("aria-pressed",String(enabled));
    document.body.classList.toggle("visual-edit-mode",enabled);
    if (enabled) {
      const animationToggle=document.getElementById("toggle-animation");
      if (animationToggle && animationToggle.textContent==="Pause animation") animationToggle.click();
      selectedLabel.textContent="Edit mode on — click an object to select it.";
    } else { drag=null; clearOverlay(); selectedLabel.textContent=selected?"Selected: "+selected.dataset.editorId:"Edit mode off"; }
  });
  svg.addEventListener("pointerdown",event=>{
    if (!enabled) return;
    const handle=event.target.closest && event.target.closest("[data-handle]");
    if (handle && selected) { beginDrag(event,selected,Number(handle.dataset.handle)); svg.setPointerCapture?.(event.pointerId); return; }
    const node=elementFor(event.target);
    if (!node) return;
    select(node); beginDrag(event,node,null);
    svg.setPointerCapture?.(event.pointerId);
  });
  svg.addEventListener("pointermove",event=>{ if(enabled && drag) applyDrag(event); });
  function endDrag(){ if(drag){drag=null;} }
  svg.addEventListener("pointerup",endDrag);
  svg.addEventListener("pointercancel",endDrag);
  svg.addEventListener("click",event=>{
    if (!enabled) return;
    if (event.target.closest && event.target.closest("#editor-overlay")) return;
    event.preventDefault(); event.stopImmediatePropagation();
  },true);
  document.getElementById("editor-apply-fill").addEventListener("click",()=>{
    if(!selected) return;
    selected.setAttribute("fill",fillPicker.value);
    selected.setAttribute("data-editor-fill",fillPicker.value);
    drawSelection();
  });
  document.getElementById("editor-smaller").addEventListener("click",()=>scaleSelected(.9));
  document.getElementById("editor-larger").addEventListener("click",()=>scaleSelected(1.1));
  function scaleSelected(factor){
    if(!selected) return;
    const b=selected.getBBox(), cx=b.x+b.width/2, cy=b.y+b.height/2;
    const t=`translate(${cx*(1-factor)} ${cy*(1-factor)}) scale(${factor}) ${selected.dataset.editorTransform||""}`.trim();
    selected.dataset.editorTransform=t;selected.setAttribute("transform",t);drawSelection();
  }
  document.getElementById("editor-reset-item").addEventListener("click",()=>{
    if(!selected) return;
    const original=baseTransform(selected);
    selected.dataset.editorTransform="";
    selected.removeAttribute("transform");
    if(original.fill===null) selected.removeAttribute("fill"); else selected.setAttribute("fill",original.fill);
    selected.removeAttribute("data-editor-fill");selected.removeAttribute("data-editor-stroke");
    drawSelection();
  });
  document.getElementById("editor-save").addEventListener("click",saveLayout);
  function download(name, content, type="text/plain;charset=utf-8"){
    const blob=new Blob([content],{type}), url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function getCurrentLayout(){
    const out={};
    document.querySelectorAll("#rooms [data-editor-id]").forEach(node=>{
      const v={};
      if(node.dataset.editorTransform) v.transform=node.dataset.editorTransform;
      if(node.hasAttribute("data-editor-fill")) v.fill=node.getAttribute("data-editor-fill");
      if(node.hasAttribute("data-editor-stroke")) v.stroke=node.getAttribute("data-editor-stroke");
      if(Object.keys(v).length) out[node.dataset.editorId]=v;
    });
    return out;
  }
  document.getElementById("editor-export-json").addEventListener("click",()=>download("hospital-layout.json",JSON.stringify(getCurrentLayout(),null,2),"application/json"));
  document.getElementById("editor-export-svg").addEventListener("click",()=>{
    const clone=svg.cloneNode(true);clone.querySelector("#editor-overlay")?.remove();
    clone.querySelectorAll(".selected-object").forEach(n=>n.classList.remove("selected-object"));
    const xml=new XMLSerializer().serializeToString(clone);
    download("hospital-edited-scene.svg",'<?xml version="1.0" encoding="UTF-8"?>\n'+xml,"image/svg+xml;charset=utf-8");
  });
  async function exportSource(file, name, layoutObject=false){
    try{
      const response=await fetch(file);
      if(!response.ok) throw new Error("Could not read source");
      let source=await response.text();
      if(layoutObject) source=source.replace("const EXPORTED_LAYOUT = null;",`const EXPORTED_LAYOUT = ${JSON.stringify(getCurrentLayout(),null,2)};`);
      download(name,source);
    }catch(error){
      selectedLabel.textContent="Source export needs Live Server. Use VS Code → Open with Live Server, then try again.";
    }
  }
  document.getElementById("editor-export-js").addEventListener("click",()=>exportSource("script.js","script.js",true));
  document.getElementById("editor-export-css").addEventListener("click",()=>exportSource("style.css","style.css"));
  // Restore saved layout on editor reload; script.js applies transforms for animated groups too.
  if (Object.keys(layout).length) {
    document.querySelectorAll("#rooms [data-editor-id]").forEach(node=>{
      const values=layout[node.dataset.editorId]; if(!values) return;
      if(values.transform){node.dataset.editorTransform=values.transform;node.setAttribute("transform",values.transform);}
      if(values.fill){node.setAttribute("fill",values.fill);node.setAttribute("data-editor-fill",values.fill);}
      if(values.stroke){node.setAttribute("stroke",values.stroke);node.setAttribute("data-editor-stroke",values.stroke);}
    });
  }
})();
