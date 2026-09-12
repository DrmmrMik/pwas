import{r as y,i as E,s as x,l as I,g as A,a as V,b as f,c as T,d as S,e as L,f as $,h as B,j as C,k as M,m as N,n as P,o as R,p as O,q as H,t as K,u as m}from"./settingsView-_Iq_2MtH.js";y();function Y(){const l=document.body.dataset.version||"0.1.0",s=document.body.dataset.build||"dev";return{version:l,build:s}}const j=[{tab:"today",icon:"◧",label:"TODAY"},{tab:"itinerary",icon:"☰",label:"PLAN"},{tab:"map",icon:"◈",label:"MAP"},{tab:"reservations",icon:"▤",label:"BOOKED"},{tab:"packing",icon:"✓",label:"PACK"}];let n=!1,b=null;function e(){var v,p,w;const l=document.getElementById("app");if(!l)return;const s=A(),c=V();Y();const g=s.settings.rainMode,u=n?"overflow":c,k=b!==null&&b!==u,h=window.scrollY;let t="";if(n)t=`
      <section class="space-y-0">
        <button class="row-tappable" data-overflow-nav="ideas">IDEAS</button>
        <button class="row-tappable" data-overflow-nav="settings">SETTINGS</button>
        <button class="row-tappable row-static" id="btn-overflow-close">CLOSE</button>
      </section>
    `;else switch(c){case"today":t=f(!0);break;case"itinerary":t=C(!0);break;case"map":t=B(!0);break;case"reservations":t=$(!0);break;case"packing":t=L(!0);break;case"ideas":t=S(!0);break;case"settings":t=T(!0);break;default:t=f(!0)}l.innerHTML=`
    <!-- Header -->
    <header class="border-b-2 border-black p-3 bg-white sticky top-0 z-20">
      <div class="flex items-center justify-between max-w-2xl mx-auto gap-2">
        <div class="min-w-0">
          <h1 class="text-lg font-bold text-black uppercase tracking-wide font-serif truncate">${s.meta.title} (E-INK)</h1>
          <p class="text-xs text-black font-bold font-serif">${s.meta.start} to ${s.meta.end}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${g?'<button class="chip chip-rain" id="btn-header-rain-chip" data-nav="settings">☂ RAIN PLAN</button>':""}
          <button id="btn-header-refresh" class="eink-btn text-xs py-1 px-2" aria-label="Clear screen ghosting" title="Clear screen ghosting">
            ↻ <span>CLEAR</span>
          </button>
          <button id="btn-header-overflow" class="eink-btn text-xs py-1 px-2" aria-haspopup="menu" aria-expanded="${n?"true":"false"}" aria-label="More views">
            ⋯
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main id="main-content-container" class="flex-1 p-4 bg-white max-w-2xl mx-auto w-full pb-24">
      ${t}
    </main>

    <!-- E-Ink Bottom Navigation Bar (5 primary tabs, §5) -->
    <nav class="eink-nav fixed bottom-0 left-0 right-0 z-20 max-w-2xl mx-auto" role="tablist" aria-label="Main">
      ${j.map(({tab:r,icon:i,label:d})=>`
      <button
        data-tab="${r}"
        class="nav-tab-btn"
        role="tab"
        ${!n&&c===r?'aria-current="page"':""}
      >
        <span class="tab-icon" aria-hidden="true">${i}</span><span class="tab-label">${d}</span>
      </button>`).join("")}
    </nav>
  `;const a=document.getElementById("main-content-container");if(a)switch(c){case"today":K(a,e);break;case"itinerary":H(a,e);break;case"map":O(a,e,!0);break;case"reservations":R(a,e);break;case"packing":P(a,e);break;case"ideas":N(a,e);break;case"settings":M(a,e);break}(v=document.getElementById("btn-header-refresh"))==null||v.addEventListener("click",()=>{document.body.style.filter="invert(100%)",setTimeout(()=>{document.body.style.filter="none"},300)}),document.querySelectorAll(".nav-tab-btn").forEach(r=>{r.addEventListener("click",i=>{const o=i.target.closest(".nav-tab-btn").dataset.tab;o&&m(o)})}),(p=document.getElementById("btn-header-overflow"))==null||p.addEventListener("click",()=>{n=!n,e()}),document.querySelectorAll("[data-overflow-nav]").forEach(r=>{r.addEventListener("click",i=>{const o=i.target.closest("[data-overflow-nav]").dataset.overflowNav;o&&(n=!1,m(o))})}),(w=document.getElementById("btn-overflow-close"))==null||w.addEventListener("click",()=>{n=!1,e()}),k||window.scrollTo(0,h),b=u}E().then(()=>{e(),x(()=>e()),I(()=>e()),window.addEventListener("travel-weather-ready",()=>e())});
