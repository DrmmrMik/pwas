import{r as c,i as x,s as p,l as g,g as f,a as m,b as i,c as u,d as v,e as h,f as w,h as y,j as k,k as V,m as $,n as E,o as S,p as T,q as I,t as M}from"./settingsView-epUYkGQg.js";c();function B(){const o=document.body.dataset.version||"0.1.0",s=document.body.dataset.build||"dev";return{version:o,build:s}}function e(){const o=document.getElementById("app");if(!o)return;const s=f(),t=m();B();const r=s.settings.rainMode;let a="";switch(t){case"today":a=i(!1);break;case"itinerary":a=y(!1);break;case"map":a=w(!1);break;case"reservations":a=h(!1);break;case"packing":a=v(!1);break;case"ideas":a=M(!1);break;case"settings":a=u(!1);break;default:a=i(!1)}o.innerHTML=`
    <!-- Sticky Header -->
    <header class="bg-slate-800 border-b border-slate-700 p-3.5 sticky top-0 z-20 shadow-md">
      <div class="flex items-center justify-between max-w-2xl mx-auto">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold text-teal-400 leading-tight">${s.meta.title}</h1>
            ${r?'<span class="text-[10px] font-bold px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">🌧️ Rain Mode</span>':""}
          </div>
          <p class="text-xs text-slate-400">${s.meta.start} to ${s.meta.end} • ${s.meta.base.name}</p>
        </div>
        <span class="text-[11px] px-2 py-1 bg-slate-900 text-teal-300 border border-slate-700 rounded font-mono font-bold">PWA v0.2.3</span>
      </div>
    </header>

    <!-- Scrollable Main Body -->
    <main id="main-content-container" class="flex-1 p-4 overflow-y-auto max-w-2xl mx-auto w-full pb-20">
      ${a}
    </main>

    <!-- Sticky Bottom Navigation Bar (7 Tabs) -->
    <nav class="bg-slate-800/95 backdrop-blur border-t border-slate-700 p-1.5 fixed bottom-0 left-0 right-0 z-20 flex justify-around max-w-2xl mx-auto shadow-lg">
      <button
        data-tab="today"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${t==="today"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">📅</span>
        <span class="text-[11px] font-medium leading-none">Today</span>
      </button>
      <button
        data-tab="itinerary"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${t==="itinerary"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">🗓️</span>
        <span class="text-[11px] font-medium leading-none">Itinerary</span>
      </button>
      <button
        data-tab="map"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${t==="map"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">🗺️</span>
        <span class="text-[11px] font-medium leading-none">Map</span>
      </button>
      <button
        data-tab="reservations"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${t==="reservations"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">🎟️</span>
        <span class="text-[11px] font-medium leading-none">Bookings</span>
      </button>
      <button
        data-tab="packing"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${t==="packing"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">🧳</span>
        <span class="text-[11px] font-medium leading-none">Packing</span>
      </button>
      <button
        data-tab="ideas"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${t==="ideas"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">💡</span>
        <span class="text-[11px] font-medium leading-none">Ideas</span>
      </button>
      <button
        data-tab="settings"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${t==="settings"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">⚙️</span>
        <span class="text-[11px] font-medium leading-none">Settings</span>
      </button>
    </nav>
  `;const n=document.getElementById("main-content-container");if(n)switch(t){case"today":T(n,e);break;case"itinerary":S(n,e);break;case"map":E(n,e);break;case"reservations":$(n,e);break;case"packing":V(n,e);break;case"ideas":break;case"settings":k(n,e);break}document.querySelectorAll(".nav-tab-btn").forEach(d=>{d.addEventListener("click",b=>{const l=b.target.closest(".nav-tab-btn").dataset.tab;l&&I(l)})})}x().then(()=>{e(),p(()=>e()),g(()=>e()),window.addEventListener("travel-weather-ready",()=>e())});
