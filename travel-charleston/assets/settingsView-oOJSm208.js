(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))o(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function r(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerPolicy&&(s.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?s.credentials="include":t.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(t){if(t.ep)return;t.ep=!0;const s=r(t);fetch(t.href,s)}})();function Pe(){"serviceWorker"in navigator&&window.addEventListener("load",()=>{const e=window.location.pathname.endsWith("/eink/")||window.location.pathname.endsWith("/eink/index.html")?"../sw.js":"./sw.js";navigator.serviceWorker.register(e).then(a=>{console.log("ServiceWorker registered with scope:",a.scope)}).catch(a=>{console.error("ServiceWorker registration failed:",a)})})}const K="chs-travel-db",Y=1,y="trip-store",L="tripState";function M(){return new Promise((e,a)=>{const r=indexedDB.open(K,Y);r.onupgradeneeded=o=>{const t=o.target.result;t.objectStoreNames.contains(y)||t.createObjectStore(y)},r.onsuccess=()=>e(r.result),r.onerror=()=>a(r.error)})}async function z(){try{const e=await M();return new Promise((a,r)=>{const s=e.transaction(y,"readonly").objectStore(y).get(L);s.onsuccess=()=>a(s.result||null),s.onerror=()=>r(s.error)})}catch(e){return console.error("Error reading from IndexedDB:",e),null}}async function R(e){try{const a=await M();return new Promise((r,o)=>{const i=a.transaction(y,"readwrite").objectStore(y).put(e,L);i.onsuccess=()=>r(!0),i.onerror=()=>o(i.error)})}catch(a){return console.error("Error writing to IndexedDB:",a),!1}}async function Q(){try{const e=await M();return new Promise((a,r)=>{const s=e.transaction(y,"readwrite").objectStore(y).delete(L);s.onsuccess=()=>a(!0),s.onerror=()=>r(s.error)})}catch(e){return console.error("Error clearing IndexedDB:",e),!1}}const X={id:"chs-sept-2026",title:"Charleston & Mount Pleasant Family Trip",start:"2026-09-17",end:"2026-09-21",timezone:"America/New_York",base:{name:"The Beach Club at Charleston Harbor Resort & Marina",address:"28 Patriots Point Rd, Mount Pleasant, SC 29464",coords:[-79.896,32.789]},party:["Adult 1","Adult 2","Child (7)"],transport:{modes:["uber","water_taxi","shuttle","walk"],waterTaxiPass:"$14 per person all-day pass (purchased directly on boat)",notes:"No rental car. Free van service operated by The Beach Club."},climate:{season:"Early Autumn",average_high_f:83,average_low_f:70,humidity_level:"Moderate",packing_recommendations:["Lightweight cotton and linen daytime wear","Comfortable walking shoes/sneakers for cobblestones","Swimsuits and rashguards","Light layer/sweater for breezy evening boat rides and harbor dining","Water shoes or strap sandals for barrier island beach drop"]},sunSchedule:{approx_sunrise:"07:08 AM",approx_sunset:"07:21 PM",golden_hour_window:"06:15 PM - 07:30 PM"},tideContext:{date_of_interest:"2026-09-20",location:"Charleston Harbor / Shem Creek / Morris Island",morning_low_tide:"09:15 AM",afternoon_high_tide:"03:30 PM",fossil_hunting_optimal_window:"08:00 AM - 11:30 AM"}},Z=[{date:"2026-09-17",label:"Thu - Arrival & Check-In",status:"planned",activities:[{id:"a1",time:"20:00",end:"22:00",title:"Arrive at The Beach Club",type:"activity",location:{name:"Arrive at The Beach Club",address:"",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Check in, settle into room, and unpack. No scheduled evening activities.",tips:null,completed:!1,sortOrder:1}]},{date:"2026-09-18",label:"Fri - Father-Daughter Adventure Day",status:"planned",activities:[{id:"a2",time:"08:35",end:"08:55",title:"Uber to South Carolina Aquarium",type:"activity",location:{name:"Uber to South Carolina Aquarium",address:"100 Aquarium Wharf, Charleston, SC 29401",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Cross the Arthur Ravenel Jr. Bridge to arrive at the aquarium doors before the 9:00 AM opening.",tips:null,completed:!1,sortOrder:1},{id:"a3",time:"09:00",end:"11:15",title:"South Carolina Aquarium",type:"activity",location:{name:"South Carolina Aquarium",address:"",coords:null},transit:{},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Explore stingray touch tanks, the 2-story Great Ocean Tank, and the Sea Turtle Care Center hospital.",tips:"Head directly to the second-floor Sea Turtle recovery tanks first to observe medical staff feeding and treating injured turtles.",completed:!1,sortOrder:2},{id:"a4",time:"11:15",end:"11:45",title:"Gadsdenboro Park Nautical Playground",type:"activity",location:{name:"Gadsdenboro Park Nautical Playground",address:"",coords:null},transit:{primary:"walk",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Short play stop on the pirate-ship play structure and padded turf field to burn energy before lunch.",tips:null,completed:!1,sortOrder:3},{id:"a5",time:"11:45",end:"13:00",title:"Lunch at Leon's Fine Poultry & Oyster Shop",type:"activity",location:{name:"Lunch at Leon's Fine Poultry & Oyster Shop",address:"698 King St, Charleston, SC 29403",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Casual lunch in a converted auto garage.",tips:null,completed:!1,sortOrder:4,menuRecommendations:["Chargrilled oysters with parmesan and herbs","Crispy fried chicken sandwich or half bird","Scalloped potatoes","Soft-serve vanilla ice cream with sprinkles (free for kids)"]},{id:"a6",time:"13:15",end:"14:00",title:"Charleston Water Taxi Cruise Back to Resort",type:"activity",location:{name:"Charleston Water Taxi Cruise Back to Resort",address:"Maritime Center Dock (10 Aquarium Wharf)",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Board the 1:30 PM departure for a relaxing boat ride across Charleston Harbor back to the resort's A-Dock. Look out for harbor dolphins.",tips:null,completed:!1,sortOrder:5},{id:"a7",time:"14:00",end:"18:30",title:"Resort Pool, Bikes & Lawn Games",type:"activity",location:{name:"Resort Pool, Bikes & Lawn Games",address:"",coords:null},transit:{},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Afternoon recreation at the resort while Mother finishes remote work. Swim in the heated pool, ride complimentary beach cruisers, and play lawn chess.",tips:null,completed:!1,sortOrder:6},{id:"a8",time:"19:00",end:"20:30",title:"Reunited Family Dinner at Lewis Barbecue",type:"activity",location:{name:"Reunited Family Dinner at Lewis Barbecue",address:"464 N Nassau St, Charleston, SC 29403",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Texas-style barbecue counter service by pitmaster John Lewis. Outdoor seating in a large shaded oak courtyard.",tips:null,completed:!1,sortOrder:7,menuRecommendations:["Prime beef brisket (sliced moist)","Pulled pork","Texas hot links","Green chile corn pudding","Mac and cheese"]}]},{date:"2026-09-19",label:"Sat - Historic Downtown Morning & Open Afternoon",status:"planned",activities:[{id:"a9",time:"08:30",end:"08:50",title:"Resort Shuttle Downtown",type:"activity",location:{name:"Resort Shuttle Downtown",address:"",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Take the free morning hotel shuttle across the bridge into historic downtown.",tips:null,completed:!1,sortOrder:1},{id:"a10",time:"09:00",end:"10:15",title:"Palmetto Carriage Works Historic Carriage Tour",type:"activity",location:{name:"Palmetto Carriage Works Historic Carriage Tour",address:"",coords:null},transit:{primary:"walk",fallback:null},reservation:{required:!0,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"1-hour horse/mule-drawn guided tour through the historic residential quarter. 9:00 AM start ensures minimal queues and cooler temperatures for the draft horses.",tips:null,completed:!1,sortOrder:2},{id:"a11",time:"10:30",end:"11:30",title:"Charleston Farmers Market at Marion Square",type:"activity",location:{name:"Charleston Farmers Market at Marion Square",address:"",coords:null},transit:{primary:"walk",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Lively outdoor market with sweetgrass basket weavers, local craftsmen, food stands, and live acoustic music.",tips:null,completed:!1,sortOrder:3},{id:"a13",time:"11:30",end:"13:00",title:"Children's Museum of the Lowcountry (183 Ann St)",type:"rain_backup",location:{name:"Children's Museum of the Lowcountry (183 Ann St)",address:"Located 2 blocks from Marion Square. Interactive indoor pirate ship, water play table, and craft room.",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!1,rainy:!0},hidden:!0,sortOrder:4.1,notes:"Located 2 blocks from Marion Square. Interactive indoor pirate ship, water play table, and craft room."},{id:"a12",time:"11:30",end:"13:00",title:"Market Walk, Biscuits & Scratch Ice Cream",type:"activity",location:{name:"Market Walk, Biscuits & Scratch Ice Cream",address:"",coords:null},transit:{},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:"a13",notes:"Casual walk down King Street and Market Street for snacks and treats.",tips:null,completed:!1,sortOrder:4,subStops:[{name:"Historic Charleston City Market",address:"188 Meeting St",notes:"Walk through the four-block covered shed to see traditional Gullah basket artisans."},{name:"Callie's Hot Little Biscuit",address:"476 1/2 King St",notes:"Quick counter stop for handmade stuffed biscuits (cheese & chive, bacon/ham, cinnamon sugar)."},{name:"Off Track Ice Cream",address:"6 Beaufain St",notes:"Traditional and vegan craft ice cream made with Lowcountry farm dairy. Order an ice cream flight (4 mini scoops)."}]},{id:"a14",time:"13:15",end:"13:35",title:"Resort Shuttle Return",type:"activity",location:{name:"Resort Shuttle Return",address:"",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Return to the resort for the rest of the day.",tips:null,completed:!1,sortOrder:5},{id:"a15",time:"13:45",end:"22:00",title:"Completely Open Afternoon & Evening",type:"activity",location:{name:"Completely Open Afternoon & Evening",address:"",coords:null},transit:{},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Zero scheduled commitments. Relax by the pool, rent bicycles, read in a cabana, or order casual food at the marina.",tips:null,completed:!1,sortOrder:6}]},{date:"2026-09-20",label:"Sun - Shem Creek Marine Outing & Creekfront Evening",status:"planned",activities:[{id:"a16",time:"07:45",end:"07:55",title:"Uber to Shem Creek Docks",type:"activity",location:{name:"Uber to Shem Creek Docks",address:"Mill St, Mount Pleasant, SC 29464",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Quick morning ride-share to the Shem Creek charter docks.",tips:null,completed:!1,sortOrder:1},{id:"a17",time:"08:00",end:"12:00",title:"Morris Island Shark Tooth & Fossil Charter",type:"activity",location:{name:"Morris Island Shark Tooth & Fossil Charter",address:"",coords:null},transit:{},reservation:{required:!0,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Boat charter through coastal marshes to the undeveloped beaches of Morris Island. Timed specifically for the 09:15 AM low tide to search for fossilized shark teeth (mako, tiger, sand tiger) along exposed gravel bars.",tips:null,completed:!1,sortOrder:2,operatorOptions:[{name:"LowCountry Coastal Excursions",type:"Shared or Private Boat Charter",cost:"$125/person shared or $400+ private charter",highlight:"Captains step onto the island with kids and circle tooth locations in the sand."},{name:"Coastal Expeditions",type:"Guided Skiff Beach Drop",cost:"$65 Adult / $45 Child",highlight:"Naturalist-guided boat trip focusing on coastal ecology and wildlife."}]},{id:"a18",time:"12:00",end:"13:30",title:"Waterfront Deck Lunch at Vickery's Bar & Grill",type:"activity",location:{name:"Waterfront Deck Lunch at Vickery's Bar & Grill",address:"",coords:null},transit:{primary:"walk",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Relaxed lunch on an outdoor wooden deck surrounded by water on three sides. Lowcountry fare, sandwiches, and cold drinks.",tips:null,completed:!1,sortOrder:3},{id:"a19",time:"13:30",end:"15:30",title:"Shem Creek Boardwalk Dolphin Walk",type:"activity",location:{name:"Shem Creek Boardwalk Dolphin Walk",address:"",coords:null},transit:{primary:"walk",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Walk the 2,200-foot wooden boardwalk stretching into the marsh grass and harbor. Watch wild bottlenose dolphins swimming along the shrimp boat channel.",tips:null,completed:!1,sortOrder:4},{id:"a20",time:"15:30",end:"17:30",title:"Dockside Drinks & Crab Dip at Red's Ice House",type:"activity",location:{name:"Dockside Drinks & Crab Dip at Red's Ice House",address:"",coords:null},transit:{primary:"walk",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Casual multi-level open-air dockside deck. Enjoy cold drinks, crab dip, or peel-and-eat shrimp with views of passing boats.",tips:null,completed:!1,sortOrder:5},{id:"a21",time:"17:30",end:"18:30",title:"Evening Marsh Walk & Sunset Viewing",type:"activity",location:{name:"Evening Marsh Walk & Sunset Viewing",address:"",coords:null},transit:{},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Stroll the public docks as late-afternoon sunlight illuminates the salt marsh.",tips:null,completed:!1,sortOrder:6},{id:"a22",time:"18:30",end:"20:00",title:"Sunset Dinner on the Patio at Tavern & Table",type:"activity",location:{name:"Sunset Dinner on the Patio at Tavern & Table",address:"",coords:null},transit:{primary:"walk",fallback:null},reservation:{required:!0,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Creekfront dinner on a covered outdoor patio during sunset (7:21 PM).",tips:null,completed:!1,sortOrder:7,menuRecommendations:["House-made pimento cheese with flatbread crisps","Wood-fired flatbreads","Pan-seared coastal crab cakes","Shrimp grain bowls"]},{id:"a23",time:"20:00",end:"20:10",title:"Uber Back to Resort",type:"activity",location:{name:"Uber Back to Resort",address:"28 Patriots Point Rd, Mount Pleasant, SC 29464",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Short ride-share from Tavern & Table back to the resort lobby.",tips:null,completed:!1,sortOrder:8}]},{date:"2026-09-21",label:"Mon - Resort Morning & Departure",status:"planned",activities:[{id:"a24",time:"08:30",end:"10:00",title:"Breakfast at Charleston Harbor Fish House",type:"activity",location:{name:"Breakfast at Charleston Harbor Fish House",address:"",coords:null},transit:{},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Sit-down breakfast overlooking the marina and harbor before packing.",tips:null,completed:!1,sortOrder:1},{id:"a25",time:"10:00",end:"11:00",title:"Patriots Point Marina Pier Walk",type:"activity",location:{name:"Patriots Point Marina Pier Walk",address:"",coords:null},transit:{},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Final morning stroll down the resort pier to watch container ships and boats.",tips:null,completed:!1,sortOrder:2},{id:"a26",time:"11:00",end:"12:00",title:"Check-Out & Airport Departure",type:"activity",location:{name:"Check-Out & Airport Departure",address:"",coords:null},transit:{primary:"uber",fallback:null},reservation:{required:!1,confirmation:"",cost:null},weather:{sunny:!0,rainy:!0},rainAlternativeId:null,notes:"Check out at the front desk and head home.",tips:null,completed:!1,sortOrder:3}]}],ee=[{id:"p1",item:"Swimsuits & rashguards",category:"Clothing",packed:!1,qty:3},{id:"p2",item:"Light layer/sweater for evening boats",category:"Clothing",packed:!1,qty:3},{id:"p3",item:"Water shoes / strap sandals",category:"Footwear",packed:!1,qty:3},{id:"p4",item:"Comfortable walking sneakers (cobblestones)",category:"Footwear",packed:!1,qty:3},{id:"p5",item:"Rain jackets",category:"Clothing",packed:!1,qty:3},{id:"p6",item:"Shark tooth sifter / collection bag",category:"Kid Gear",packed:!1,qty:1},{id:"p7",item:"Sun hat & sunscreen",category:"Clothing",packed:!1,qty:3},{id:"p8",item:"Water bottles",category:"Kid Gear",packed:!1,qty:3}],te=[],ae={theme:"auto",rainMode:!1,notificationsEnabled:!0},q={meta:X,days:Z,packing:ee,budget:te,settings:ae},B=[{id:"b1",date:"2026-09-18",category:"Activity",description:"South Carolina Aquarium Tickets",amount:89.95,paid:!0,split:!0},{id:"b2",date:"2026-09-18",category:"Transport",description:"Water Taxi Day Passes (x3)",amount:42,paid:!0,split:!0},{id:"b3",date:"2026-09-18",category:"Dining",description:"Leon's Poultry & Oysters Lunch",amount:68.5,paid:!0,split:!0},{id:"b4",date:"2026-09-18",category:"Dining",description:"Lewis Barbecue Dinner",amount:95,paid:!1,split:!0},{id:"b5",date:"2026-09-19",category:"Activity",description:"Palmetto Carriage Works Tour",amount:110,paid:!0,split:!0},{id:"b6",date:"2026-09-20",category:"Activity",description:"Morris Island Shark Tooth Charter",amount:375,paid:!0,split:!0},{id:"b7",date:"2026-09-20",category:"Dining",description:"Tavern & Table Sunset Dinner",amount:140,paid:!1,split:!0}];let x=null;const A=new Set;async function Ne(){const e=await z();if(e&&e.days&&e.days.length>0)x=e;else{const a=JSON.parse(JSON.stringify(q));(!a.budget||a.budget.length===0)&&(a.budget=B),x=a,await R(x)}return x}function f(){if(!x){const e=JSON.parse(JSON.stringify(q));return(!e.budget||e.budget.length===0)&&(e.budget=B),e}return x}function Le(e){return A.add(e),()=>{A.delete(e)}}async function g(){x&&(await R(x),A.forEach(e=>e(x)))}async function U(e,a){const o=f().days.find(s=>s.date===e);if(!o)return;const t=o.activities.find(s=>s.id===a);t&&(t.completed=!t.completed,await g())}async function re(e,a,r){const t=f().days.find(d=>d.date===e);if(!t)return;t.activities.sort((d,l)=>d.sortOrder-l.sortOrder);const s=t.activities.findIndex(d=>d.id===a);if(s===-1)return;const i=r==="up"?s-1:s+1;if(i<0||i>=t.activities.length)return;const n=t.activities[s].sortOrder;t.activities[s].sortOrder=t.activities[i].sortOrder,t.activities[i].sortOrder=n,t.activities.sort((d,l)=>d.sortOrder-l.sortOrder),await g()}async function se(e,a,r){const t=f().days.find(d=>d.date===e);if(!t)return;t.activities.sort((d,l)=>d.sortOrder-l.sortOrder);const s=t.activities.findIndex(d=>d.id===a),i=s!==-1?t.activities[s].sortOrder+.5:t.activities.length+1,n={id:"act-"+Date.now()+"-"+Math.random().toString(36).substr(2,4),time:r.time||"12:00",end:r.end||"",title:r.title,type:"activity",location:r.locationName?{name:r.locationName,address:r.locationName,coords:null}:void 0,notes:r.notes||"",completed:!1,sortOrder:i,weather:{sunny:!0,rainy:!0}};t.activities.push(n),t.activities.sort((d,l)=>d.sortOrder-l.sortOrder),t.activities.forEach((d,l)=>{d.sortOrder=l+1}),await g()}async function ne(e,a){const o=f().days.find(s=>s.date===e);if(!o)return;const t=o.activities.find(s=>s.id===a);t&&(t.deleted=!0,await g())}async function oe(e){const r=f().packing.find(o=>o.id===e);r&&(r.packed=!r.packed,await g())}async function ie(e,a,r=1){const o=f(),t={id:"pack-"+Date.now(),item:e,category:a.trim()||"General",packed:!1,qty:Math.max(1,r)};o.packing.push(t),await g()}async function de(e){const a=f();a.packing=a.packing.filter(r=>r.id!==e),await g()}async function P(e){const a=f();a.settings.rainMode=e!==void 0?e:!a.settings.rainMode,await g()}function le(){return JSON.stringify(f(),null,2)}async function ce(e){try{const a=JSON.parse(e);if(!a||!a.meta||!a.days||!Array.isArray(a.days))throw new Error("Invalid trip data format");return x=a,await g(),!0}catch(a){return console.error("Failed to import trip state:",a),!1}}async function pe(){await Q();const e=JSON.parse(JSON.stringify(q));e.budget=B,x=e,await R(x),A.forEach(a=>a(x))}function ue(){const e=window.location.hash.replace("#/","").replace("#","");return["today","itinerary","reservations","packing","ideas","settings"].includes(e)?e:"today"}function Me(e){window.location.hash=`#/${e}`}function Re(e){const a=()=>{e(ue())};return window.addEventListener("hashchange",a),()=>window.removeEventListener("hashchange",a)}function T(e){return`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(e)}`}function C(e){return`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(e)}`}function j(e){const a=e.replace(/^uber\s+to\s+/i,"").trim();return a?`Uber to ${a}`:"Uber"}function E(e){var r,o;return((r=e.transit)==null?void 0:r.primary)==="water_taxi"||((o=e.transit)==null?void 0:o.fallback)==="water_taxi"?!0:`${e.title} ${e.notes||""}`.toLowerCase().includes("water taxi")}function N(){return{passInfo:"$14 per person all-day pass (purchased directly on boat)",docks:["Patriots Point A-Dock (Resort Base)","Aquarium Wharf / Maritime Center","Waterfront Park (Pineapple Fountain)","Maritime Center Dock"],scheduleUrl:"https://www.charlestonwatertaxi.com/schedule",notes:"Runs continuously 9:00 AM - 7:30 PM. Harbor dolphin watching included!"}}const W="chs_weather_cache",be=60*60*1e3;async function fe(){let e=localStorage.getItem(W);if(e)try{const a=JSON.parse(e);if(Date.now()-a.timestamp<be)return O(a.data)}catch(a){console.warn("Invalid weather cache",a)}try{const a=await fetch("https://api.open-meteo.com/v1/forecast?latitude=32.79&longitude=-79.94&hourly=precipitation_probability,temperature_2m&current_weather=true&forecast_days=7");if(!a.ok)throw new Error(`Weather API HTTP ${a.status}`);const r=await a.json();return localStorage.setItem(W,JSON.stringify({timestamp:Date.now(),data:r})),O(r)}catch(a){if(console.warn("Failed to fetch Open-Meteo weather, fallback to offline forecast cache",a),e)try{const r=JSON.parse(e);return O(r.data)}catch{}return{"2026-09-17":{date:"2026-09-17",summaryText:"☀️ Clear sky • 10% rain 2pm",maxPrecipProb:10,currentTemp:82},"2026-09-18":{date:"2026-09-18",summaryText:"🌤️ Partly cloudy • 20% rain 3pm",maxPrecipProb:20,currentTemp:83},"2026-09-19":{date:"2026-09-19",summaryText:"🌦️ Afternoon showers • 70% rain 1pm / 40% rain 4pm",maxPrecipProb:70,currentTemp:79},"2026-09-20":{date:"2026-09-20",summaryText:"☀️ Mostly sunny • 15% rain 11am",maxPrecipProb:15,currentTemp:84},"2026-09-21":{date:"2026-09-21",summaryText:"☀️ Clear & pleasant • 5% rain 10am",maxPrecipProb:5,currentTemp:81}}}}function O(e){var n;const a={};if(!e||!e.hourly||!e.hourly.time)return a;const r=e.hourly.time,o=e.hourly.precipitation_probability||[],t=e.hourly.temperature_2m||[],s={};for(let d=0;d<r.length;d++){const l=r[d],c=l.split("T")[0];s[c]||(s[c]=[]),s[c].push({time:l,precip:o[d]||0,temp:t[d]||0})}const i=(n=e.current_weather)==null?void 0:n.temperature;return Object.keys(s).forEach(d=>{const l=s[d];let c=0;const p=[];l.forEach(b=>{if(b.precip>c&&(c=b.precip),b.precip>=30){const m=parseInt(b.time.split("T")[1].split(":")[0],10),h=m>=12?"pm":"am",v=m%12===0?12:m%12;p.push(`${b.precip}% rain ${v}${h}`)}});let u="";p.length>0?u=`🌧️ ${p.slice(0,2).join(" / ")}`:c>15?u=`🌤️ Slight chance of rain (${c}%)`:u=`☀️ Fair & sunny (Low precip: ${c}%)`,a[d]={date:d,summaryText:u,maxPrecipProb:c,currentTemp:i}}),a}function V(e,a){const r=[...e.activities].filter(t=>!t.deleted).sort((t,s)=>t.sortOrder-s.sortOrder);if(!a)return r.filter(t=>!t.hidden&&t.type!=="rain_backup");const o=new Set;return r.forEach(t=>{t.rainAlternativeId&&o.add(t.rainAlternativeId)}),r.filter(t=>t.rainAlternativeId?!1:t.type==="rain_backup"||o.has(t.id)?!0:!(t.weather&&t.weather.sunny&&!t.weather.rainy))}function me(e,a){if(e.length===0)return{};let r=a;if(!r){const i=new Date;r=`${String(i.getHours()).padStart(2,"0")}:${String(i.getMinutes()).padStart(2,"0")}`}const o=e.find(i=>{if(!i.time)return!1;const n=i.time,d=i.end||i.time;return n<=r&&r<=d});if(o){const i=e.indexOf(o),n=e.slice(i+1).find(d=>!d.completed);return{nowActivityId:o.id,nextActivityId:n==null?void 0:n.id}}const t=e.findIndex(i=>i.time&&i.time>r);if(t!==-1)return{nextActivityId:e[t].id};const s=e.find(i=>!i.completed);return{nextActivityId:s==null?void 0:s.id}}let I="2026-09-18",k=null,H={};fe().then(e=>{H=e});function qe(e=!1){const a=f(),r=a.settings.rainMode,o=new Date().toISOString().split("T")[0];a.days.find(c=>c.date===o)&&I!==o&&(I=o);const s=a.days.find(c=>c.date===I)||a.days[1]||a.days[0],i=V(s,r),{nowActivityId:n,nextActivityId:d}=s.date===o?me(i):{},l=H[s.date];return e?he(s,i,n,d,r,l,a.days):xe(s,i,n,d,r,l,a.days)}function xe(e,a,r,o,t=!1,s,i=[]){return`
    <section class="space-y-4">
      <!-- Rain Mode Indicator if ON -->
      ${t?`
        <div class="p-3 bg-indigo-950 border-2 border-indigo-500 rounded-xl text-indigo-200 flex items-center justify-between shadow-lg">
          <div class="flex items-center gap-2">
            <span class="text-xl">🌧️</span>
            <div>
              <p class="font-bold text-sm text-indigo-100">Plan-B Rain Mode Active</p>
              <p class="text-xs text-indigo-300">Indoor backup activities swapped in place.</p>
            </div>
          </div>
          <button id="btn-disable-rain" class="px-3 py-1 bg-indigo-800 hover:bg-indigo-700 text-xs font-semibold text-white rounded-lg border border-indigo-600">
            Disable
          </button>
        </div>
      `:""}

      <!-- Date Switcher Bar -->
      <div class="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
        ${i.map(n=>`
          <button
            data-day-date="${n.date}"
            class="btn-select-day px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${n.date===e.date?"bg-teal-600 text-white font-bold shadow":"bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}"
          >
            ${n.label.split(" - ")[0]}
          </button>
        `).join("")}
      </div>

      <!-- Weather Micro-forecast Header -->
      <div class="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between text-xs text-slate-300">
        <div class="flex items-center gap-2">
          <span class="text-base">🌡️</span>
          <span><strong>Forecast:</strong> ${s?s.summaryText:"☀️ 83°F • Low Precip Risk"}</span>
        </div>
        <span class="text-[10px] bg-slate-700 px-2 py-0.5 rounded font-mono text-slate-400">Charleston BBox</span>
      </div>

      <!-- Day Title -->
      <div class="flex items-center justify-between border-b border-slate-700 pb-2">
        <div>
          <h2 class="text-lg font-bold text-slate-100">${e.label}</h2>
          <p class="text-xs text-slate-400">${e.date} • ${a.length} activities scheduled</p>
        </div>
      </div>

      <!-- Activities Timeline -->
      <div class="space-y-3">
        ${a.length===0?'<div class="p-8 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-slate-700/50">No activities scheduled for this day.</div>':a.map(n=>{var v,w,$,S,_;const d=n.id===r,l=n.id===o,c=E(n),p=((v=n.location)==null?void 0:v.address)||((w=n.location)==null?void 0:w.name)||"",u=p?T(p):"",b=p?C(p):"";let m="",h="border-slate-700 hover:border-slate-600 bg-slate-800";return d?(m='<span class="px-2 py-0.5 text-xs font-bold bg-emerald-900 text-emerald-300 border border-emerald-600 rounded-full animate-pulse">⏰ NOW</span>',h="border-2 border-emerald-500 bg-slate-800 shadow-lg shadow-emerald-950/40"):l&&(m='<span class="px-2 py-0.5 text-xs font-bold bg-cyan-900 text-cyan-300 border border-cyan-600 rounded-full">NEXT</span>',h="border-2 border-cyan-500/80 bg-slate-800"),`
            <div class="p-4 rounded-xl border ${h} transition space-y-3 ${n.completed?"opacity-60 bg-slate-800/50":""}">
              <!-- Card Header -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-act-id="${n.id}"
                    data-day-date="${e.date}"
                    class="chk-toggle-act w-5 h-5 accent-teal-500 rounded cursor-pointer"
                    ${n.completed?"checked":""}
                  />
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono font-bold bg-slate-700 text-teal-300 px-2 py-0.5 rounded">
                        ${n.time||"All Day"}${n.end?` - ${n.end}`:""}
                      </span>
                      ${m}
                      ${($=n.reservation)!=null&&$.required?'<span class="text-[10px] font-semibold uppercase px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded">Res Reserved</span>':""}
                      ${n.type==="rain_backup"?'<span class="text-[10px] font-semibold uppercase px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded">🌧️ Rain Backup</span>':""}
                    </div>
                    <h3 class="font-bold text-slate-100 text-base mt-1 ${n.completed?"line-through text-slate-400":""}">${n.title}</h3>
                  </div>
                </div>
              </div>

              <!-- Location & Notes -->
              ${(S=n.location)!=null&&S.name?`
                <p class="text-xs text-slate-300 flex items-center gap-1">
                  📍 <strong class="text-slate-200">${n.location.name}</strong> ${n.location.address?`(${n.location.address})`:""}
                </p>
              `:""}

              ${n.notes?`
                <p class="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                  ${n.notes}
                </p>
              `:""}

              ${n.tips?`
                <div class="text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/60">
                  💡 <strong>Tip:</strong> ${n.tips}
                </div>
              `:""}

              <!-- SubStops if any -->
              ${n.subStops&&n.subStops.length>0?`
                <div class="space-y-1.5 pl-3 border-l-2 border-teal-500/50 my-2">
                  <p class="text-xs font-semibold text-teal-400 uppercase tracking-wider">Sub-Stops & Highlights</p>
                  ${n.subStops.map(D=>`
                    <div class="text-xs bg-slate-900/40 p-2 rounded border border-slate-800">
                      <strong class="text-slate-200">${D.name}</strong> (${D.address})
                      <p class="text-slate-400 mt-0.5">${D.notes}</p>
                    </div>
                  `).join("")}
                </div>
              `:""}

              <!-- Transit Action Buttons -->
              <div class="pt-2 border-t border-slate-700/60 space-y-2">
                <div class="flex flex-wrap gap-2">
                  ${p?`
                    <a
                      href="${u}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-black hover:bg-slate-900 text-white font-medium rounded-lg border border-slate-700 transition"
                    >
                      🚗 ${j(((_=n.location)==null?void 0:_.name)||"Destination")}
                    </a>
                    <a
                      href="${b}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-medium rounded-lg border border-blue-700 transition"
                    >
                      🗺️ Google Maps Directions
                    </a>
                  `:""}
                </div>

                <!-- Water Taxi Info Card if applicable -->
                ${c?`
                  <div class="p-3 bg-sky-950/60 border border-sky-800 rounded-lg text-xs text-sky-200 space-y-1">
                    <div class="flex items-center justify-between font-bold text-sky-300">
                      <span>⛵ Charleston Water Taxi Info</span>
                      <a href="https://www.charlestonwatertaxi.com/schedule" target="_blank" class="underline text-sky-400">Schedule →</a>
                    </div>
                    <p>${N().passInfo}</p>
                    <p class="text-sky-300/80 text-[11px]">${N().notes}</p>
                  </div>
                `:""}
              </div>

              <!-- Day Editor Actions -->
              <div class="pt-2 flex items-center justify-between border-t border-slate-700/40 text-xs">
                <div class="flex items-center gap-1">
                  <button
                    data-act-id="${n.id}"
                    data-day-date="${e.date}"
                    data-dir="up"
                    class="btn-move-act px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium"
                    title="Move Up"
                  >
                    ⬆ Up
                  </button>
                  <button
                    data-act-id="${n.id}"
                    data-day-date="${e.date}"
                    data-dir="down"
                    class="btn-move-act px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium"
                    title="Move Down"
                  >
                    ⬇ Down
                  </button>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    data-act-id="${n.id}"
                    data-day-date="${e.date}"
                    class="btn-insert-after px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-teal-300 rounded font-medium"
                  >
                    ➕ Insert After
                  </button>
                  <button
                    data-act-id="${n.id}"
                    data-day-date="${e.date}"
                    class="btn-soft-delete px-2 py-1 text-red-400 hover:bg-red-950/60 rounded"
                    title="Soft Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <!-- Insert After Form Container if toggled -->
              ${k===n.id?`
                <div class="p-3 bg-slate-900 border border-teal-600 rounded-lg space-y-2 mt-2">
                  <h4 class="text-xs font-bold text-teal-400 uppercase">Insert Activity After "${n.title}"</h4>
                  <input id="input-new-title" type="text" placeholder="Activity Title (required)" class="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-100" />
                  <div class="grid grid-cols-2 gap-2">
                    <input id="input-new-time" type="time" class="text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-100" value="12:00" />
                    <input id="input-new-location" type="text" placeholder="Location Name" class="text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-100" />
                  </div>
                  <textarea id="input-new-notes" placeholder="Notes & tips" class="w-full text-xs p-2 bg-slate-800 border border-slate-700 rounded text-slate-100 h-16"></textarea>
                  <div class="flex justify-end gap-2">
                    <button id="btn-cancel-insert" class="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded">Cancel</button>
                    <button id="btn-confirm-insert" data-act-id="${n.id}" data-day-date="${e.date}" class="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-500 text-white font-bold rounded">Save Activity</button>
                  </div>
                </div>
              `:""}
            </div>
          `}).join("")}
      </div>
    </section>
  `}function he(e,a,r,o,t=!1,s,i=[]){return`
    <section class="space-y-4">
      <!-- Rain Mode Indicator -->
      ${t?`
        <div class="eink-card border-4 border-black p-3 bg-white text-black mb-3">
          <div class="flex justify-between items-center">
            <span class="font-bold text-base uppercase">[RAIN MODE ACTIVE]</span>
            <button id="btn-disable-rain" class="eink-btn text-xs py-1 px-2">DISABLE</button>
          </div>
        </div>
      `:""}

      <!-- Day Selector Bar -->
      <div class="flex gap-2 overflow-x-auto pb-2">
        ${i.map(n=>`
          <button
            data-day-date="${n.date}"
            class="btn-select-day eink-btn text-xs py-2 px-3 whitespace-nowrap ${n.date===e.date?"active font-bold":""}"
          >
            ${n.label.split(" - ")[0]}
          </button>
        `).join("")}
      </div>

      <!-- Weather Summary -->
      <div class="eink-card p-2 text-sm font-bold border-2 border-black">
        WEATHER: ${s?s.summaryText:"83°F • Low Precip Risk"}
      </div>

      <!-- Day Header -->
      <div class="border-b-2 border-black pb-2">
        <h2 class="text-xl font-bold uppercase">${e.label}</h2>
        <p class="text-sm font-serif">${e.date} • ${a.length} ITEMS</p>
      </div>

      <!-- Activities List -->
      <div class="space-y-4">
        ${a.length===0?'<div class="eink-card p-4 text-center font-bold">NO ACTIVITIES FOR THIS DAY</div>':a.map(n=>{var h,v,w,$,S;const d=n.id===r,l=n.id===o,c=E(n),p=((h=n.location)==null?void 0:h.address)||((v=n.location)==null?void 0:v.name)||"",u=p?T(p):"",b=p?C(p):"";let m="";return d?m=" [NOW]":l&&(m=" [NEXT]"),`
            <div class="eink-card ${d?"border-4":""} ${n.completed?"opacity-70":""}">
              <div class="flex justify-between items-start border-b border-black pb-2 mb-2">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-act-id="${n.id}"
                    data-day-date="${e.date}"
                    class="chk-toggle-act w-6 h-6 accent-black"
                    ${n.completed?"checked":""}
                  />
                  <div>
                    <span class="text-base font-mono font-bold">[${n.time||"ALL DAY"}]${m}</span>
                    <h3 class="text-lg font-bold ${n.completed?"line-through":""}">${n.title}</h3>
                  </div>
                </div>
                ${(w=n.reservation)!=null&&w.required?'<span class="text-xs border-2 border-black px-2 py-0.5 font-bold">[RESERVED]</span>':""}
              </div>

              ${($=n.location)!=null&&$.name?`<p class="text-sm font-bold my-1">LOCATION: ${n.location.name} ${n.location.address?`(${n.location.address})`:""}</p>`:""}
              ${n.notes?`<p class="text-sm border-l-4 border-black pl-2 py-1 my-2 font-serif">${n.notes}</p>`:""}

              <!-- Transit Buttons -->
              <div class="mt-3 pt-2 border-t border-black space-y-2">
                ${p?`
                  <div class="flex flex-col gap-2">
                    <a href="${u}" target="_blank" class="eink-btn text-center block text-sm font-bold">
                      🚗 ${j(((S=n.location)==null?void 0:S.name)||"Destination").toUpperCase()}
                    </a>
                    <a href="${b}" target="_blank" class="eink-btn text-center block text-sm font-bold">
                      🗺️ MAPS DIRECTIONS
                    </a>
                  </div>
                `:""}

                ${c?`
                  <div class="border-2 border-black p-2 text-xs font-bold">
                    ⛵ WATER TAXI: $14 All-Day Pass (Buy on boat). Docks: Patriots Pt / Aquarium / Waterfront Park.
                  </div>
                `:""}
              </div>

              <!-- Day Editor Buttons -->
              <div class="mt-3 pt-2 border-t border-black grid grid-cols-2 gap-2">
                <button data-act-id="${n.id}" data-day-date="${e.date}" data-dir="up" class="btn-move-act eink-btn text-xs">
                  ⬆ MOVE UP
                </button>
                <button data-act-id="${n.id}" data-day-date="${e.date}" data-dir="down" class="btn-move-act eink-btn text-xs">
                  ⬇ MOVE DOWN
                </button>
                <button data-act-id="${n.id}" data-day-date="${e.date}" class="btn-insert-after eink-btn text-xs col-span-2">
                  ➕ INSERT AFTER
                </button>
                <button data-act-id="${n.id}" data-day-date="${e.date}" class="btn-soft-delete eink-btn text-xs col-span-2">
                  🗑️ DELETE ACTIVITY
                </button>
              </div>

              ${k===n.id?`
                <div class="border-2 border-black p-3 bg-white space-y-2 mt-2">
                  <h4 class="text-sm font-bold uppercase">Insert Activity After "${n.title}"</h4>
                  <input id="input-new-title" type="text" placeholder="Title" class="w-full text-sm p-2 border-2 border-black font-serif" />
                  <input id="input-new-time" type="time" class="w-full text-sm p-2 border-2 border-black font-mono" value="12:00" />
                  <input id="input-new-location" type="text" placeholder="Location Name" class="w-full text-sm p-2 border-2 border-black font-serif" />
                  <textarea id="input-new-notes" placeholder="Notes" class="w-full text-sm p-2 border-2 border-black font-serif h-16"></textarea>
                  <div class="flex gap-2">
                    <button id="btn-cancel-insert" class="eink-btn text-xs flex-1">CANCEL</button>
                    <button id="btn-confirm-insert" data-act-id="${n.id}" data-day-date="${e.date}" class="eink-btn text-xs flex-1 font-bold">SAVE</button>
                  </div>
                </div>
              `:""}
            </div>
          `}).join("")}
      </div>
    </section>
  `}function ge(e,a){e.querySelectorAll(".chk-toggle-act").forEach(s=>{s.addEventListener("change",async i=>{const n=i.target,d=n.dataset.actId,l=n.dataset.dayDate;d&&l&&(await U(l,d),a())})}),e.querySelectorAll(".btn-select-day").forEach(s=>{s.addEventListener("click",i=>{const n=i.target.closest(".btn-select-day");n&&n.dataset.dayDate&&(I=n.dataset.dayDate,a())})});const r=e.querySelector("#btn-disable-rain");r&&r.addEventListener("click",async()=>{await P(!1),a()}),e.querySelectorAll(".btn-move-act").forEach(s=>{s.addEventListener("click",async i=>{const n=i.target.closest(".btn-move-act"),d=n.dataset.actId,l=n.dataset.dayDate,c=n.dataset.dir;d&&l&&c&&(await re(l,d,c),a())})}),e.querySelectorAll(".btn-insert-after").forEach(s=>{s.addEventListener("click",i=>{const d=i.target.closest(".btn-insert-after").dataset.actId;d&&(k=k===d?null:d,a())})});const o=e.querySelector("#btn-cancel-insert");o&&o.addEventListener("click",()=>{k=null,a()});const t=e.querySelector("#btn-confirm-insert");t&&t.addEventListener("click",async s=>{const i=s.target,n=i.dataset.actId,d=i.dataset.dayDate,l=e.querySelector("#input-new-title"),c=e.querySelector("#input-new-time"),p=e.querySelector("#input-new-location"),u=e.querySelector("#input-new-notes");n&&d&&l&&l.value.trim()&&(await se(d,n,{title:l.value.trim(),time:(c==null?void 0:c.value)||"12:00",locationName:(p==null?void 0:p.value)||"",notes:(u==null?void 0:u.value)||""}),k=null,a())}),e.querySelectorAll(".btn-soft-delete").forEach(s=>{s.addEventListener("click",async i=>{const n=i.target.closest(".btn-soft-delete"),d=n.dataset.actId,l=n.dataset.dayDate;d&&l&&confirm("Are you sure you want to delete this activity?")&&(await ne(l,d),a())})})}let G="2026-09-18";function Be(e=!1){const a=f(),r=a.settings.rainMode,o=a.days,t=o.find(i=>i.date===G)||o[0],s=V(t,r);return e?ve(o,t,s):ye(o,t,s,r)}function ye(e,a,r,o){return`
    <section class="space-y-5">
      <div class="border-b border-slate-700 pb-2 flex justify-between items-end">
        <div>
          <h2 class="text-xl font-bold text-slate-100">5-Day Trip Itinerary</h2>
          <p class="text-xs text-slate-400">Sep 17 – Sep 21 • Charleston & Mount Pleasant</p>
        </div>
        ${o?'<span class="text-xs px-2 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded font-semibold">🌧️ Rain Plan ON</span>':""}
      </div>

      <!-- Day Navigation Tabs -->
      <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        ${e.map(t=>`
          <button
            data-day-date="${t.date}"
            class="btn-select-itin-day flex-1 min-w-[110px] p-2.5 rounded-xl border text-left transition ${t.date===a.date?"bg-teal-600 text-white border-teal-500 shadow-md font-bold":"bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"}"
          >
            <div class="text-[10px] uppercase tracking-wider ${t.date===a.date?"text-teal-200":"text-slate-400"}">${t.date}</div>
            <div class="text-xs font-bold truncate">${t.label.split(" - ")[0]}</div>
          </button>
        `).join("")}
      </div>

      <!-- Active Day Header -->
      <div class="p-4 bg-slate-800/90 rounded-xl border border-slate-700 space-y-1">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold text-teal-400">${a.label}</h3>
          <span class="text-xs px-2.5 py-1 bg-slate-700 text-slate-200 rounded font-mono font-semibold">
            ${r.length} activities
          </span>
        </div>
        <p class="text-xs text-slate-400">Full timeline for ${a.date}. Reorder or add custom activities below.</p>
      </div>

      <!-- Activity Timeline -->
      <div class="space-y-3">
        ${r.length===0?'<div class="p-6 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-slate-700/50">No activities scheduled for this day.</div>':r.map(t=>{var l,c,p,u,b;const s=E(t),i=((l=t.location)==null?void 0:l.address)||((c=t.location)==null?void 0:c.name)||"",n=i?T(i):"",d=i?C(i):"";return`
            <div class="p-4 rounded-xl border border-slate-700 bg-slate-800 space-y-3 ${t.completed?"opacity-60 bg-slate-800/50":""}">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-act-id="${t.id}"
                    data-day-date="${a.date}"
                    class="chk-toggle-act w-5 h-5 accent-teal-500 rounded cursor-pointer"
                    ${t.completed?"checked":""}
                  />
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono font-bold bg-slate-700 text-teal-300 px-2 py-0.5 rounded">
                        ${t.time||"All Day"}${t.end?` - ${t.end}`:""}
                      </span>
                      ${(p=t.reservation)!=null&&p.required?'<span class="text-[10px] font-semibold uppercase px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded">Res Reserved</span>':""}
                      ${t.type==="rain_backup"?'<span class="text-[10px] font-semibold uppercase px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded">🌧️ Rain Backup</span>':""}
                    </div>
                    <h4 class="font-bold text-slate-100 text-base mt-1 ${t.completed?"line-through text-slate-400":""}">${t.title}</h4>
                  </div>
                </div>
              </div>

              ${(u=t.location)!=null&&u.name?`<p class="text-xs text-slate-300 flex items-center gap-1">📍 <strong class="text-slate-200">${t.location.name}</strong> ${t.location.address?`(${t.location.address})`:""}</p>`:""}
              ${t.notes?`<p class="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed">${t.notes}</p>`:""}

              <!-- Transit Action Buttons -->
              <div class="pt-2 border-t border-slate-700/60 space-y-2">
                <div class="flex flex-wrap gap-2">
                  ${i?`
                    <a href="${n}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-black text-white font-medium rounded-lg border border-slate-700">
                      🚗 ${j(((b=t.location)==null?void 0:b.name)||"Destination")}
                    </a>
                    <a href="${d}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-900/60 text-blue-200 font-medium rounded-lg border border-blue-700">
                      🗺️ Maps Directions
                    </a>
                  `:""}
                </div>
                ${s?`
                  <div class="p-3 bg-sky-950/60 border border-sky-800 rounded-lg text-xs text-sky-200 space-y-1">
                    <div class="flex items-center justify-between font-bold text-sky-300">
                      <span>⛵ Charleston Water Taxi Info</span>
                      <a href="https://www.charlestonwatertaxi.com/schedule" target="_blank" class="underline text-sky-400">Schedule →</a>
                    </div>
                    <p>${N().passInfo}</p>
                  </div>
                `:""}
              </div>

              <!-- Reordering / Editor Controls -->
              <div class="pt-2 flex items-center justify-between border-t border-slate-700/40 text-xs">
                <div class="flex items-center gap-1">
                  <button data-act-id="${t.id}" data-day-date="${a.date}" data-dir="up" class="btn-move-act px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium">⬆ Up</button>
                  <button data-act-id="${t.id}" data-day-date="${a.date}" data-dir="down" class="btn-move-act px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium">⬇ Down</button>
                </div>
                <div class="flex items-center gap-1">
                  <button data-act-id="${t.id}" data-day-date="${a.date}" class="btn-insert-after px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-teal-300 rounded font-medium">➕ Insert After</button>
                  <button data-act-id="${t.id}" data-day-date="${a.date}" class="btn-soft-delete px-2 py-1 text-red-400 hover:bg-red-950/60 rounded">🗑️</button>
                </div>
              </div>
            </div>
          `}).join("")}
      </div>
    </section>
  `}function ve(e,a,r,o){return`
    <section class="space-y-4">
      <div class="border-b-2 border-black pb-2">
        <h2 class="text-xl font-bold uppercase">5-Day Itinerary</h2>
        <p class="text-sm font-serif">Sep 17 – Sep 21 • Charleston Family Trip</p>
      </div>

      <!-- Day Selector -->
      <div class="flex gap-2 overflow-x-auto pb-2">
        ${e.map(t=>`
          <button
            data-day-date="${t.date}"
            class="btn-select-itin-day eink-btn text-xs py-2 px-3 whitespace-nowrap ${t.date===a.date?"active font-bold":""}"
          >
            ${t.label.split(" - ")[0]}
          </button>
        `).join("")}
      </div>

      <!-- Active Day Header -->
      <div class="eink-card p-3 border-2 border-black">
        <h3 class="text-lg font-bold uppercase">${a.label}</h3>
        <p class="text-sm font-bold font-mono">${a.date} • ${r.length} ITEMS</p>
      </div>

      <!-- Timeline -->
      <div class="space-y-4">
        ${r.length===0?'<div class="eink-card p-4 text-center font-bold">NO ACTIVITIES FOR THIS DAY</div>':r.map(t=>{var d,l,c,p,u,b;E(t);const s=((d=t.location)==null?void 0:d.address)||((l=t.location)==null?void 0:l.name)||"",i=s?T(s):"",n=s?C(s):"";return`
            <div class="eink-card ${t.completed?"opacity-70":""}">
              <div class="flex justify-between items-start border-b border-black pb-2 mb-2">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-act-id="${t.id}"
                    data-day-date="${a.date}"
                    class="chk-toggle-act w-6 h-6 accent-black"
                    ${t.completed?"checked":""}
                  />
                  <div>
                    <span class="text-base font-mono font-bold">[${t.time||"ALL DAY"}]</span>
                    <h3 class="text-lg font-bold ${t.completed?"line-through":""}">${t.title}</h3>
                  </div>
                </div>
                ${(c=t.reservation)!=null&&c.required?'<span class="text-xs border-2 border-black px-2 py-0.5 font-bold">[RESERVED]</span>':""}
              </div>

              ${(p=t.location)!=null&&p.name?`<p class="text-sm font-bold my-1">LOCATION: ${t.location.name}</p>`:""}
              ${t.notes?`<p class="text-sm border-l-4 border-black pl-2 py-1 my-2 font-serif">${t.notes}</p>`:""}

              <div class="mt-3 pt-2 border-t border-black space-y-2">
                ${s?`
                  <div class="flex flex-col gap-2">
                    <a href="${i}" target="_blank" class="eink-btn text-center block text-sm font-bold">🚗 UBER TO ${((b=(u=t.location)==null?void 0:u.name)==null?void 0:b.toUpperCase())||"DESTINATION"}</a>
                    <a href="${n}" target="_blank" class="eink-btn text-center block text-sm font-bold">🗺️ MAPS DIRECTIONS</a>
                  </div>
                `:""}
              </div>

              <div class="mt-3 pt-2 border-t border-black grid grid-cols-2 gap-2">
                <button data-act-id="${t.id}" data-day-date="${a.date}" data-dir="up" class="btn-move-act eink-btn text-xs">⬆ MOVE UP</button>
                <button data-act-id="${t.id}" data-day-date="${a.date}" data-dir="down" class="btn-move-act eink-btn text-xs">⬇ MOVE DOWN</button>
                <button data-act-id="${t.id}" data-day-date="${a.date}" class="btn-insert-after eink-btn text-xs col-span-2">➕ INSERT AFTER</button>
                <button data-act-id="${t.id}" data-day-date="${a.date}" class="btn-soft-delete eink-btn text-xs col-span-2">🗑️ DELETE ACTIVITY</button>
              </div>
            </div>
          `}).join("")}
      </div>
    </section>
  `}function je(e,a){ge(e,a),e.querySelectorAll(".btn-select-itin-day").forEach(r=>{r.addEventListener("click",o=>{const t=o.target.closest(".btn-select-itin-day");t&&t.dataset.dayDate&&(G=t.dataset.dayDate,a())})})}function F(e,a){const r=e.replace(/-/g,"");if(!a)return r;const o=a.replace(/:/g,"")+"00";return`${r}T${o}`}function ke(e,a){var d,l,c;const r=F(a.date,e.time||"09:00"),o=F(a.date,e.end||e.time||"10:00"),t=e.title,s=(e.notes||"")+((d=e.reservation)!=null&&d.confirmation?` | Conf: ${e.reservation.confirmation}`:""),i=((l=e.location)==null?void 0:l.address)||((c=e.location)==null?void 0:c.name)||"Charleston, SC",n=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Charleston Travel Companion//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",`UID:res-${e.id}-${a.date}@charleston-travel`,`SUMMARY:${t}`,`DESCRIPTION:${s}`,`LOCATION:${i}`,`DTSTART:${r}`,`DTEND:${o}`,"STATUS:CONFIRMED","END:VEVENT","END:VCALENDAR"].join(`\r
`);return new Blob([n],{type:"text/calendar;charset=utf-8"})}function we(e,a){const r=ke(e,a),o=URL.createObjectURL(r),t=document.createElement("a");t.href=o;const s=e.title.toLowerCase().replace(/[^a-z0-9]/g,"_");t.download=`reservation_${s}.ics`,document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(o)}function J(e,a){const r=`${e}T${a||"09:00"}:00`,o=new Date(r).getTime(),t=new Date().getTime(),s=o-t;if(isNaN(o))return"Scheduled";if(s<=0)return s>-2*60*60*1e3?"⏰ Happening Now":"Passed";const i=Math.floor(s/(1e3*60)),n=Math.floor(i/(60*24)),d=Math.floor(i%(60*24)/60),l=i%60;return n>0?`In ${n}d ${d}h ${l}m`:`In ${d}h ${l}m`}function _e(e=!1){const a=f(),r=[];return a.days.forEach(o=>{o.activities.forEach(t=>{!t.deleted&&t.reservation&&t.reservation.required&&r.push({day:o,activity:t})})}),e?Se(r):$e(r)}function $e(e){return`
    <section class="space-y-4">
      <div class="border-b border-slate-700 pb-2 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-slate-100">Reservations & Hard Stops</h2>
          <p class="text-xs text-slate-400">Timed bookings, confirmation numbers & calendar sync</p>
        </div>
        <span class="text-xs font-mono font-bold px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-full">
          ${e.length} Required
        </span>
      </div>

      <div class="space-y-3">
        ${e.length===0?'<div class="p-8 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-slate-700/50">No required reservations found.</div>':e.map(({day:a,activity:r})=>{var s,i,n;const o=J(a.date,r.time),t=(s=r.reservation)!=null&&s.cost?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(r.reservation.cost):null;return`
            <div class="p-4 bg-slate-800 rounded-xl border border-amber-900/60 shadow-sm space-y-3 ${r.completed?"opacity-60 bg-slate-800/50":""}">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-act-id="${r.id}"
                    data-day-date="${a.date}"
                    class="chk-toggle-res w-5 h-5 accent-amber-500 rounded cursor-pointer"
                    ${r.completed?"checked":""}
                  />
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                        📅 ${a.label.split(" - ")[0]} @ ${r.time||"All Day"}
                      </span>
                      <span class="text-xs font-bold bg-slate-700 text-teal-300 px-2 py-0.5 rounded">
                        ⏳ ${o}
                      </span>
                    </div>
                    <h3 class="font-bold text-slate-100 text-base mt-1 ${r.completed?"line-through text-slate-400":""}">${r.title}</h3>
                  </div>
                </div>
              </div>

              ${(i=r.location)!=null&&i.name?`<p class="text-xs text-slate-300">📍 <strong>${r.location.name}</strong> ${r.location.address?`(${r.location.address})`:""}</p>`:""}

              <!-- Reservation Details Grid -->
              <div class="grid grid-cols-2 gap-2 text-xs bg-slate-900/70 p-3 rounded-lg border border-slate-700/80 font-mono">
                <div>
                  <span class="text-slate-400 block text-[10px] uppercase">Confirmation #</span>
                  <span class="text-amber-300 font-bold">${((n=r.reservation)==null?void 0:n.confirmation)||"Confirmed"}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px] uppercase">Estimated Cost</span>
                  <span class="text-slate-100 font-bold">${t||"Pre-paid / Included"}</span>
                </div>
              </div>

              ${r.notes?`<p class="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">${r.notes}</p>`:""}

              <!-- Action Bar -->
              <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                <button
                  data-act-id="${r.id}"
                  data-day-date="${a.date}"
                  class="btn-download-ics inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition"
                >
                  📅 Add to Calendar (.ics)
                </button>
                <span class="text-xs text-slate-400">${r.completed?"✅ Done":"⏳ Pending"}</span>
              </div>
            </div>
          `}).join("")}
      </div>
    </section>
  `}function Se(e){return`
    <section class="space-y-4">
      <div class="border-b-2 border-black pb-2">
        <h2 class="text-xl font-bold uppercase">Reservations Panel</h2>
        <p class="text-sm font-serif">${e.length} HARD STOPS & BOOKINGS</p>
      </div>

      <div class="space-y-4">
        ${e.length===0?'<div class="eink-card p-4 text-center font-bold">NO REQUIRED RESERVATIONS</div>':e.map(({day:a,activity:r})=>{var s,i,n;const o=J(a.date,r.time),t=(s=r.reservation)!=null&&s.cost?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(r.reservation.cost):null;return`
            <div class="eink-card ${r.completed?"opacity-70":""}">
              <div class="flex justify-between items-start border-b border-black pb-2 mb-2">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-act-id="${r.id}"
                    data-day-date="${a.date}"
                    class="chk-toggle-res w-6 h-6 accent-black"
                    ${r.completed?"checked":""}
                  />
                  <div>
                    <span class="text-base font-mono font-bold">[${a.label.split(" - ")[0]} @ ${r.time||"ALL DAY"}]</span>
                    <h3 class="text-lg font-bold ${r.completed?"line-through":""}">${r.title}</h3>
                  </div>
                </div>
                <span class="text-xs border-2 border-black px-2 py-0.5 font-bold font-mono">[${o}]</span>
              </div>

              ${(i=r.location)!=null&&i.name?`<p class="text-sm font-bold my-1">LOCATION: ${r.location.name}</p>`:""}
              <div class="border border-black p-2 text-sm font-mono my-2 font-bold">
                CONFIRMATION: ${((n=r.reservation)==null?void 0:n.confirmation)||"CONFIRMED"}<br/>
                COST: ${t||"INCLUDED"}
              </div>
              ${r.notes?`<p class="text-sm border-l-4 border-black pl-2 py-1 my-2 font-serif">${r.notes}</p>`:""}

              <div class="mt-3 pt-2 border-t border-black">
                <button
                  data-act-id="${r.id}"
                  data-day-date="${a.date}"
                  class="btn-download-ics eink-btn w-full text-sm font-bold"
                >
                  📅 ADD TO CALENDAR (.ICS)
                </button>
              </div>
            </div>
          `}).join("")}
      </div>
    </section>
  `}function We(e,a){e.querySelectorAll(".chk-toggle-res").forEach(r=>{r.addEventListener("change",async o=>{const t=o.target,s=t.dataset.actId,i=t.dataset.dayDate;s&&i&&(await U(i,s),a())})}),e.querySelectorAll(".btn-download-ics").forEach(r=>{r.addEventListener("click",o=>{const t=o.target.closest(".btn-download-ics"),s=t.dataset.actId,i=t.dataset.dayDate;if(s&&i){const d=f().days.find(c=>c.date===i),l=d==null?void 0:d.activities.find(c=>c.id===s);d&&l&&we(l,d)}})})}function Fe(e=!1){const r=f().packing||[],o=r.length,t=r.filter(n=>n.packed).length,s=o>0?Math.round(t/o*100):0,i={};return r.forEach(n=>{const d=n.category||"General";i[d]||(i[d]=[]),i[d].push(n)}),e?Ae(i,o,t,s):Ie(i,o,t,s)}function Ie(e,a,r,o){return`
    <section class="space-y-5">
      <div class="border-b border-slate-700 pb-2 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-slate-100">Packing Checklist</h2>
          <p class="text-xs text-slate-400">Persisted offline checklist for the family trip</p>
        </div>
        <span class="text-xs font-mono font-bold px-2.5 py-1 bg-teal-950 text-teal-300 border border-teal-800 rounded-full">
          ${r} / ${a} Packed (${o}%)
        </span>
      </div>

      <!-- Progress Bar -->
      <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
        <div class="bg-teal-500 h-2.5 rounded-full transition-all duration-300" style="width: ${o}%"></div>
      </div>

      <!-- Add Item Form -->
      <div class="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
        <h3 class="text-xs font-bold text-teal-400 uppercase tracking-wider">➕ Add Packing Item</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input id="input-pack-item" type="text" placeholder="Item name (e.g. Sunscreen)" class="sm:col-span-2 text-xs p-2 bg-slate-900 border border-slate-700 rounded text-slate-100" />
          <input id="input-pack-cat" type="text" placeholder="Category (e.g. Kid Gear)" class="text-xs p-2 bg-slate-900 border border-slate-700 rounded text-slate-100" />
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Qty:</span>
            <input id="input-pack-qty" type="number" value="1" min="1" class="w-16 text-xs p-1 bg-slate-900 border border-slate-700 rounded text-slate-100" />
          </div>
          <button id="btn-add-packing" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition">
            Add to List
          </button>
        </div>
      </div>

      <!-- Categorized Items List -->
      <div class="space-y-4">
        ${Object.keys(e).map(t=>`
          <div class="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-2">
            <h3 class="text-sm font-bold text-teal-300 uppercase tracking-wider border-b border-slate-700/60 pb-1 flex justify-between">
              <span>${t}</span>
              <span class="text-xs font-normal text-slate-400">(${e[t].filter(s=>s.packed).length}/${e[t].length})</span>
            </h3>
            <div class="divide-y divide-slate-700/40">
              ${e[t].map(s=>`
                <div class="py-2 flex items-center justify-between gap-2">
                  <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      data-pack-id="${s.id}"
                      class="chk-toggle-pack w-5 h-5 accent-teal-500 rounded cursor-pointer"
                      ${s.packed?"checked":""}
                    />
                    <span class="text-sm text-slate-100 ${s.packed?"line-through text-slate-400":""} truncate">
                      ${s.item} ${s.qty>1?`<span class="text-xs font-mono font-semibold text-teal-400 ml-1">x${s.qty}</span>`:""}
                    </span>
                  </label>
                  <button
                    data-pack-id="${s.id}"
                    class="btn-del-pack text-xs text-slate-500 hover:text-red-400 p-1"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `}function Ae(e,a,r,o){return`
    <section class="space-y-4">
      <div class="border-b-2 border-black pb-2">
        <h2 class="text-xl font-bold uppercase">Packing Checklist</h2>
        <p class="text-sm font-serif font-bold">${r} OF ${a} ITEMS PACKED (${o}%)</p>
      </div>

      <!-- Add Item Form -->
      <div class="eink-card p-3 space-y-2 border-2 border-black">
        <h3 class="text-sm font-bold uppercase">➕ Add Item</h3>
        <input id="input-pack-item" type="text" placeholder="Item Name" class="w-full text-sm p-2 border-2 border-black font-serif" />
        <div class="flex gap-2">
          <input id="input-pack-cat" type="text" placeholder="Category" class="flex-1 text-sm p-2 border-2 border-black font-serif" />
          <input id="input-pack-qty" type="number" value="1" min="1" class="w-16 text-sm p-2 border-2 border-black font-mono" />
        </div>
        <button id="btn-add-packing" class="eink-btn w-full text-xs font-bold">ADD TO PACKING LIST</button>
      </div>

      <!-- Category List -->
      <div class="space-y-4">
        ${Object.keys(e).map(t=>`
          <div class="eink-card">
            <h3 class="text-base font-bold uppercase border-b-2 border-black pb-1 mb-2 flex justify-between">
              <span>${t}</span>
              <span>[${e[t].filter(s=>s.packed).length}/${e[t].length}]</span>
            </h3>
            <div class="space-y-2">
              ${e[t].map(s=>`
                <div class="flex items-center justify-between border-b border-black/30 pb-2">
                  <label class="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      data-pack-id="${s.id}"
                      class="chk-toggle-pack w-7 h-7 accent-black"
                      ${s.packed?"checked":""}
                    />
                    <span class="text-base font-bold ${s.packed?"line-through":""}">
                      ${s.item} ${s.qty>1?`(x${s.qty})`:""}
                    </span>
                  </label>
                  <button data-pack-id="${s.id}" class="btn-del-pack eink-btn text-xs px-2 py-1">REMOVE</button>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `}function Ue(e,a){e.querySelectorAll(".chk-toggle-pack").forEach(o=>{o.addEventListener("change",async t=>{const i=t.target.dataset.packId;i&&(await oe(i),a())})}),e.querySelectorAll(".btn-del-pack").forEach(o=>{o.addEventListener("click",async t=>{const i=t.target.closest(".btn-del-pack").dataset.packId;i&&(await de(i),a())})});const r=e.querySelector("#btn-add-packing");r&&r.addEventListener("click",async()=>{const o=e.querySelector("#input-pack-item"),t=e.querySelector("#input-pack-cat"),s=e.querySelector("#input-pack-qty");if(o&&o.value.trim()){const i=o.value.trim(),n=(t==null?void 0:t.value.trim())||"General",d=parseInt((s==null?void 0:s.value)||"1",10);await ie(i,n,d),a()}})}function Ve(e=!1){return e?Ce():Te()}function Te(){return`
    <section class="space-y-6">
      <!-- Title Header -->
      <div class="border-b border-slate-700 pb-3">
        <h2 class="text-xl font-bold text-slate-100">Charleston Ideas & Inspiration</h2>
        <p class="text-xs text-slate-400 mt-1">
          Explore our companion planning guide for dining, attractions, neighborhood highlights, family spots, and practical tips.
        </p>
      </div>

      <!-- Main Action Card -->
      <div class="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4 shadow-md text-center sm:text-left">
        <div class="space-y-2">
          <h3 class="text-base font-bold text-teal-400">Companion Travel Guide</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Access our full curated directory of Charleston recommendations, including dining, sights, playgrounds, and insider tips in a separate interactive PWA.
          </p>
        </div>

        <div>
          <a
            href="https://drmmrmik.github.io/pwas/travel-charleston-sc/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-lg transition w-full sm:w-auto"
          >
            <span>💡</span> Open Ideas Directory ↗
          </a>
        </div>
      </div>

      <!-- Categories Grid -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Directory Categories</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div class="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span>🍽️</span>
              <span>Eat & Drink</span>
            </div>
            <p class="text-xs text-slate-400">Curated restaurants, seafood spots, coffee shops, and local delicacies.</p>
          </div>

          <div class="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div class="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span>🏛️</span>
              <span>See & Do</span>
            </div>
            <p class="text-xs text-slate-400">Historic landmarks, waterfront battery walks, museum houses, and tours.</p>
          </div>

          <div class="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div class="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span>🏡</span>
              <span>Neighborhoods</span>
            </div>
            <p class="text-xs text-slate-400">Guides for French Quarter, South of Broad, King Street, and Mount Pleasant.</p>
          </div>

          <div class="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div class="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span>🛝</span>
              <span>Playgrounds & Family</span>
            </div>
            <p class="text-xs text-slate-400">Kid-friendly parks, waterfront splash pads, and family activities.</p>
          </div>

          <div class="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1 sm:col-span-2">
            <div class="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span>💡</span>
              <span>Practical Tips</span>
            </div>
            <p class="text-xs text-slate-400">Parking secrets, water taxi details, weather tips, and itinerary advice.</p>
          </div>
        </div>
      </div>
    </section>
  `}function Ce(){return`
    <section class="space-y-4">
      <div class="border-b-2 border-black pb-2">
        <h2 class="text-xl font-bold uppercase">Charleston Ideas & Inspiration</h2>
        <p class="text-sm font-serif">Companion planning guide for sights, food, and tips.</p>
      </div>

      <div class="eink-card p-4 border-2 border-black space-y-3">
        <h3 class="text-base font-bold uppercase">Companion Travel Directory</h3>
        <p class="text-sm font-serif">
          Jumps to our companion guide featuring Eat, See & Do, Neighborhoods, Playgrounds, and Practical Tips.
        </p>
        <a
          href="https://drmmrmik.github.io/pwas/travel-charleston-sc/"
          target="_blank"
          rel="noopener noreferrer"
          class="eink-btn block w-full py-4 text-center font-bold text-base my-2"
        >
          💡 OPEN IDEAS DIRECTORY ↗
        </a>
      </div>

      <div class="space-y-2">
        <h3 class="text-sm font-bold uppercase">Categories Included:</h3>
        <div class="eink-card p-3 border-2 border-black space-y-2 text-sm font-serif">
          <p><strong>🍽️ Eat & Drink:</strong> Dining, seafood, coffee & treats</p>
          <p><strong>🏛️ See & Do:</strong> Sights, museums & historic spots</p>
          <p><strong>🏡 Neighborhoods:</strong> French Quarter, South of Broad & more</p>
          <p><strong>🛝 Playgrounds:</strong> Parks & kid-friendly spaces</p>
          <p><strong>💡 Practical Tips:</strong> Transit, parking & insider advice</p>
        </div>
      </div>
    </section>
  `}function Ee(){const e=document.body.dataset.version||"0.1.0",a=document.body.dataset.build||"dev";return{version:e,build:a}}function He(e=!1){const a=f(),{version:r,build:o}=Ee(),t=a.settings.rainMode;return e?Oe(t,r,o,a):De(t,r,o,a)}function De(e,a,r,o){return`
    <section class="space-y-6">
      <div class="border-b border-slate-700 pb-2">
        <h2 class="text-xl font-bold text-slate-100">Settings & Plan-B Engine</h2>
        <p class="text-xs text-slate-400">Offline data management, weather overrides & system info</p>
      </div>

      <!-- Rain / Plan-B Toggle Card -->
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-teal-400 uppercase tracking-wider">🌧️ Rain / Plan-B Toggle</h3>
            <p class="text-xs text-slate-300 mt-1">Swaps primary outdoor activities with indoor rain backups inline.</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input id="chk-toggle-rain-settings" type="checkbox" class="sr-only peer" ${e?"checked":""}>
            <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>
        <div class="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-slate-400">
          Status: <strong class="${e?"text-indigo-400":"text-emerald-400"}">${e?"🌧️ Rain Plan ACTIVE (Indoor alternatives swapped)":"☀️ Sunny Plan ACTIVE (Outdoor primary activities)"}</strong>
        </div>
      </div>

      <!-- Backup & Restore Data Section -->
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
        <h3 class="text-sm font-bold text-teal-400 uppercase tracking-wider">💾 Export / Import Trip Data</h3>
        <p class="text-xs text-slate-300">Backup your IndexedDB state to a local JSON file or import a saved trip backup.</p>
        <div class="flex flex-wrap gap-2 pt-1">
          <button id="btn-export-json" class="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5">
            📥 Download JSON Backup
          </button>
          <label class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 border border-slate-600">
            📤 Import JSON File
            <input id="input-import-json" type="file" accept=".json" class="hidden" />
          </label>
          <button id="btn-reset-data" class="px-4 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 font-bold text-xs rounded-lg transition border border-red-800">
            ⚠️ Reset to Default Data
          </button>
        </div>
      </div>

      <!-- E-Ink Variant Switcher -->
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-2">
        <h3 class="text-sm font-bold text-teal-400 uppercase tracking-wider">📱 E-Ink Mode Switcher</h3>
        <p class="text-xs text-slate-300">Open the high-contrast monochrome version optimized for e-paper readers (viwoods AiPaper, Kindle, Onyx Boox).</p>
        <a href="./eink/" class="inline-block text-xs bg-slate-700 text-slate-100 hover:bg-slate-600 px-4 py-2.5 rounded-lg border border-slate-600 font-medium transition">
          Switch to E-Ink Version →
        </a>
      </div>

      <!-- Base Resort & Party Info -->
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-2 text-xs">
        <h3 class="text-sm font-bold text-teal-400 uppercase tracking-wider">🏨 Resort & Party Info</h3>
        <p class="text-sm font-medium text-slate-100">${o.meta.base.name}</p>
        <p class="text-slate-400">${o.meta.base.address}</p>
        <p class="text-slate-300 pt-1"><strong>Party:</strong> ${o.meta.party.join(", ")}</p>
        <p class="text-slate-400"><strong>Transport Notes:</strong> ${o.meta.transport.notes}</p>
      </div>

      <!-- System Information -->
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-2 text-xs font-mono">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Build System Information</h3>
        <div class="grid grid-cols-2 gap-1 text-slate-300">
          <div>Version:</div><div class="font-bold text-slate-100">${a}</div>
          <div>Build Stamp:</div><div class="font-bold text-slate-100">${r}</div>
          <div>Mode:</div><div>Standard PWA (Offline-First)</div>
          <div>IndexedDB Store:</div><div>chs-travel-db (tripState)</div>
        </div>
      </div>
    </section>
  `}function Oe(e,a,r,o){return`
    <section class="space-y-4">
      <div class="border-b-2 border-black pb-2">
        <h2 class="text-xl font-bold uppercase">Settings & Utilities</h2>
      </div>

      <!-- Rain Mode Switch -->
      <div class="eink-card space-y-2 border-2 border-black">
        <h3 class="text-base font-bold uppercase border-b border-black pb-1">🌧️ Rain / Plan-B Mode</h3>
        <p class="text-sm font-serif">Status: <strong>${e?"🌧️ RAIN PLAN ACTIVE":"☀️ SUNNY PLAN ACTIVE"}</strong></p>
        <button id="btn-toggle-rain-eink" class="eink-btn w-full text-sm font-bold">
          TOGGLE RAIN MODE (${e?"TURN OFF":"TURN ON"})
        </button>
      </div>

      <!-- E-Ink Ghosting Refresh Button -->
      <div class="eink-card space-y-2 border-2 border-black">
        <h3 class="text-base font-bold uppercase border-b border-black pb-1">🔄 Display Refresh</h3>
        <button id="btn-refresh-ghosting" class="eink-btn w-full text-sm font-bold">
          🔄 CLEAR GHOSTING (FLIP DISPLAY)
        </button>
      </div>

      <!-- Export / Import -->
      <div class="eink-card space-y-3 border-2 border-black">
        <h3 class="text-base font-bold uppercase border-b border-black pb-1">💾 Export / Import Data</h3>
        <button id="btn-export-json" class="eink-btn w-full text-xs font-bold">
          📥 DOWNLOAD JSON BACKUP
        </button>
        <label class="eink-btn w-full block text-center text-xs font-bold cursor-pointer">
          📤 IMPORT JSON FILE
          <input id="input-import-json" type="file" accept=".json" class="hidden" />
        </label>
        <button id="btn-reset-data" class="eink-btn w-full text-xs font-bold">
          ⚠️ RESET TO DEFAULT DATA
        </button>
      </div>

      <!-- Switch to Standard -->
      <div class="eink-card border-2 border-black">
        <a href="../index.html" class="eink-btn w-full block text-center text-sm font-bold">
          ← SWITCH TO STANDARD PWA
        </a>
      </div>

      <!-- Build Info -->
      <div class="eink-card font-mono text-xs font-bold space-y-1 border-2 border-black">
        <div>Version: ${a}</div>
        <div>Build: ${r}</div>
        <div>Resort: ${o.meta.base.name}</div>
      </div>
    </section>
  `}function Ge(e,a){const r=e.querySelector("#chk-toggle-rain-settings");r&&r.addEventListener("change",async d=>{const l=d.target;await P(l.checked),a()});const o=e.querySelector("#btn-toggle-rain-eink");o&&o.addEventListener("click",async()=>{await P(),a()});const t=e.querySelector("#btn-refresh-ghosting");t&&t.addEventListener("click",()=>{document.body.style.filter="invert(100%)",setTimeout(()=>{document.body.style.filter="none"},300)});const s=e.querySelector("#btn-export-json");s&&s.addEventListener("click",()=>{const d=le(),l=new Blob([d],{type:"application/json"}),c=URL.createObjectURL(l),p=document.createElement("a");p.href=c,p.download=`charleston_trip_backup_${new Date().toISOString().split("T")[0]}.json`,document.body.appendChild(p),p.click(),document.body.removeChild(p),URL.revokeObjectURL(c)});const i=e.querySelector("#input-import-json");i&&i.addEventListener("change",async d=>{const l=d.target.files;if(l&&l.length>0){const c=l[0],p=new FileReader;p.onload=async u=>{var m;const b=(m=u.target)==null?void 0:m.result;b&&(await ce(b)?(alert("Trip data imported successfully!"),a()):alert("Failed to import JSON file. Please verify the format."))},p.readAsText(c)}});const n=e.querySelector("#btn-reset-data");n&&n.addEventListener("click",async()=>{confirm("Are you sure you want to reset all trip data back to original defaults? Any custom edits will be lost.")&&(await pe(),alert("Trip data reset to defaults."),a())})}export{ue as a,qe as b,He as c,Fe as d,_e as e,Be as f,f as g,Ge as h,Ne as i,Ue as j,We as k,Re as l,je as m,ge as n,Me as o,Ve as p,Pe as r,Le as s};
