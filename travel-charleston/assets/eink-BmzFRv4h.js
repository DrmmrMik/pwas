import{r as u,i as p,s as v,l as f,g as k,a as m,b,c as g,d as y,e as w,f as E,h,j as I,k as T,m as V,n as $,o as S,p as A,q as M,t as B}from"./settingsView-DCBmHUh9.js";u();function N(){const i=document.body.dataset.version||"0.1.0",s=document.body.dataset.build||"dev";return{version:i,build:s}}function a(){var r;const i=document.getElementById("app");if(!i)return;const s=k(),t=m(),{version:c}=N(),d=s.settings.rainMode;let e="";switch(t){case"today":e=b(!0);break;case"itinerary":e=h(!0);break;case"map":e=E(!0);break;case"reservations":e=w(!0);break;case"packing":e=y(!0);break;case"ideas":e=B(!0);break;case"settings":e=g(!0);break;default:e=b(!0)}i.innerHTML=`
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
      ${e}
    </main>

    <!-- E-Ink Bottom Navigation Bar (7 Tabs) -->
    <nav class="border-t-2 border-black p-1 bg-white fixed bottom-0 left-0 right-0 z-20 flex justify-around max-w-2xl mx-auto gap-1">
      <button
        data-tab="today"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${t==="today"?"active":""}"
      >
        TODAY
      </button>
      <button
        data-tab="itinerary"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${t==="itinerary"?"active":""}"
      >
        ITINERARY
      </button>
      <button
        data-tab="map"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${t==="map"?"active":""}"
      >
        MAP
      </button>
      <button
        data-tab="reservations"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${t==="reservations"?"active":""}"
      >
        BOOKINGS
      </button>
      <button
        data-tab="packing"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${t==="packing"?"active":""}"
      >
        PACKING
      </button>
      <button
        data-tab="ideas"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${t==="ideas"?"active":""}"
      >
        IDEAS
      </button>
      <button
        data-tab="settings"
        class="nav-tab-btn eink-btn flex-1 py-3 px-1 text-center font-bold text-xs ${t==="settings"?"active":""}"
      >
        SETTINGS
      </button>
    </nav>
  `;const n=document.getElementById("main-content-container");if(n)switch(t){case"today":A(n,a);break;case"itinerary":S(n,a);break;case"map":$(n,a);break;case"reservations":V(n,a);break;case"packing":T(n,a);break;case"ideas":break;case"settings":I(n,a);break}(r=document.getElementById("btn-header-refresh"))==null||r.addEventListener("click",()=>{document.body.style.filter="invert(100%)",setTimeout(()=>{document.body.style.filter="none"},300)}),document.querySelectorAll(".nav-tab-btn").forEach(l=>{l.addEventListener("click",x=>{const o=x.target.closest(".nav-tab-btn").dataset.tab;o&&M(o)})})}p().then(()=>{a(),v(()=>a()),f(()=>a())});
