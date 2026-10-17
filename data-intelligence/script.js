(() => {
  const NS = "http://www.w3.org/2000/svg";
  const roomLayer = document.getElementById("rooms");
  const roomButtons = document.getElementById("room-buttons");
  const info = document.getElementById("selection-info");
  const toggleButton = document.getElementById("toggle-animation");
  const resetButton = document.getElementById("reset-scene");
  const roomPositions = [];
  // Three rooms on each main floor, plus one wide shared underground control suite.
  const roomWidth = 292, roomHeight = 228, gap = 8, startX = 157;
  const floorRows = [
    {floor:3, y:177}, {floor:2, y:442}, {floor:1, y:707}
  ];
  floorRows.forEach(row => {
    for (let col = 0; col < 3; col++) {
      const suffix = String.fromCharCode(65 + col);
      roomPositions.push({floor:row.floor, x:startX + col * (roomWidth + gap), y:row.y, label:`Room ${row.floor}${suffix}`, width:roomWidth, height:roomHeight});
    }
  });
  roomPositions.push({floor:"B", x:startX, y:972, label:"Basement Control Suite", width:roomWidth * 3 + gap * 2, height:roomHeight});

  const animated = [];
  let paused = false, raf = 0, last = 0, phase = 0, ecgPhase = 0;

  function el(tag, attrs = {}, parent) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  }
  function txt(parent, x, y, value, attrs = {}) {
    const node = el("text", {x, y, "font-family":"Arial, sans-serif", ...attrs}, parent);
    node.textContent = value;
    return node;
  }
  function makeRoom(config, index) {
    const {floor, x, y, label, width:w} = config;
    const g = el("g", {id:`room-${label.replace(/\s/g,"-")}`, class:"room-hit independent-room", tabindex:"0", role:"button", "aria-label":label}, roomLayer);
    g.dataset.floor = String(floor);
    g.dataset.room = label;
    // Wall, floor, window and room name
    el("rect", {x,y,width:w,height:228,rx:4,fill:"#d9f0ec",stroke:"#72a9a1","stroke-width":3},g);
    el("rect", {x,y:y+194,width:w,height:34,fill:"url(#floor)"},g);
    el("path", {d:`M${x} ${y+194}H${x+w}`,stroke:"#fffaf0","stroke-width":6},g);
    const wx=x+13, wy=y+17;
    el("rect",{x:wx,y:wy,width:80,height:58,rx:3,fill:"#f5fbf9",stroke:"#6b9f99","stroke-width":3},g);
    el("rect",{x:wx+5,y:wy+5,width:70,height:48,fill:"#a9dfe7"},g);
    el("circle",{cx:wx+56,cy:wy+17,r:7,fill:"#fff0b4"},g);
    el("path",{d:`M${wx+5} ${wy+38}Q${wx+24} ${wy+24} ${wx+41} ${wy+39}T${wx+75} ${wy+34}V${wy+53}H${wx+5}Z`,fill:"#82c2a8"},g);
    el("path",{d:`M${wx+40} ${wy+5}V${wy+53}M${wx+5} ${wy+29}H${wx+75}`,stroke:"#f5fbf9","stroke-width":3},g);
    el("rect",{x:x+105,y:y+9,width:112,height:23,rx:11,fill:"#f8fffc",opacity:.96},g);
    txt(g,x+161,y+25,label,{"font-size":12,"font-weight":"bold","text-anchor":"middle",fill:"#4d817b"});
    // wall rail
    el("rect",{x:x+10,y:y+103,width:w-20,height:5,rx:2,fill:"#8ebdb7"},g);
    // cabinet
    el("rect",{x:x+10,y:y+151,width:40,height:39,rx:3,fill:"#f6faf7",stroke:"#8bb1ab","stroke-width":2},g);
    el("path",{d:`M${x+10} ${y+171}H${x+50}`,stroke:"#b4d0ca","stroke-width":2},g);
    el("circle",{cx:x+44,cy:y+161,r:2,fill:"#77a8a2"},g);
    // IV stand
    const iv=el("g",{id:`iv-${index}`},g);
    const ivx=x+65;
    el("path",{d:`M${ivx} ${y+91}V${y+190}M${ivx-13} ${y+91}H${ivx+13}`,stroke:"#7a9f9c","stroke-width":3,"stroke-linecap":"round"},iv);
    el("rect",{x:ivx-10,y:y+95,width:20,height:29,rx:4,fill:"#eef9f7",stroke:"#8bbdb7","stroke-width":2},iv);
    el("path",{d:`M${ivx-5} ${y+111}H${ivx+5}V${y+120}H${ivx-5}Z`,fill:"#a7ded8"},iv);
    // Bed
    const bed=el("g",{id:`bed-${index}`,class:"room-object",tabindex:"0",role:"button","aria-label":`${label} bed`},g);
    const bx=x+92;
    el("ellipse",{cx:bx+100,cy:y+190,rx:93,ry:7,fill:"#a6aaa0",opacity:.22},bed);
    el("path",{d:`M${bx+12} ${y+151}V${y+190}M${bx+190} ${y+151}V${y+190}M${bx} ${y+190}H${bx+202}`,stroke:"#6f9290","stroke-width":5,"stroke-linecap":"round"},bed);
    el("circle",{cx:bx+20,cy:y+198,r:6,fill:"#f7faf7",stroke:"#5f8381","stroke-width":3},bed);
    el("circle",{cx:bx+181,cy:y+198,r:6,fill:"#f7faf7",stroke:"#5f8381","stroke-width":3},bed);
    el("rect",{x:bx,y:y+136,width:202,height:18,rx:7,fill:"#7fa9a5"},bed);
    el("rect",{x:bx+5,y:y+128,width:192,height:13,rx:6,fill:"#fbfcf7",stroke:"#d0e5df","stroke-width":2},bed);
    el("rect",{x:bx+12,y:y+130,width:35,height:19,rx:6,fill:"#c5e4e5",stroke:"#a6ced0","stroke-width":1.5},bed);
    // Patient
    const patient=el("g",{id:`patient-${index}`},bed);
    el("path",{d:`M${bx+52} ${y+145}Q${bx+64} ${y+127} ${bx+87} ${y+136}L${bx+118} ${y+145}Q${bx+127} ${y+150} ${bx+120} ${y+157}H${bx+55}Z`,fill:"#6bb6b7"},patient);
    el("circle",{cx:bx+48,cy:y+137,r:11,fill:"#e9b38e"},patient);
    el("path",{d:`M${bx+38} ${y+134}Q${bx+38} ${y+120} ${bx+50} ${y+122}Q${bx+61} ${y+123} ${bx+60} ${y+135}L${bx+52} ${y+130}L${bx+40} ${y+139}Z`,fill:"#5c514b"},patient);
    el("path",{d:`M${bx+87} ${y+140}Q${bx+99} ${y+151} ${bx+109} ${y+147}`,fill:"none",stroke:"#e9b38e","stroke-width":6,"stroke-linecap":"round"},patient);
    // Monitor at right
    const monitor=el("g",{id:`monitor-${index}`,class:"room-object",tabindex:"0",role:"button","aria-label":`${label} monitor`},g);
    const mx=x+w-52;
    el("path",{d:`M${mx} ${y+76}V${y+108}M${mx-11} ${y+108}H${mx+11}`,stroke:"#648b89","stroke-width":4,"stroke-linecap":"round"},monitor);
    el("rect",{x:mx-30,y:y+38,width:61,height:42,rx:4,fill:"#edf6f4",stroke:"#688e8a","stroke-width":2.5},monitor);
    el("rect",{x:mx-25,y:y+43,width:51,height:32,rx:2,fill:"url(#screen)"},monitor);
    const ecg=el("path",{id:`ecg-${index}`,d:`M${mx-21} ${y+59}h5l4 -8l4 16l5 -12l5 4h5l4 -7l4 12l5 -5h2`,fill:"none",stroke:"#75f0c1","stroke-width":2,"stroke-linejoin":"round","stroke-linecap":"round"},monitor);
    // Doctor in white coat, simplified but separate SVG parts
    const doctor=el("g",{id:`doctor-${index}`,class:"room-object",tabindex:"0",role:"button","aria-label":`${label} doctor`},g);
    const dx=x+w-48;
    el("ellipse",{cx:dx,cy:y+190,rx:21,ry:5,fill:"#aab4aa",opacity:.2},doctor);
    el("path",{d:`M${dx-8} ${y+151}L${dx-11} ${y+180}L${dx-15} ${y+190}M${dx+7} ${y+151}L${dx+11} ${y+180}L${dx+16} ${y+190}`,fill:"none",stroke:"#4b7373","stroke-width":6,"stroke-linecap":"round","stroke-linejoin":"round"},doctor);
    el("path",{d:`M${dx-15} ${y+190}h11 M${dx+10} ${y+190}h11`,stroke:"#fbfffc","stroke-width":5,"stroke-linecap":"round"},doctor);
    el("path",{d:`M${dx-14} ${y+119}L${dx} ${y+115}L${dx+13} ${y+121}L${dx+20} ${y+153}Q${dx} ${y+163} ${dx-21} ${y+153}Z`,fill:"#fbfffc",stroke:"#c4dfd9","stroke-width":2},doctor);
    el("path",{d:`M${dx-11} ${y+125}L${dx-21} ${y+140}L${dx-13} ${y+145}M${dx+11} ${y+125}L${dx+20} ${y+140}L${dx+12} ${y+145}`,fill:"none",stroke:"#e5b28e","stroke-width":5,"stroke-linecap":"round","stroke-linejoin":"round"},doctor);
    el("rect",{x:dx-4,y:y+108,width:8,height:10,rx:3,fill:"#e5b28e"},doctor);
    el("circle",{cx:dx,cy:y+99,r:13,fill:"#edbd99"},doctor);
    el("path",{d:`M${dx-13} ${y+98}Q${dx-13} ${y+84} ${dx} ${y+85}Q${dx+13} ${y+85} ${dx+13} ${y+98}L${dx+7} ${y+93}Q${dx-2} ${y+99} ${dx-12} ${y+96}Z`,fill:"#4e5550"},doctor);
    el("circle",{cx:dx-4,cy:y+100,r:1.4,fill:"#4d514a"},doctor);
    el("circle",{cx:dx+4,cy:y+100,r:1.4,fill:"#4d514a"},doctor);
    el("path",{d:`M${dx-4} ${y+106}q4 3 8 0`,fill:"none",stroke:"#a96f60","stroke-width":1.5,"stroke-linecap":"round"},doctor);
    // Oxygen outlet
    el("rect",{x:x+w-20,y:y+91,width:12,height:22,rx:3,fill:"#f7fbf9",stroke:"#80aaa4","stroke-width":2},g);
    el("circle",{cx:x+w-14,cy:y+99,r:2.5,fill:"#58b9bf"},g);

    // Room 3A is a dedicated radiography room: remove patient-care furniture
    // and build the X-ray equipment as independent editable SVG groups.
    if (label === "Room 3A") {
      [bed, iv, doctor, monitor].forEach(node => node.setAttribute("display", "none"));
      const xray = el("g", {id:"radiography-equipment", class:"room-object", tabindex:"0", role:"button", "aria-label":"Radiography equipment"}, g);
      // Upright detector / wall bucky
      const det = el("g", {id:"xray-detector", "data-editor-id":"xray-detector"}, xray);
      el("rect", {x:x+177,y:y+88,width:42,height:88,rx:4,fill:"#edf3f5",stroke:"#587d8c","stroke-width":3},det);
      el("rect", {x:x+184,y:y+96,width:28,height:65,rx:2,fill:"#c7dbe2",stroke:"#8baab6","stroke-width":1.5},det);
      el("path", {d:`M${x+190} ${y+105}h16 M${x+190} ${y+113}h16 M${x+190} ${y+121}h16`,stroke:"#a0bdc7","stroke-width":2},det);
      el("path", {d:`M${x+198} ${y+176}v12m-15 0h30`,stroke:"#587d8c","stroke-width":4,"stroke-linecap":"round"},det);
      // Floor-mounted tube column and articulated arm
      const tube = el("g", {id:"xray-tube-arm", "data-editor-id":"xray-tube-arm"}, xray);
      el("path", {d:`M${x+113} ${y+85}V${y+185}M${x+101} ${y+185}H${x+125}M${x+113} ${y+94}H${x+148}Q${x+157} ${y+94} ${x+157} ${y+103}V${y+111}`,fill:"none",stroke:"#668b98","stroke-width":7,"stroke-linecap":"round","stroke-linejoin":"round"},tube);
      el("circle", {cx:x+113,cy:y+94,r:7,fill:"#dce9ed",stroke:"#587d8c","stroke-width":2},tube);
      el("rect", {x:x+144,y:y+108,width:27,height:22,rx:5,fill:"#f7fafb",stroke:"#587d8c","stroke-width":2.5},tube);
      el("rect", {x:x+150,y:y+113,width:15,height:12,rx:3,fill:"#d7e5e9"},tube);
      el("path", {d:`M${x+157} ${y+130}v9`,stroke:"#587d8c","stroke-width":3},tube);
      // Compact operator console, no human figure
      const consoleG = el("g", {id:"xray-control-console", "data-editor-id":"xray-control-console"}, xray);
      el("rect", {x:x+29,y:y+142,width:53,height:43,rx:4,fill:"#e7eef1",stroke:"#587d8c","stroke-width":2.5},consoleG);
      el("rect", {x:x+35,y:y+148,width:41,height:18,rx:2,fill:"#304d59"},consoleG);
      el("path", {d:`M${x+39} ${y+157}h7l3 -5l4 9l4 -6h12`,fill:"none",stroke:"#7ce0c0","stroke-width":1.5,"stroke-linecap":"round","stroke-linejoin":"round"},consoleG);
      [0,1,2].forEach(k=>el("circle",{cx:x+40+k*13,cy:y+175,r:3,fill:["#75b9a8","#e8c66d","#8eb7d1"][k],stroke:"#7898a1","stroke-width":.8},consoleG));
      // Radiation warning symbol
      const warning = el("g", {id:"radiation-warning", "data-editor-id":"radiation-warning"}, g);
      el("circle", {cx:x+145,cy:y+158,r:12,fill:"#f7d66b",stroke:"#8b7132","stroke-width":1.5},warning);
      el("circle", {cx:x+145,cy:y+158,r:3,fill:"#8b7132"},warning);
      [0,120,240].forEach(a=>el("path",{d:`M${x+145} ${y+158-4} L${x+145-3} ${y+158-10} A7 7 0 0 1 ${x+145+3} ${y+158-10} Z`,fill:"#8b7132",transform:`rotate(${a} ${x+145} ${y+158})`},warning));
    }

    // Room 3B is a blood laboratory with independent SVG equipment and no people.
    if (label === "Room 3B") {
      [bed, iv, doctor, monitor].forEach(node => node.setAttribute("display", "none"));
      const lab = el("g", {id:"blood-laboratory-equipment", class:"room-object", tabindex:"0", role:"button", "aria-label":"Blood laboratory equipment"}, g);
      // Workbench and drawers
      const bench = el("g", {id:"blood-lab-workbench", "data-editor-id":"blood-lab-workbench"}, lab);
      el("rect", {x:x+57,y:y+151,width:218,height:14,rx:3,fill:"#eaf2ee",stroke:"#648f80","stroke-width":2.5},bench);
      el("rect", {x:x+66,y:y+165,width:9,height:25,fill:"#b6d0c3",stroke:"#648f80","stroke-width":1.5},bench);
      el("rect", {x:x+257,y:y+165,width:9,height:25,fill:"#b6d0c3",stroke:"#648f80","stroke-width":1.5},bench);
      el("path", {d:`M${x+79} ${y+176}h42 M${x+79} ${y+183}h42 M${x+198} ${y+176}h43 M${x+198} ${y+183}h43`,stroke:"#8bb4a2","stroke-width":1.5},bench);
      // Hematology analyzer
      const analyzer = el("g", {id:"hematology-analyzer", "data-editor-id":"hematology-analyzer"}, lab);
      el("rect", {x:x+81,y:y+104,width:65,height:45,rx:5,fill:"#f4f8f5",stroke:"#587e70","stroke-width":2.5},analyzer);
      el("path", {d:`M${x+88} ${y+111}h51v13h-51z`,fill:"#d5e9e0",stroke:"#8fb7a5","stroke-width":1.2},analyzer);
      el("rect", {x:x+91,y:y+114,width:31,height:7,rx:1,fill:"#385c50"},analyzer);
      el("path", {d:`M${x+95} ${y+118}h5l3 -3l4 5l4 -3h7`,fill:"none",stroke:"#85efbf","stroke-width":1.3},analyzer);
      el("rect", {x:x+126,y:y+112,width:7,height:9,rx:1,fill:"#a8d3c1"},analyzer);
      el("rect", {x:x+91,y:y+130,width:20,height:12,rx:2,fill:"#d7e5df",stroke:"#8fb7a5","stroke-width":1},analyzer);
      el("circle", {cx:x+128,cy:y+136,r:3,fill:"#6bb89b"},analyzer);
      // Centrifuge
      const centrifuge = el("g", {id:"blood-sample-centrifuge", "data-editor-id":"blood-sample-centrifuge"}, lab);
      el("rect", {x:x+155,y:y+119,width:42,height:30,rx:5,fill:"#e5efeb",stroke:"#648f80","stroke-width":2.2},centrifuge);
      el("path", {d:`M${x+160} ${y+120}Q${x+176} ${y+101} ${x+192} ${y+120}Z`,fill:"#f8fbf9",stroke:"#648f80","stroke-width":2},centrifuge);
      el("circle", {cx:x+176,cy:y+119,r:8,fill:"#c3dcd0",stroke:"#648f80","stroke-width":1.5},centrifuge);
      el("circle", {cx:x+176,cy:y+119,r:3,fill:"#6ba88f"},centrifuge);
      el("rect", {x:x+184,y:y+132,width:8,height:5,rx:1,fill:"#86bda5"},centrifuge);
      // Microscope
      const microscope = el("g", {id:"lab-microscope", "data-editor-id":"lab-microscope"}, lab);
      el("path", {d:`M${x+211} ${y+111}l9 -8l8 8l-7 7l-4 -4l-4 5 M${x+218} ${y+119}l-7 11q-3 7 5 9h14 M${x+212} ${y+140}h22 M${x+223} ${y+130}v10`,fill:"none",stroke:"#557d70","stroke-width":5,"stroke-linecap":"round","stroke-linejoin":"round"},microscope);
      el("path", {d:`M${x+209} ${y+132}h17`,stroke:"#9bc4b2","stroke-width":3,"stroke-linecap":"round"},microscope);
      // Rack of blood collection tubes (red / purple / blue caps)
      const rack = el("g", {id:"blood-collection-tube-rack", "data-editor-id":"blood-collection-tube-rack"}, lab);
      el("rect", {x:x+20,y:y+135,width:37,height:14,rx:2,fill:"#d8e7df",stroke:"#648f80","stroke-width":1.5},rack);
      [0,1,2,3].forEach(k=>{
        const tx=x+24+k*8;
        el("rect", {x:tx,y:y+115,width:6,height:25,rx:2,fill:["#f4d8d8","#e6dff1","#d9e9f8","#f4d8d8"][k],stroke:"#8aa99b","stroke-width":1},rack);
        el("rect", {x:tx-1,y:y+112,width:8,height:5,rx:1,fill:["#c85c5c","#9477c1","#5e9bd2","#c85c5c"][k]},rack);
        el("path", {d:`M${tx+1} ${y+128}v7`,stroke:"#bd6b70","stroke-width":1.5},rack);
      });
      // Small biohazard / specimen label
      el("rect", {x:x+20,y:y+83,width:48,height:21,rx:4,fill:"#f7fbf8",stroke:"#78a38f","stroke-width":1.5},lab);
      txt(lab,x+44,y+97,"BLOOD",{"font-size":8,"font-weight":"bold","text-anchor":"middle",fill:"#487762"});
    }

    // Room 2A becomes a people-free operating theatre with independent SVG equipment.
    if (label === "Room 2A") {
      [bed, iv, doctor, patient, monitor].forEach(node => node.setAttribute("display", "none"));
      const or = el("g", {id:"operating-theatre-equipment", class:"room-object", tabindex:"0", role:"button", "aria-label":"Operating theatre equipment"}, g);
      // Adjustable operating table with padded segmented top.
      const table = el("g", {id:"operating-table", "data-editor-id":"operating-table"}, or);
      el("ellipse", {cx:x+172,cy:y+190,rx:91,ry:6,fill:"#8c9d9a",opacity:.2}, table);
      el("path", {d:`M${x+166} ${y+145}V${y+184}M${x+151} ${y+184}H${x+181}M${x+137} ${y+184}H${x+195}`,stroke:"#647e84","stroke-width":5,"stroke-linecap":"round"}, table);
      el("rect", {x:x+91,y:y+132,width:162,height:17,rx:5,fill:"#7fabb3",stroke:"#527b84","stroke-width":2.5}, table);
      el("rect", {x:x+96,y:y+126,width:55,height:10,rx:4,fill:"#e8f1f2",stroke:"#9cbcc1","stroke-width":1.5}, table);
      el("rect", {x:x+154,y:y+126,width:47,height:10,rx:3,fill:"#f5f8f8",stroke:"#9cbcc1","stroke-width":1.5}, table);
      el("rect", {x:x+204,y:y+126,width:43,height:10,rx:3,fill:"#e8f1f2",stroke:"#9cbcc1","stroke-width":1.5}, table);
      // Ceiling-mounted surgical light and articulated arm.
      const light = el("g", {id:"surgical-ceiling-light", "data-editor-id":"surgical-ceiling-light"}, or);
      el("path", {d:`M${x+158} ${y+38}V${y+53}L${x+193} ${y+68}L${x+193} ${y+82}`,fill:"none",stroke:"#66868d","stroke-width":5,"stroke-linecap":"round","stroke-linejoin":"round"}, light);
      el("circle", {cx:x+193,cy:y+84,r:17,fill:"#edf5f5",stroke:"#5f8188","stroke-width":2.5}, light);
      el("circle", {cx:x+193,cy:y+84,r:10,fill:"#f8e9a6",stroke:"#d0bd72","stroke-width":1.5}, light);
      [0,60,120,180,240,300].forEach(a=>el("circle",{cx:x+193+7*Math.cos(a*Math.PI/180),cy:y+84+7*Math.sin(a*Math.PI/180),r:1.6,fill:"#d6bd66"},light));
      // Anesthesia machine with breathing circuit.
      const anesthesia = el("g", {id:"anesthesia-machine", "data-editor-id":"anesthesia-machine"}, or);
      el("rect", {x:x+25,y:y+121,width:42,height:57,rx:4,fill:"#eaf1f2",stroke:"#5c7f86","stroke-width":2.5},anesthesia);
      el("rect", {x:x+31,y:y+128,width:30,height:17,rx:2,fill:"#294a55"},anesthesia);
      el("path", {d:`M${x+34} ${y+136}h5l3 -4l4 7l4 -5h8`,fill:"none",stroke:"#7be1bd","stroke-width":1.5,"stroke-linecap":"round"},anesthesia);
      el("rect", {x:x+31,y:y+151,width:11,height:18,rx:3,fill:"#d4e8eb",stroke:"#7da2a8","stroke-width":1.2},anesthesia);
      el("rect", {x:x+47,y:y+151,width:11,height:18,rx:3,fill:"#d4e8eb",stroke:"#7da2a8","stroke-width":1.2},anesthesia);
      el("path", {d:`M${x+47} ${y+121}C${x+48} ${y+104} ${x+69} ${y+103} ${x+73} ${y+116}L${x+73} ${y+130}`,fill:"none",stroke:"#78aeb0","stroke-width":3,"stroke-linecap":"round"},anesthesia);
      el("circle", {cx:x+73,cy:y+132,r:4,fill:"#d7e9e9",stroke:"#5c7f86","stroke-width":1.5},anesthesia);
      el("path", {d:`M${x+29} ${y+178}h34M${x+34} ${y+178}v8M${x+58} ${y+178}v8`,stroke:"#5c7f86","stroke-width":3,"stroke-linecap":"round"},anesthesia);
      el("circle", {cx:x+34,cy:y+188,r:4,fill:"#f5f8f8",stroke:"#5c7f86","stroke-width":1.5},anesthesia);
      el("circle", {cx:x+58,cy:y+188,r:4,fill:"#f5f8f8",stroke:"#5c7f86","stroke-width":1.5},anesthesia);
      // Instrument trolley and neatly arranged sterile tools.
      const trolley = el("g", {id:"surgical-instrument-trolley", "data-editor-id":"surgical-instrument-trolley"}, or);
      el("rect", {x:x+213,y:y+151,width:57,height:7,rx:2,fill:"#e8f0f1",stroke:"#6d9298","stroke-width":2},trolley);
      el("path", {d:`M${x+220} ${y+158}v27M${x+263} ${y+158}v27M${x+216} ${y+185}h51`,stroke:"#6d9298","stroke-width":3,"stroke-linecap":"round"},trolley);
      el("circle", {cx:x+221,cy:y+188,r:3.5,fill:"#f8fbfb",stroke:"#6d9298","stroke-width":1.5},trolley);
      el("circle", {cx:x+262,cy:y+188,r:3.5,fill:"#f8fbfb",stroke:"#6d9298","stroke-width":1.5},trolley);
      [0,1,2,3].forEach(k=>el("path",{d:`M${x+221+k*12} ${y+148}l3 -12l3 12`,fill:"none",stroke:["#8aaab0","#8aaab0","#8aaab0","#8aaab0"][k],"stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"},trolley));
      // Separate surgical monitor with a green vital trace.
      const surgicalMonitor = el("g", {id:"surgical-vital-monitor", "data-editor-id":"surgical-vital-monitor"}, or);
      el("rect", {x:x+218,y:y+45,width:48,height:37,rx:4,fill:"#e8f0f1",stroke:"#5d7f86","stroke-width":2.2},surgicalMonitor);
      el("rect", {x:x+223,y:y+50,width:38,height:26,rx:2,fill:"#294a55"},surgicalMonitor);
      el("path", {d:`M${x+226} ${y+63}h6l3 -6l4 12l4 -9l4 3h10`,fill:"none",stroke:"#7be1bd","stroke-width":1.6,"stroke-linecap":"round","stroke-linejoin":"round"},surgicalMonitor);
      el("path", {d:`M${x+242} ${y+82}v8m-11 0h22`,stroke:"#5d7f86","stroke-width":3,"stroke-linecap":"round"},surgicalMonitor);
      // Surgical cross wall sign.
      const sign = el("g", {id:"operating-theatre-sign", "data-editor-id":"operating-theatre-sign"}, or);
      el("rect", {x:x+111,y:y+43,width:29,height:29,rx:5,fill:"#f3fbf8",stroke:"#7da9a0","stroke-width":1.5},sign);
      el("path", {d:`M${x+123} ${y+49}h5v7h7v5h-7v7h-5v-7h-7v-5h7Z`,fill:"#3d9a80"},sign);
    }

    // Basement: dedicated monitor/control rooms. All people and patient furniture are hidden.
    if (label.startsWith("Basement")) {
      [bed, iv, doctor, patient, monitor].forEach(node => node.setAttribute("display", "none"));
      // Give the basement a visibly subterranean look: concrete walls, darker floor,
      // no outdoor window, and a high-contrast B1 label.
      const roomBase = g.children[0];
      if (roomBase) { roomBase.setAttribute("fill", "#c4d0d8"); roomBase.setAttribute("stroke", "#344b5c"); roomBase.setAttribute("stroke-width", "4"); }
      const basementFloor = g.children[1];
      if (basementFloor) basementFloor.setAttribute("fill", "#8797a3");
      if (g.children[2]) g.children[2].setAttribute("stroke", "#526979");
      [g.children[3],g.children[4],g.children[5],g.children[6],g.children[7]].forEach(node => { if (node) node.setAttribute("display", "none"); });
      // Concrete utility conduit along the wall.
      el("rect", {x:x+12,y:y+39,width:w-24,height:5,rx:2,fill:"#8295a2",stroke:"#607583","stroke-width":.8}, g);
      el("rect", {x:x+12,y:y+8,width:83,height:19,rx:3,fill:"#263f50",stroke:"#d5e1e7","stroke-width":1}, g);
      txt(g,x+53.5,y+21,"B1 • BELOW GROUND",{"font-size":8,"font-weight":"bold","text-anchor":"middle",fill:"#ffffff","letter-spacing":.3});
      // Hide the standard room cabinet and oxygen outlet for a clean control-suite layout.
      const defaultCabinet = Array.from(g.children).find(n => n.tagName.toLowerCase()==="rect" && n.getAttribute("x")===String(x+10) && n.getAttribute("y")===String(y+151));
      if (defaultCabinet) defaultCabinet.setAttribute("display", "none");
      const monitorWall = el("g", {id:`${label.toLowerCase().replace(/\s/g,"-")}-monitor-wall`, class:"room-object", tabindex:"0", role:"button", "aria-label":`${label} monitor wall`, "data-editor-id":`${label.toLowerCase().replace(/\s/g,"-")}-monitor-wall`}, g);
      const positions = [x+105, x+275, x+445, x+615, x+785];
      positions.forEach((mx, k) => {
        const mg = el("g", {id:`${label.toLowerCase().replace(/\s/g,"-")}-display-${k+1}`, "data-editor-id":`${label.toLowerCase().replace(/\s/g,"-")}-display-${k+1}`}, monitorWall);
        el("rect", {x:mx-28,y:y+48,width:56,height:43,rx:4,fill:"#dce9ed",stroke:"#587c8b","stroke-width":2.3},mg);
        el("rect", {x:mx-23,y:y+53,width:46,height:32,rx:2,fill:"#172d43",stroke:"#7294a3","stroke-width":1},mg);
        el("path", {d:`M${mx-19} ${y+69}h6l4 -7l4 14l4 -10l4 4h5l4 -6l4 9h3`,fill:"none",stroke:["#73f0c2","#72d9f5","#b8f078"][k],"stroke-width":1.8,"stroke-linecap":"round","stroke-linejoin":"round"},mg);
        el("circle", {cx:mx,cy:y+97,r:2.5,fill:"#73c9b4"},mg);
        el("path", {d:`M${mx} ${y+91}v5m-10 0h20`,stroke:"#78949d","stroke-width":2.5,"stroke-linecap":"round"},mg);
      });
      // Small server/control console below the displays.
      const consoleGroup = el("g", {id:`${label.toLowerCase().replace(/\s/g,"-")}-control-console`, class:"room-object", tabindex:"0", role:"button", "aria-label":`${label} control console`, "data-editor-id":`${label.toLowerCase().replace(/\s/g,"-")}-control-console`}, g);
      el("rect", {x:x+55,y:y+132,width:w-110,height:43,rx:5,fill:"#d9e6e8",stroke:"#78959d","stroke-width":2},consoleGroup);
      [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].forEach(k=>el("rect",{x:x+72+k*31,y:y+141,width:21,height:12,rx:2,fill:["#28465a","#29485d","#315267"][k%3],stroke:"#8ba9b0","stroke-width":.7},consoleGroup));
      [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].forEach(k=>el("circle",{cx:x+85+k*41,cy:y+162,r:2.7,fill:["#7ce5b8","#74d6f2","#f4d17b"][k%3]},consoleGroup));
      if (label === "Basement Control Suite") {
        // A friendly autonomous service robot in the middle room, built from separate SVG groups.
        const robot = el("g", {id:"basement-central-robot", class:"room-object", tabindex:"0", role:"button", "aria-label":"Basement central robot", "data-editor-id":"basement-central-robot"}, g);
        const rx = x + w/2;
        el("ellipse", {cx:rx,cy:y+202,rx:43,ry:6,fill:"#687f8b",opacity:.25},robot);
        el("rect", {x:rx-39,y:y+151,width:78,height:43,rx:13,fill:"#eaf3f5",stroke:"#688d9b","stroke-width":2.5},robot);
        el("rect", {x:rx-30,y:y+159,width:60,height:22,rx:7,fill:"#19364c",stroke:"#7eb4c1","stroke-width":1.5},robot);
        el("circle", {cx:rx-15,cy:y+170,r:3.5,fill:"#79f0c5"},robot);
        el("circle", {cx:rx+15,cy:y+170,r:3.5,fill:"#79dff2"},robot);
        el("path", {d:`M${rx-12} ${y+176}q12 6 24 0`,fill:"none",stroke:"#b2f4e3","stroke-width":1.8,"stroke-linecap":"round"},robot);
        el("rect", {x:rx-22,y:y+136,width:44,height:18,rx:7,fill:"#f4f8f8",stroke:"#688d9b","stroke-width":2.2},robot);
        el("circle", {cx:rx-10,cy:y+145,r:2.6,fill:"#71dcb9"},robot);
        el("circle", {cx:rx+10,cy:y+145,r:2.6,fill:"#71d9f1"},robot);
        el("path", {d:`M${rx-39} ${y+164}l-12 9v11m90 -20l12 9v11`,fill:"none",stroke:"#688d9b","stroke-width":4,"stroke-linecap":"round","stroke-linejoin":"round"},robot);
        el("circle", {cx:rx-25,cy:y+195,r:7,fill:"#536f7d",stroke:"#dce9ec","stroke-width":2},robot);
        el("circle", {cx:rx+25,cy:y+195,r:7,fill:"#536f7d",stroke:"#dce9ec","stroke-width":2},robot);
        txt(robot,rx,y+124,"AI ROBOT",{"font-size":10,"font-weight":"bold","text-anchor":"middle",fill:"#466d7c","letter-spacing":".8"});
      }
    }

    // Room 3C is a Central Sterile Services Department (CSSD): no patient bed or people.
    if (label === "Room 3C") {
      g.classList.add("cssd-room");
      bed.setAttribute("display", "none");
      doctor.setAttribute("display", "none");
      const cssd = el("g", {id:"cssd-equipment", class:"room-object", tabindex:"0", role:"button", "aria-label":"CSSD sterilization equipment"}, g);
      // Stainless work counter
      el("rect", {x:x+18,y:y+139,width:w-36,height:24,rx:3,fill:"#b8c9c7",stroke:"#688c8b","stroke-width":2}, cssd);
      el("path", {d:`M${x+28} ${y+164}v18 M${x+w-28} ${y+164}v18`,stroke:"#688c8b","stroke-width":4,"stroke-linecap":"round"}, cssd);
      // Two large autoclave sterilizers
      [0,1].forEach(k=>{
        const ax=x+28+k*83;
        el("rect", {x:ax,y:y+54,width:68,height:82,rx:7,fill:"#e7f0ef",stroke:"#527f80","stroke-width":2.5}, cssd);
        el("rect", {x:ax+7,y:y+62,width:54,height:48,rx:22,fill:"#c8ddda",stroke:"#7ea5a2","stroke-width":2}, cssd);
        el("circle", {cx:ax+34,cy:y+86,r:17,fill:"#eaf5f3",stroke:"#739b99","stroke-width":2}, cssd);
        el("circle", {cx:ax+34,cy:y+86,r:11,fill:"none",stroke:"#9bbebb","stroke-width":1.5}, cssd);
        el("rect", {x:ax+17,y:y+116,width:34,height:12,rx:2,fill:"#456b72"}, cssd);
        el("circle", {cx:ax+23,cy:y+122,r:2,fill:"#83edbd"}, cssd);
        el("circle", {cx:ax+30,cy:y+122,r:2,fill:"#f2d36c"}, cssd);
      });
      // Sterile instrument trays and wrapped packs on the counter
      [0,1,2].forEach(k=>{
        const tx=x+202+k*24;
        el("rect", {x:tx,y:y+112,width:19,height:22,rx:2,fill:["#d9e8f4","#d7eee3","#f4e4c9"][k],stroke:"#789e9d","stroke-width":1.4}, cssd);
        el("path", {d:`M${tx+4} ${y+118}h11 M${tx+4} ${y+123}h11`,stroke:"#86aaa8","stroke-width":1.2}, cssd);
      });
      // Instrument rack and sterilization indicator
      el("rect", {x:x+w-66,y:y+49,width:42,height:54,rx:3,fill:"#f3f8f7",stroke:"#688f8e","stroke-width":2}, cssd);
      [0,1,2,3].forEach(k=>el("path", {d:`M${x+w-60+k*9} ${y+57}v37`,stroke:["#7da9bf","#7cb89a","#d8b66b","#8f9fd1"][k],"stroke-width":3,"stroke-linecap":"round"}, cssd));
      el("rect", {x:x+w-62,y:y+110,width:34,height:16,rx:3,fill:"#d7eee3",stroke:"#6b9e88","stroke-width":1.2}, cssd);
      txt(cssd,x+w-45,y+121,"STERILE",{"font-size":6.5,"font-weight":"bold","text-anchor":"middle",fill:"#39785e"});
      el("rect", {x:x+w-108,y:y+9,width:93,height:22,rx:11,fill:"#dcefe7",stroke:"#9bc9ae","stroke-width":1}, g);
      txt(g,x+w-61.5,y+24,"CSSD",{"font-size":10,"font-weight":"bold","text-anchor":"middle",fill:"#3d8067"});
    }


    // Room 1C: central pharmacy, with medicine storage and dispensing equipment.
    if (label === "Room 1C") {
      g.classList.add("pharmacy-room");
      bed.setAttribute("display", "none");
      doctor.setAttribute("display", "none");
      const pharmacy = el("g", {id:"pharmacy-equipment", class:"room-object", tabindex:"0", role:"button", "aria-label":"Pharmacy cabinets and medication dispenser", "data-editor-id":"pharmacy-equipment"}, g);
      // Tall medicine cabinet
      el("rect",{x:x+18,y:y+48,width:74,height:82,rx:4,fill:"#f8faf7",stroke:"#8a7558","stroke-width":2.2},pharmacy);
      [0,1,2].forEach(r=>{
        el("path",{d:`M${x+23} ${y+73+r*18}h64`,stroke:"#b7a58a","stroke-width":1.8},pharmacy);
        [0,1,2,3].forEach(c=>{
          const colors=["#e5f1fa","#f4e5b9","#d9eee4","#f3d8d8"];
          el("rect",{x:x+26+c*15,y:y+54+r*18,width:10,height:14,rx:2,fill:colors[(r+c)%4],stroke:"#9baba7","stroke-width":.8},pharmacy);
          el("rect",{x:x+28+c*15,y:y+51+r*18,width:6,height:4,rx:1,fill:"#8a7558"},pharmacy);
        });
      });
      // Automated dispensing cabinet and touch panel
      el("rect",{x:x+112,y:y+53,width:62,height:78,rx:5,fill:"#d9e7e6",stroke:"#6f918d","stroke-width":2.2},pharmacy);
      el("rect",{x:x+120,y:y+60,width:46,height:20,rx:3,fill:"#1e3c4c",stroke:"#88b9b1","stroke-width":1.2},pharmacy);
      txt(pharmacy,x+143,y+73,"RX",{"font-size":10,"font-weight":"bold","text-anchor":"middle",fill:"#a6f0d2"});
      [0,1,2].forEach(r=>[0,1,2].forEach(c=>el("rect",{x:x+121+c*14,y:y+87+r*12,width:10,height:8,rx:1.5,fill:["#fff4cf","#e0eef8","#d9eee4"][(r+c)%3],stroke:"#8ba8a3","stroke-width":.7},pharmacy)));
      // Counter with labelled medication packs
      el("rect",{x:x+190,y:y+117,width:w-210,height:17,rx:3,fill:"#c8d7d1",stroke:"#78958b","stroke-width":1.5},pharmacy);
      [0,1,2,3,4].forEach(k=>{
        const px=x+202+k*23;
        el("rect",{x:px,y:y+91,width:17,height:25,rx:2,fill:["#f7f3df","#dceafa","#d9eee4","#f4dddd","#f7e8c8"][k],stroke:"#8a9e98","stroke-width":1},pharmacy);
        el("path",{d:`M${px+3} ${y+100}h11 M${px+3} ${y+105}h11`,stroke:"#91aaa1","stroke-width":1},pharmacy);
      });
      el("rect",{x:x+w-89,y:y+46,width:72,height:19,rx:9,fill:"#e3eee5",stroke:"#a6c7ae","stroke-width":1},g);
      txt(g,x+w-53,y+59,"PHARMACY",{"font-size":8,"font-weight":"bold","text-anchor":"middle",fill:"#4d8065"});
    }

    // Room 2B: ICU, retaining the bed and adding intensive monitoring and respiratory support.
    if (label === "Room 2B") {
      g.classList.add("icu-room");
      doctor.setAttribute("display", "none");
      const icu = el("g", {id:"icu-equipment", class:"room-object", tabindex:"0", role:"button", "aria-label":"ICU ventilator and infusion pumps", "data-editor-id":"icu-equipment"}, g);
      // Ventilator tower
      el("rect",{x:x+18,y:y+57,width:38,height:69,rx:4,fill:"#dce9e9",stroke:"#648e8b","stroke-width":2},icu);
      el("rect",{x:x+23,y:y+63,width:28,height:20,rx:3,fill:"#183a4b",stroke:"#79a8a2","stroke-width":1},icu);
      el("path",{d:`M${x+26} ${y+74}h5l3 -6l4 10l4 -7h6`,fill:"none",stroke:"#6de0b7","stroke-width":1.5,"stroke-linejoin":"round"},icu);
      [0,1,2].forEach(k=>el("circle",{cx:x+28+k*9,cy:y+91,r:2.2,fill:["#71d6bf","#f0cd68","#75c8e8"][k]},icu));
      el("rect",{x:x+25,y:y+99,width:24,height:20,rx:2,fill:"#eef5f2",stroke:"#9ab9b3","stroke-width":1},icu);
      el("path",{d:`M${x+37} ${y+126}v17m-10 0h20`,stroke:"#698e8c","stroke-width":2.5,"stroke-linecap":"round"},icu);
      // Three infusion pumps on a shared pole
      el("path",{d:`M${x+75} ${y+65}v91m-10 0h20`,stroke:"#718f95","stroke-width":3,"stroke-linecap":"round"},icu);
      [0,1,2].forEach(k=>{
        const py=y+67+k*25;
        el("rect",{x:x+64,y:py,width:23,height:20,rx:3,fill:"#f3f8f7",stroke:"#6c9c99","stroke-width":1.5},icu);
        el("rect",{x:x+68,y:py+4,width:15,height:6,rx:1,fill:"#224254"},icu);
        el("path",{d:`M${x+70} ${py+7}h4l2 -2l2 4l2 -2h1`,fill:"none",stroke:"#79e3bb","stroke-width":1},icu);
        el("circle",{cx:x+75,cy:py+15,r:2,fill:"#e8c55e"},icu);
      });
      // Oxygen and airway support label
      el("rect",{x:x+w-93,y:y+44,width:76,height:19,rx:9,fill:"#d9eee8",stroke:"#9bc7b8","stroke-width":1},g);
      txt(g,x+w-55,y+57,"ICU",{"font-size":9,"font-weight":"bold","text-anchor":"middle",fill:"#3d8067"});
      el("path",{d:`M${x+56} ${y+62}q12 -12 19 0`,fill:"none",stroke:"#86b9b2","stroke-width":1.5},icu);
    }

    // Room 2C: CT scanner suite, replacing the generic bed with a dedicated scanner table.
    if (label === "Room 2C") {
      g.classList.add("ct-scan-room");
      bed.setAttribute("display", "none");
      doctor.setAttribute("display", "none");
      const ct = el("g", {id:"ct-scanner-equipment", class:"room-object", tabindex:"0", role:"button", "aria-label":"CT scanner and patient table", "data-editor-id":"ct-scanner-equipment"}, g);
      // Large donut-shaped CT gantry
      el("rect",{x:x+35,y:y+50,width:84,height:91,rx:15,fill:"#eaf0f7",stroke:"#777eb8","stroke-width":3},ct);
      el("rect",{x:x+46,y:y+60,width:62,height:69,rx:24,fill:"#bfc9e7",stroke:"#929bd0","stroke-width":2},ct);
      el("ellipse",{cx:x+77,cy:y+94,rx:19,ry:28,fill:"#f8faff",stroke:"#7d86bd","stroke-width":2},ct);
      el("ellipse",{cx:x+77,cy:y+94,rx:11,ry:20,fill:"#dce4f7",stroke:"#b0b9df","stroke-width":1.5},ct);
      // Sliding patient table and control unit
      el("rect",{x:x+91,y:y+117,width:w-111,height:12,rx:5,fill:"#f8fafc",stroke:"#8b95c3","stroke-width":1.5},ct);
      el("rect",{x:x+118,y:y+129,width:12,height:25,rx:2,fill:"#8b95c3"},ct);
      el("path",{d:`M${x+124} ${y+154}h45`,stroke:"#71869a","stroke-width":3,"stroke-linecap":"round"},ct);
      el("rect",{x:x+w-57,y:y+61,width:39,height:46,rx:4,fill:"#dce8ed",stroke:"#647f98","stroke-width":2},ct);
      el("rect",{x:x+w-52,y:y+66,width:29,height:24,rx:2,fill:"#17364b"},ct);
      el("path",{d:`M${x+w-49} ${y+79}h5l3 -7l4 11l4 -8l4 4h6`,fill:"none",stroke:"#75e4bc","stroke-width":1.4},ct);
      el("circle",{cx:x+w-38,cy:y+98,r:2,fill:"#6fbdad"},ct);
      el("rect",{x:x+w-92,y:y+43,width:75,height:19,rx:9,fill:"#e4e5f7",stroke:"#b4b7e1","stroke-width":1},g);
      txt(g,x+w-54,y+56,"CT SCAN",{"font-size":8.5,"font-weight":"bold","text-anchor":"middle",fill:"#5b61a1"});
    }

    const notifyParent = () => {
      try { window.parent.postMessage({type:"YIA_HOSPITAL_ROOM_SELECTED",roomLabel:label,floor:String(floor)},window.location.origin); } catch (_) {}
    };
    g.addEventListener("click", event => {
      if (event.target.closest(".room-object")) return;
      selectRoom(label,g);
      notifyParent();
    });
    g.addEventListener("keydown", event => {
      if (event.key==="Enter" || event.key===" ") { event.preventDefault(); selectRoom(label,g); notifyParent(); }
    });
    [bed,doctor,monitor].forEach(node=>{
      node.addEventListener("click",event=>{event.stopPropagation();selectObject(node.id.startsWith("bed")?"bed":node.id.startsWith("doctor")?"doctor":"monitor",node);});
      node.addEventListener("keydown",event=>{
        if(event.key==="Enter"||event.key===" "){event.preventDefault();event.stopPropagation();selectObject(node.id.startsWith("bed")?"bed":node.id.startsWith("doctor")?"doctor":"monitor",node);}
      });
    });
    animated.push({doctor,patient,ecg,phase:index*.72});
    const btn=document.createElement("button");
    btn.type="button"; btn.textContent=label; btn.addEventListener("click",()=>selectRoom(label,g));
    roomButtons.appendChild(btn);
  }


  // Saved visual-editor changes. Exported script.js can embed this object.
  const EXPORTED_LAYOUT = null;
  const LAYOUT_KEY = "hospital-visual-editor-layout-v1";
  let savedLayout = EXPORTED_LAYOUT;
  if (!savedLayout) {
    try { savedLayout = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}"); }
    catch (_) { savedLayout = {}; }
  }

  roomPositions.forEach(makeRoom);

  // Narrow autonomous parcel conveyor: one vertical spine links every room to B1.
  // Draw it behind rooms so branches visually enter each room without covering equipment.
  const parcelLine = el("g", {id:"parcel-delivery-line", "aria-label":"Automated parcel delivery line to basement"});
  const parcelPath = "M132 145 V1100";
  el("path", {d:parcelPath, fill:"none", stroke:"#344f61", "stroke-width":16, "stroke-linecap":"round", opacity:".95"}, parcelLine);
  el("path", {d:parcelPath, fill:"none", stroke:"#f3c65f", "stroke-width":8, "stroke-linecap":"round", "stroke-dasharray":"10 8", class:"parcel-track"}, parcelLine);
  // Horizontal conveyor pipes run visibly BELOW each room row, not through room equipment.
  // Each row is one continuous pipe with short risers connecting to the rooms above.
  const parcelRows = [
    { y: 414, x1: 132, x2: 1050, rooms: roomPositions.filter(r => r.floor === 3) },
    { y: 679, x1: 132, x2: 1050, rooms: roomPositions.filter(r => r.floor === 2) },
    { y: 944, x1: 105, x2: 1050, rooms: roomPositions.filter(r => r.floor === 1) }
  ];
  parcelRows.forEach((row) => {
    el("path", {d:`M${row.x1} ${row.y} H${row.x2}`, fill:"none", stroke:"#344f61", "stroke-width":12, "stroke-linecap":"round"}, parcelLine);
    el("path", {d:`M${row.x1} ${row.y} H${row.x2}`, fill:"none", stroke:"#f3c65f", "stroke-width":5, "stroke-linecap":"round", "stroke-dasharray":"8 7", class:"parcel-track"}, parcelLine);
    row.rooms.forEach((room) => {
      const cx = room.x + room.width / 2;
      el("path", {d:`M${cx} ${room.y + room.height} V${row.y}`, fill:"none", stroke:"#344f61", "stroke-width":8, "stroke-linecap":"round"}, parcelLine);
      el("path", {d:`M${cx} ${room.y + room.height} V${row.y}`, fill:"none", stroke:"#f3c65f", "stroke-width":3.5, "stroke-linecap":"round", "stroke-dasharray":"6 5"}, parcelLine);
    });
    el("circle", {cx:132, cy:row.y, r:9, fill:"#fff6d7", stroke:"#344f61", "stroke-width":3}, parcelLine);
    el("circle", {cx:132, cy:row.y, r:3.5, fill:"#e5a928"}, parcelLine);
  });
  // Compact legend and direction arrow make the delivery shaft easy to recognize.
  el("rect", {x:18, y:124, width:104, height:48, rx:8, fill:"#fff8df", stroke:"#d6a83b", "stroke-width":2}, parcelLine);
  txt(parcelLine, 70, 143, "PARCEL LINE", {"font-size":11, "font-weight":700, "text-anchor":"middle", fill:"#654d18"});
  txt(parcelLine, 70, 158, "TO B1", {"font-size":10, "font-weight":700, "text-anchor":"middle", fill:"#87671e"});
  el("path", {d:"M120 1085 L132 1100 L144 1085", fill:"none", stroke:"#f3c65f", "stroke-width":5, "stroke-linecap":"round", "stroke-linejoin":"round"}, parcelLine);
  const parcel = el("g", {class:"moving-parcel", "aria-label":"Moving parcel"}, parcelLine);
  el("rect", {x:-7, y:-7, width:14, height:14, rx:2, fill:"#fff4c7", stroke:"#344f61", "stroke-width":2}, parcel);
  el("path", {d:"M-7 0 H7 M0 -7 V7", stroke:"#d9a52d", "stroke-width":1.5}, parcel);
  const motion = el("animateMotion", {dur:"8s", repeatCount:"indefinite", rotate:"auto", path:parcelPath}, parcel);
  if (motion && typeof motion.beginElement === "function") { /* starts automatically in SVG-capable browsers */ }
  roomLayer.parentNode.insertBefore(parcelLine, roomLayer);

  // Give every room its own clinical specialty, palette and small vector details.
  const roomThemes = [
    {id:"Room 3A", name:"RADIOGRAPHY", wall:"#e2ecef", accent:"#79a9ba", detail:"#3f7d8e"},
    {id:"Room 3B", name:"BLOOD LAB", wall:"#e2efe7", accent:"#9bc9ae", detail:"#4d8b6b"},
    {id:"Room 3C", name:"CSSD", wall:"#e5efed", accent:"#a8c9c4", detail:"#4f8580"},
    {id:"Room 2A", name:"OPERATING ROOM", wall:"#e2eeee", accent:"#9fc7c5", detail:"#4f8588"},
    {id:"Room 2B", name:"ICU", wall:"#e5f0e3", accent:"#a6c98f", detail:"#6f9c61"},
    {id:"Room 2C", name:"CT SCAN", wall:"#e5e7f5", accent:"#a7a9d9", detail:"#6f73b4"},
    {id:"Room 1A", name:"EMERGENCY", wall:"#f5e7e3", accent:"#e6a39a", detail:"#b94d45"},
    {id:"Room 1B", name:"REHABILITATION", wall:"#e0f0e9", accent:"#8bc8ad", detail:"#4d9879"},
    {id:"Room 1C", name:"PHARMACY", wall:"#e9e5dc", accent:"#b7a58a", detail:"#8a7558"},
    {id:"Basement Control Suite", name:"MONITORS + AI ROBOT", wall:"#dfe9f1", accent:"#8bb6cc", detail:"#426b84"}
  ];
  roomThemes.forEach((theme, index) => {
    const group = document.getElementById(`room-${theme.id.replace(/\s/g,"-")}`);
    if (!group) return;
    const wall = group.querySelector(":scope > rect");
    if (wall) { wall.setAttribute("fill", theme.wall); wall.setAttribute("stroke", theme.detail); }
    group.querySelectorAll(":scope > rect").forEach((r, i) => {
      if (i === 0) return;
      if (r.getAttribute("fill") === "#8ebdb7") r.setAttribute("fill", theme.accent);
    });
    const x = Number(wall.getAttribute("x")), y = Number(wall.getAttribute("y")), w = Number(wall.getAttribute("width"));
    const badge = el("rect", {x:x+w-106,y:y+8,width:94,height:20,rx:10,fill:theme.detail,opacity:.95}, group);
    txt(group,x+w-59,y+22,theme.name,{"font-size":8.5,"font-weight":"bold","text-anchor":"middle",fill:"#ffffff","letter-spacing":".3"});
    // A unique, editable vector motif in each room's upper wall area.
    if (index === 0) { // radiography: X-ray wall emblem
      el("rect",{x:x+116,y:y+42,width:26,height:31,rx:3,fill:"#f4f8fa",stroke:theme.detail,"stroke-width":2},group);
      el("path",{d:`M${x+129} ${y+47}v20 M${x+120} ${y+57}h18`,stroke:theme.accent,"stroke-width":3,"stroke-linecap":"round"},group);
      el("circle",{cx:x+129,cy:y+57,r:8,fill:"none",stroke:theme.detail,"stroke-width":1.5},group);
    } else if (index === 1) { // blood laboratory: specimen tubes
      [0,1,2].forEach(k=>{
        el("rect",{x:x+113+k*13,y:y+48,width:9,height:27,rx:3,fill:["#f4d8d8","#e6dff1","#d9e9f8"][k],stroke:theme.detail,"stroke-width":1.3},group);
        el("rect",{x:x+112+k*13,y:y+44,width:11,height:6,rx:1,fill:["#c85c5c","#9477c1","#5e9bd2"][k]},group);
        el("path",{d:`M${x+116+k*13} ${y+64}v7`,stroke:theme.accent,"stroke-width":1.8},group);
      });
    } else if (index === 2) { // CSSD: steam and sterile instrument emblem
      el("rect",{x:x+112,y:y+43,width:38,height:31,rx:4,fill:"#f4faf8",stroke:theme.detail,"stroke-width":1.7},group);
      [0,1,2].forEach(k=>el("path",{d:`M${x+121+k*9} ${y+66}q-5 -7 0 -12q5 -6 0 -9`,fill:"none",stroke:theme.accent,"stroke-width":2.2,"stroke-linecap":"round"},group));
      el("path",{d:`M${x+159} ${y+48}l7 7l13 -14`,fill:"none",stroke:theme.detail,"stroke-width":3,"stroke-linecap":"round","stroke-linejoin":"round"},group);
    } else if (index === 3) { // operating room: surgical cross and light motif
      el("rect",{x:x+108,y:y+43,width:32,height:32,rx:5,fill:"#f5fbfa",stroke:theme.detail,"stroke-width":1.5},group);
      el("path",{d:`M${x+121} ${y+49}h6v7h7v6h-7v7h-6v-7h-7v-6h7Z`,fill:"#4f9d91"},group);
      el("path",{d:`M${x+149} ${y+48}v9l8 5`,fill:"none",stroke:theme.detail,"stroke-width":3,"stroke-linecap":"round"},group);
      el("circle",{cx:x+157,cy:y+65,r:7,fill:"#e9f4f2",stroke:theme.detail,"stroke-width":1.5},group);
    } else if (index === 4) { // ICU: test-tube-like visual motif retained as compact medical detail
      [0,1,2].forEach(k=>{el("path",{d:`M${x+112+k*17} ${y+43}v20l-5 8q0 4 5 4h5q5 0 5 -4l-5 -8V${y+43}`,fill:["#d4ecf6","#d7edc9","#f6dfad"][k],stroke:theme.detail,"stroke-width":1.5},group);});
    } else if (index === 5) { // CT scan: scanner arch
      el("path",{d:`M${x+109} ${y+75}V${y+53}Q${x+109} ${y+40} ${x+122} ${y+40}H${x+140}Q${x+153} ${y+40} ${x+153} ${y+53}V${y+75}`,fill:"none",stroke:theme.detail,"stroke-width":7,"stroke-linecap":"round"},group);
      el("rect",{x:x+124,y:y+46,width:14,height:24,rx:5,fill:"#f9fbff",stroke:theme.accent,"stroke-width":2},group);
    } else if (index === 6) { // emergency: first-aid cross and emergency equipment
      // Wall-mounted emergency cross
      el("rect",{x:x+113,y:y+43,width:38,height:38,rx:5,fill:"#fffafa",stroke:theme.detail,"stroke-width":2},group);
      el("path",{d:`M${x+128} ${y+49}h8v9h9v8h-9v9h-8v-9h-9v-8h9Z`,fill:"#d94e48"},group);
      // Portable defibrillator beside the stretcher
      const defib = el("g",{id:"emergency-defibrillator","data-editor-id":"emergency-defibrillator","aria-label":"Emergency defibrillator"},group);
      el("rect",{x:x+163,y:y+91,width:49,height:34,rx:4,fill:"#f8fbfa",stroke:theme.detail,"stroke-width":2.2},defib);
      el("rect",{x:x+169,y:y+97,width:24,height:13,rx:2,fill:"#294d55"},defib);
      el("path",{d:`M${x+171} ${y+104}h5l3 -4l4 8l4 -5h4`,fill:"none",stroke:"#7af0bf","stroke-width":1.6,"stroke-linecap":"round","stroke-linejoin":"round"},defib);
      el("circle",{cx:x+201,cy:y+104,r:4,fill:"#e7c45e",stroke:theme.detail,"stroke-width":1},defib);
      el("path",{d:`M${x+175} ${y+112}q-9 6 -3 12 M${x+198} ${y+112}q9 6 3 12`,fill:"none",stroke:"#7c9fa0","stroke-width":1.8,"stroke-linecap":"round"},defib);
      // Compact oxygen cylinder on a stand
      const oxygen = el("g",{id:"emergency-oxygen-cylinder","data-editor-id":"emergency-oxygen-cylinder","aria-label":"Emergency oxygen cylinder"},group);
      el("rect",{x:x+222,y:y+88,width:17,height:34,rx:6,fill:"#e2f4f3",stroke:"#4e9999","stroke-width":2},oxygen);
      el("rect",{x:x+227,y:y+83,width:7,height:7,rx:1,fill:"#4e9999"},oxygen);
      el("path",{d:`M${x+230} ${y+122}v7m-8 0h16`,stroke:"#4e9999","stroke-width":2.5,"stroke-linecap":"round"},oxygen);
    } else if (index === 7) { // rehabilitation: exercise ball
      el("circle",{cx:x+132,cy:y+63,r:20,fill:theme.accent,stroke:theme.detail,"stroke-width":2});
      el("path",{d:`M${x+113} ${y+63}Q${x+132} ${y+51} ${x+151} ${y+63}M${x+132} ${y+43}V${y+83}`,fill:"none",stroke:"#eafff5","stroke-width":2},group);
    } else if (index === 8) { // pharmacy: organized medicine bottles
      [0,1,2].forEach(k=>{el("rect",{x:x+111+k*18,y:y+51,width:14,height:24,rx:3,fill:["#fff","#d8e9fa","#f6e6b9"][k],stroke:theme.detail,"stroke-width":1.5},group);el("rect",{x:x+114+k*18,y:y+45,width:8,height:7,rx:1,fill:theme.detail},group);el("path",{d:`M${x+114+k*18} ${y+63}h8`,stroke:theme.accent,"stroke-width":2},group);});
    }
    group.dataset.specialty = theme.name;
  });


  // Stable IDs let the visual editor save per-element transforms and colors.
  document.querySelectorAll("#rooms .independent-room").forEach((room) => {
    room.setAttribute("data-editor-id", room.id);
    let n = 0;
    room.querySelectorAll("*").forEach((node) => {
      if (!node.hasAttribute("data-editor-id")) {
        node.setAttribute("data-editor-id", node.id || `${room.id}-part-${n++}`);
      }
    });
  });
  function applyLayout(layout) {
    Object.entries(layout || {}).forEach(([id, values]) => {
      const node = document.querySelector(`[data-editor-id="${CSS.escape(id)}"]`);
      if (!node) return;
      if (values.transform) {
        node.dataset.editorTransform = values.transform;
        node.setAttribute("transform", values.transform);
      }
      if (values.fill) node.setAttribute("fill", values.fill);
      if (values.stroke) node.setAttribute("stroke", values.stroke);
    });
  }
  applyLayout(savedLayout);

  function clearHighlights(){ document.querySelectorAll(".selected-object").forEach(n=>n.classList.remove("selected-object")); }
  function selectRoom(label,group){
    clearHighlights();
    document.querySelectorAll("#rooms .independent-room").forEach(room=>{
      room.classList.toggle("room-dimmed", room!==group);
      room.classList.toggle("room-active", room===group);
    });
    group.classList.add("selected-object");
    info.textContent=`${label} selected. Other rooms are dimmed; click another room to switch selection.`;
    try { window.parent.postMessage({type:"YIA_HOSPITAL_ROOM_SELECTED",roomLabel:label,floor:group.dataset.floor},window.location.origin); } catch (_) {}
  }
  function selectObject(type){
    clearHighlights();
    const selector=type==="monitor"?'[id^="monitor-"]':type==="doctor"?'[id^="doctor-"]':'[id^="bed-"]';
    document.querySelectorAll(selector).forEach(n=>n.classList.add("selected-object"));
    const labels={monitor:"All nine monitors are highlighted.",doctor:"All nine doctors are highlighted.",bed:"All nine beds are highlighted."};
    info.textContent=labels[type];
  }
  document.querySelectorAll("button[data-floor]").forEach(button=>{
    button.addEventListener("click",()=>{
      const floor=button.dataset.floor;
      document.querySelectorAll(".room-hit").forEach(g=>g.classList.toggle("floor-dim",floor!=="all"&&g.dataset.floor!==floor));
      clearHighlights();
      info.textContent=floor==="all"?"All floors are visible.":`Floor ${floor} is highlighted.`;
    });
  });
  document.querySelectorAll("[data-object]").forEach(button=>button.addEventListener("click",()=>selectObject(button.dataset.object)));
  toggleButton.addEventListener("click",()=>{
    paused=!paused; toggleButton.textContent=paused?"Resume animation":"Pause animation";
    toggleButton.setAttribute("aria-pressed",String(paused));
  });
  resetButton.addEventListener("click",()=>{
    paused=false;last=0;phase=0;ecgPhase=0;
    toggleButton.textContent="Pause animation";toggleButton.setAttribute("aria-pressed","false");
    document.querySelectorAll(".floor-dim").forEach(n=>n.classList.remove("floor-dim"));
    clearHighlights();info.textContent="Nothing selected yet.";
    animated.forEach(a=>{a.doctor.removeAttribute("transform");a.patient.removeAttribute("transform");a.ecg.style.opacity="1";});
  });
  function tick(timestamp){
    if(!last)last=timestamp;
    const dt=Math.min(timestamp-last,50);last=timestamp;
    if(!paused){
      phase+=dt*.0018;ecgPhase+=dt*.005;
      animated.forEach((a,i)=>{
        a.doctor.setAttribute("transform",`translate(0 ${(Math.sin(phase+a.phase)*1.4).toFixed(2)}) ${a.doctor.dataset.editorTransform || ""}`.trim());
        a.patient.setAttribute("transform",`translate(0 ${(Math.sin(phase*.7+a.phase)*.6).toFixed(2)}) ${a.patient.dataset.editorTransform || ""}`.trim());
        a.ecg.style.opacity=String(.65+.35*Math.abs(Math.sin(ecgPhase+i)));
      });
    }
    raf=requestAnimationFrame(tick);
  }
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){paused=true;toggleButton.textContent="Resume animation";}
  raf=requestAnimationFrame(tick);
  window.addEventListener("pagehide",()=>cancelAnimationFrame(raf));
})();