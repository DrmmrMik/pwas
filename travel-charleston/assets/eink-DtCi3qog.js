import{r as x,i as v,s as f,l as g,g as p,a as k,b,c as m,d as y,e as w,f as E,h,j as I,k as T,m as V,n as $,o as B,p as S,q as A}from"./settingsView-D3erhx08.js";x();function N(){const r=document.body.dataset.version||"0.1.0",s=document.body.dataset.build||"dev";return{version:r,build:s}}function t(){var i;const r=document.getElementById("app");if(!r)return;const s=p(),e=k(),{version:c}=N(),d=s.settings.rainMode;let a="";switch(e){case"today":a=b(!0);break;case"itinerary":a=h(!0);break;case"reservations":a=E(!0);break;case"packing":a=w(!0);break;case"budget":a=y(!0);break;case"settings":a=m(!0);break;default:a=b(!0)}r.innerHTML=`
    <!-- Header -->
    <header class="border-b-2 border-black p-3 bg-white sticky top-0 z-20">
      <div class="flex items-center justify-between max-w-2xl mx-auto">
        <div>
          <h1 class="text-lg font-bold text-black uppercase tracking-wide font-serif">${s.meta.title} (E-INK)</h1>
          <p class="text-xs text-black font-bold font-serif">${s.meta.start} to ${s.meta.end} ${d?"• [RAIN MODE]":""}</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-header-refresh" class="eink-btn text-xs py-1 px-2" title="Clear screen ghosting">
            🔄 REFRESH
          </button>
          <span class="text-xs border-2 border-black px-2 py-1 font-mono font-bold">v${c}</span>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main id="main-content-container" class="flex-1 p-4 bg-white max-w-2xl mx-auto w-full pb-24">
      ${a}
    </main>

    <!-- E-Ink Bottom Navigation Bar (6 Tabs) -->
    <nav class="border-t-2 border-black p-1 bg-white fixed bottom-0 left-0 right-0 z-20 flex justify-around max-w-2xl mx-auto gap-1">
      <button
        data-tab="today"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${e==="today"?"active":""}"
      >
        TODAY
      </button>
      <button
        data-tab="itinerary"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${e==="itinerary"?"active":""}"
      >
        ITINERARY
      </button>
      <button
        data-tab="reservations"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${e==="reservations"?"active":""}"
      >
        BOOKINGS
      </button>
      <button
        data-tab="packing"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${e==="packing"?"active":""}"
      >
        PACKING
      </button>
      <button
        data-tab="budget"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${e==="budget"?"active":""}"
      >
        BUDGET
      </button>
      <button
        data-tab="settings"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${e==="settings"?"active":""}"
      >
        SETTINGS
      </button>
    </nav>
  `;const n=document.getElementById("main-content-container");if(n)switch(e){case"today":S(n,t);break;case"itinerary":B(n,t);break;case"reservations":$(n,t);break;case"packing":V(n,t);break;case"budget":T(n,t);break;case"settings":I(n,t);break}(i=document.getElementById("btn-header-refresh"))==null||i.addEventListener("click",()=>{document.body.style.filter="invert(100%)",setTimeout(()=>{document.body.style.filter="none"},300)}),document.querySelectorAll(".nav-tab-btn").forEach(l=>{l.addEventListener("click",u=>{const o=u.target.closest(".nav-tab-btn").dataset.tab;o&&A(o)})})}v().then(()=>{t(),f(()=>t()),g(()=>t())});
