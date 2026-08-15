import{r as x,i as p,s as g,l as f,g as u,a as m,b as l,c as v,d as h,e as w,f as y,h as k,j as $,k as V,m as E,n as B,o as S,p as T,q as I}from"./settingsView-D3erhx08.js";x();function M(){const o=document.body.dataset.version||"0.1.0",n=document.body.dataset.build||"dev";return{version:o,build:n}}function t(){const o=document.getElementById("app");if(!o)return;const n=u(),e=m(),{version:r}=M(),d=n.settings.rainMode;let a="";switch(e){case"today":a=l(!1);break;case"itinerary":a=k(!1);break;case"reservations":a=y(!1);break;case"packing":a=w(!1);break;case"budget":a=h(!1);break;case"settings":a=v(!1);break;default:a=l(!1)}o.innerHTML=`
    <!-- Sticky Header -->
    <header class="bg-slate-800 border-b border-slate-700 p-3.5 sticky top-0 z-20 shadow-md">
      <div class="flex items-center justify-between max-w-2xl mx-auto">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold text-teal-400 leading-tight">${n.meta.title}</h1>
            ${d?'<span class="text-[10px] font-bold px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">🌧️ Rain Mode</span>':""}
          </div>
          <p class="text-xs text-slate-400">${n.meta.start} to ${n.meta.end} • ${n.meta.base.name}</p>
        </div>
        <span class="text-[11px] px-2 py-1 bg-slate-900 text-teal-300 border border-slate-700 rounded font-mono font-bold">PWA v${r}</span>
      </div>
    </header>

    <!-- Scrollable Main Body -->
    <main id="main-content-container" class="flex-1 p-4 overflow-y-auto max-w-2xl mx-auto w-full pb-20">
      ${a}
    </main>

    <!-- Sticky Bottom Navigation Bar (6 Tabs) -->
    <nav class="bg-slate-800/95 backdrop-blur border-t border-slate-700 p-1.5 fixed bottom-0 left-0 right-0 z-20 flex justify-around max-w-2xl mx-auto shadow-lg">
      <button
        data-tab="today"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${e==="today"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">📅</span>
        <span class="text-[11px] font-medium leading-none">Today</span>
      </button>
      <button
        data-tab="itinerary"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${e==="itinerary"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">🗓️</span>
        <span class="text-[11px] font-medium leading-none">Itinerary</span>
      </button>
      <button
        data-tab="reservations"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${e==="reservations"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">🎟️</span>
        <span class="text-[11px] font-medium leading-none">Bookings</span>
      </button>
      <button
        data-tab="packing"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${e==="packing"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">🧳</span>
        <span class="text-[11px] font-medium leading-none">Packing</span>
      </button>
      <button
        data-tab="budget"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${e==="budget"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">💵</span>
        <span class="text-[11px] font-medium leading-none">Budget</span>
      </button>
      <button
        data-tab="settings"
        class="nav-tab-btn flex-1 py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${e==="settings"?"bg-teal-600 text-white font-bold shadow":"text-slate-400 hover:bg-slate-750 hover:text-slate-200"}"
      >
        <span class="text-base">⚙️</span>
        <span class="text-[11px] font-medium leading-none">Settings</span>
      </button>
    </nav>
  `;const s=document.getElementById("main-content-container");if(s)switch(e){case"today":T(s,t);break;case"itinerary":S(s,t);break;case"reservations":B(s,t);break;case"packing":E(s,t);break;case"budget":V(s,t);break;case"settings":$(s,t);break}document.querySelectorAll(".nav-tab-btn").forEach(b=>{b.addEventListener("click",c=>{const i=c.target.closest(".nav-tab-btn").dataset.tab;i&&I(i)})})}p().then(()=>{t(),g(()=>t()),f(()=>t())});
