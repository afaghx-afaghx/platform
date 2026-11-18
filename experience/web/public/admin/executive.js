const modules = {
  overview:{fa:"نمای کلان مدیریتی",en:"Executive Overview",faDesc:"تصویر یکپارچه از حاکمیت، عملکرد و سلامت اکوسیستم AFAGHX",enDesc:"A unified view of AFAGHX governance, performance and ecosystem health."},
  geography:{fa:"کشورها و جغرافیا",en:"Countries & Geography",faDesc:"ساختار کشور، استان و شهرستان با الگوی اداری قابل تنظیم برای هر کشور.",enDesc:"Country, province/state and county/district hierarchy with country-specific administrative models."},
  organization:{fa:"ساختار سازمانی",en:"Organization Structure",faDesc:"واحدهای سازمانی، روابط گزارش‌دهی، شعب و مسئولیت‌های مصوب.",enDesc:"Organizational units, reporting lines, branches and approved responsibilities."},
  workforce:{fa:"مدیران و نیروی انسانی",en:"Managers & Workforce",faDesc:"انتصاب مدیران، کارشناسان، جانشینی، ارزیابی و گردش کار منابع انسانی.",enDesc:"Manager and specialist assignments, succession, reviews and workforce workflows."},
  access:{fa:"هویت و سطح دسترسی",en:"Identity & Access Governance",faDesc:"نقش‌ها، مجوزها، محدوده جغرافیایی، تفویض اختیار و بازبینی دسترسی.",enDesc:"Roles, permissions, geographic scope, delegation and access reviews."},
  sales:{fa:"مرکز فرماندهی فروش",en:"Sales Command",faDesc:"قیف فروش، اهداف، تبدیل، معاملات، عملکرد تیم‌ها و دلایل ازدست‌رفتن فروش.",enDesc:"Sales pipeline, targets, conversion, transactions, team performance and lost-sale reasons."},
  marketing:{fa:"بازاریابی و شبکه همکاران",en:"Marketing & Affiliate Network",faDesc:"مدیران بازاریابی، بازاریابان، کمپین‌ها، انتساب فروش و کنترل تقلب.",enDesc:"Marketing managers, affiliates, campaigns, sales attribution and fraud controls."},
  sellers:{fa:"فروشندگان و تأمین‌کنندگان",en:"Sellers & Suppliers",faDesc:"احراز هویت تجاری، کیفیت، عملکرد، ریسک و پوشش تأمین‌کنندگان.",enDesc:"Business verification, quality, performance, risk and supplier coverage."},
  buyers:{fa:"خریداران و مشتریان",en:"Buyers & Customers",faDesc:"مشتریان حقیقی و حقوقی، حفظ مشتری، شکایات و تجربه خرید.",enDesc:"Individual and business buyers, retention, complaints and customer experience."},
  products:{fa:"محصولات و کاتالوگ",en:"Products & Catalogue",faDesc:"کیفیت اطلاعات کالا، وضعیت تجاری، دسته‌بندی و چرخه انتشار.",enDesc:"Product data quality, commercial status, taxonomy and publication lifecycle."},
  advertising:{fa:"تبلیغات و کمپین‌ها",en:"Advertising & Campaigns",faDesc:"موجودی جایگاه‌ها، نمایش، کلیک معتبر، تبدیل، بودجه و بازده کمپین.",enDesc:"Ad inventory, impressions, valid clicks, conversions, budgets and campaign ROI."},
  procurement:{fa:"تدارکات و RFQ",en:"Procurement & RFQ",faDesc:"درخواست خرید، تأمین‌یابی، مقایسه پیشنهادها و عملکرد تأمین‌کنندگان.",enDesc:"Purchase requests, sourcing, quote comparison and supplier performance."},
  trade:{fa:"سفارش و تجارت",en:"Orders & Trade",faDesc:"سفارش‌های B2B و B2C، قراردادها، وضعیت اجرا و استثناهای تجاری.",enDesc:"B2B and B2C orders, contracts, execution status and commercial exceptions."},
  finance:{fa:"مالی و خزانه‌داری",en:"Finance & Treasury",faDesc:"درآمد، هزینه، جریان نقدی، مغایرت، تسویه و بودجه با کنترل چندمرحله‌ای.",enDesc:"Revenue, costs, cash flow, reconciliation, settlement and budgets with multi-party controls."},
  commission:{fa:"کمیسیون و پاداش",en:"Commission & Incentives",faDesc:"قواعد کمیسیون، انتساب معتبر، محاسبه، تأیید و پرداخت پاداش.",enDesc:"Commission rules, validated attribution, calculation, approval and incentive payout."},
  afacode:{fa:"مرکز AFA CODE",en:"AFA CODE Registry",faDesc:"نظارت بر شناسه کارخانه، سازمان، فروشنده، محصول، محموله و رویداد رهگیری.",enDesc:"Oversight of factory, organization, seller, product, shipment and tracking identifiers."},
  logistics:{fa:"لجستیک و حمل‌ونقل",en:"Logistics & Transport",faDesc:"حمل، رهگیری، تحویل، اسناد و مدیریت استثناهای لجستیکی.",enDesc:"Transport, tracking, delivery, documentation and logistics exceptions."},
  partners:{fa:"شرکا و خدمات",en:"Partners & Services",faDesc:"شرکای تجاری، ارائه‌دهندگان خدمات، قراردادها و سطح خدمت.",enDesc:"Business partners, service providers, contracts and service levels."},
  support:{fa:"پشتیبانی و شکایات",en:"Support & Complaints",faDesc:"تیکت‌ها، شکایات، اختلاف‌ها، SLA و مسیرهای ارجاع.",enDesc:"Tickets, complaints, disputes, SLAs and escalation paths."},
  security:{fa:"امنیت و اعتماد",en:"Security & Trust",faDesc:"رخدادها، دسترسی ممتاز، احراز هویت، تقلب، سیاست‌ها و حسابرسی.",enDesc:"Incidents, privileged access, identity assurance, fraud, policies and audit."},
  intelligence:{fa:"هوش تجاری و AI",en:"Business Intelligence & AI",faDesc:"شاخص‌های معتبر، پیش‌بینی، تحلیل ریسک و توصیه‌های قابل توضیح.",enDesc:"Trusted metrics, forecasting, risk analysis and explainable recommendations."},
  audit:{fa:"گزارش و حسابرسی",en:"Reports & Audit",faDesc:"گزارش‌های زمان‌مند، ردپای تصمیم‌ها، شواهد و کنترل دسترسی به خروجی‌ها.",enDesc:"Time-bound reports, decision trails, evidence and governed exports."},
  settings:{fa:"تنظیمات و سیاست‌ها",en:"Settings & Policies",faDesc:"پیکربندی مجاز، سیاست‌ها، محدوده‌ها و چرخه تصویب تغییرات.",enDesc:"Governed configuration, policies, scopes and change-approval lifecycle."},
  platform:{fa:"زیرساخت و انتشار",en:"Platform & Release Operations",faDesc:"سلامت Gateway، سرویس‌ها، پایگاه داده، CI/CD، پشتیبان‌گیری و بازیابی.",enDesc:"Gateway, service and database health, CI/CD, backup and recovery."}
};

const $ = (selector) => document.querySelector(selector);
const nav = $("#side-nav");
const title = $("#page-title");
const subtitle = $("#page-subtitle");
const breadcrumb = $("#breadcrumb-current");
const main = $("#main-content");
const toast = $("#toast");
const sidebar = $("#sidebar");
const overlay = $("#mobile-overlay");
let language = "fa";
let toastTimer;

function notify(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showView(key){
  const item = modules[key] || modules.overview;
  const isOverview = key === "overview";
  nav.querySelectorAll(".nav-item").forEach((button) => {
    const active = button.dataset.view === key;
    button.classList.toggle("active", active);
    if(active) button.setAttribute("aria-current","page");
    else button.removeAttribute("aria-current");
  });
  const label = item[language];
  title.textContent = label;
  breadcrumb.textContent = label;
  subtitle.textContent = item[language === "fa" ? "faDesc" : "enDesc"];

  main.querySelectorAll(".notice-banner,.kpi-grid,.dashboard-grid,.bottom-strip,.page-footer").forEach((node) => {
    node.hidden = !isOverview;
  });

  let placeholder = $("#module-placeholder");
  if(!isOverview){
    if(!placeholder){
      placeholder = document.createElement("section");
      placeholder.id = "module-placeholder";
      placeholder.className = "module-placeholder panel";
      placeholder.setAttribute("aria-live","polite");
      main.insertBefore(placeholder, main.querySelector(".notice-banner"));
    }
    const copy = language === "fa"
      ? {tag:"MODULE WORKSPACE",status:"قرارداد و منبع داده متصل نشده است",body:"این بخش در مرحله طراحی قرار دارد. پیش از فعال‌سازی، مالک دامنه، قرارداد API، سیاست دسترسی، منبع داده و آزمون‌های امنیتی باید تأیید شوند.",checks:["مالکیت داده و مسئول پاسخ‌گو","قرارداد API نسخه‌بندی‌شده","محدوده دسترسی و سیاست اجرایی","آزمون و شواهد چهار پروتکل"],foot:"هیچ عملیات واقعی از این پیش‌نمایش انجام نمی‌شود."}
      : {tag:"MODULE WORKSPACE",status:"No approved contract or data source connected",body:"This workspace is in the design phase. Domain ownership, versioned API contract, access policy, data source and security tests must be approved before activation.",checks:["Data ownership and accountable owner","Versioned API contract","Access scope and execution policy","Four-protocol tests and evidence"],foot:"No real operation can be executed from this preview."};
    placeholder.innerHTML = '<div class="module-placeholder-top"><span class="panel-kicker">'+copy.tag+'</span><span class="muted-chip">DESIGN ONLY</span></div><div class="module-placeholder-body"><span class="module-placeholder-icon">⌁</span><h2>'+copy.status+'</h2><p>'+copy.body+'</p><div class="module-checks">'+copy.checks.map((v)=>'<div><i></i>'+v+'</div>').join("")+'</div><small>'+copy.foot+'</small></div>';
    placeholder.hidden = false;
  }else if(placeholder){
    placeholder.hidden = true;
  }
  closeMenu();
}

function setLanguage(next){
  language = next;
  const english = next === "en";
  document.documentElement.lang = next;
  document.documentElement.dir = english ? "ltr" : "rtl";
  $("#language-toggle").textContent = english ? "FA" : "EN";
  const labels = {
    overview:["نمای کلان مدیریتی","Executive Overview"],geography:["کشورها و جغرافیا","Countries & Geography"],organization:["ساختار سازمانی","Organization Structure"],workforce:["مدیران و نیروی انسانی","Managers & Workforce"],access:["هویت و سطح دسترسی","Identity & Access"],sales:["مرکز فرماندهی فروش","Sales Command"],marketing:["بازاریابی و شبکه همکاران","Marketing & Affiliates"],sellers:["فروشندگان و تأمین‌کنندگان","Sellers & Suppliers"],buyers:["خریداران و مشتریان","Buyers & Customers"],products:["محصولات و کاتالوگ","Products & Catalogue"],advertising:["تبلیغات و کمپین‌ها","Advertising & Campaigns"],procurement:["تدارکات و RFQ","Procurement & RFQ"],trade:["سفارش و تجارت","Orders & Trade"],finance:["مالی و خزانه‌داری","Finance & Treasury"],commission:["کمیسیون و پاداش","Commission & Incentives"],afacode:["مرکز AFA CODE","AFA CODE Registry"],logistics:["لجستیک و حمل‌ونقل","Logistics & Transport"],partners:["شرکا و خدمات","Partners & Services"],support:["پشتیبانی و شکایات","Support & Complaints"],security:["امنیت و اعتماد","Security & Trust"],intelligence:["هوش تجاری و AI","Business Intelligence & AI"],audit:["گزارش و حسابرسی","Reports & Audit"],settings:["تنظیمات و سیاست‌ها","Settings & Policies"],platform:["زیرساخت و انتشار","Platform & Release"]
  };
  nav.querySelectorAll(".nav-item").forEach((button)=>{
    const key=button.dataset.view;
    const label=labels[key]?.[english?1:0];
    if(label) button.querySelector("span:nth-child(2)").textContent=label;
  });
  const copy = english ? {
    workspace:"COMMAND CENTER",scope:"Scope",global:"Global · Entire ecosystem",breadcrumb:"Executive Overview",eyebrow:"GLOBAL EXECUTIVE INTELLIGENCE",title:"Executive Overview",subtitle:"A unified view of AFAGHX governance, performance and ecosystem health",
    preview:"Design preview",notConnected:"Live data is not connected",noticeStrong:"This environment is not connected to live data.",noticeText:"KPIs, alerts and country status remain intentionally unpopulated until authorized APIs are connected.",mapTitle:"Global management map",mapText:"Country coverage and regional structure after connection to the authoritative data source",mapStatus:"Geographic data is not connected yet",mapDescription:"After geography ownership and API contracts are approved, countries, provinces and districts will be selectable here.",decisions:"Executive decision desk",decisionsDesc:"Approval queue and strategic decisions",empty:"Decision queue is not connected yet",emptyDesc:"Pending approvals, critical cases and overdue tasks will appear after workflow integration.",performance:"Unit and manager performance",performanceDesc:"Compare targets, outcomes and trends",performanceEmpty:"No performance data is available",performanceSmall:"No synthetic chart or unsupported ranking is displayed.",risk:"Opportunities & threats",riskDesc:"Risk, growth and concentration analysis",health:"Platform health",healthDesc:"Service and release status",healthDetail:"Infrastructure details",governance:"Access governance & audit",governanceDesc:"All sensitive actions require valid authorization, a reason, an approval chain and an audit trail.",footer:"UI preview · Not connected to operational data"
  } : {
    workspace:"مرکز فرماندهی",scope:"محدوده",global:"جهانی · تمام اکوسیستم",breadcrumb:"نمای کلان مدیریتی",eyebrow:"GLOBAL EXECUTIVE INTELLIGENCE",title:"نمای کلان مدیریتی",subtitle:"تصویر یکپارچه از حاکمیت، عملکرد و سلامت اکوسیستم AFAGHX",
    preview:"پیش‌نمایش طراحی",notConnected:"داده عملیاتی متصل نیست",noticeStrong:"این محیط به داده زنده متصل نیست.",noticeText:"شاخص‌ها، هشدارها و وضعیت کشورها تا زمان اتصال APIهای مجاز، عمداً بدون مقدار نمایش داده می‌شوند.",mapTitle:"نقشه مدیریتی جهان",mapText:"نمایش پوشش کشورها و ساختار منطقه‌ای پس از اتصال داده مرجع",mapStatus:"داده جغرافیایی هنوز متصل نشده است",mapDescription:"پس از تأیید مالکیت داده جغرافیا و قرارداد API، کشورها، استان‌ها و شهرستان‌ها در این نما قابل انتخاب خواهند بود.",decisions:"میز تصمیم‌گیری مدیرعامل",decisionsDesc:"صف بررسی و تصمیمات کلان",empty:"صف تصمیمات هنوز متصل نیست",emptyDesc:"درخواست‌های تأیید، پرونده‌های بحرانی و وظایف معوق پس از اتصال گردش‌کار نمایش داده می‌شوند.",performance:"عملکرد واحدها و مدیران",performanceDesc:"مقایسه هدف، عملکرد و روند تغییرات",performanceEmpty:"داده عملکردی در دسترس نیست",performanceSmall:"از نمایش نمودار ساختگی یا رتبه‌بندی بدون شواهد خودداری شده است.",risk:"فرصت‌ها و تهدیدها",riskDesc:"تحلیل ریسک، رشد و نقاط تمرکز",health:"سلامت زیرساخت",healthDesc:"وضعیت سرویس‌ها و انتشار",healthDetail:"جزئیات زیرساخت",governance:"حاکمیت دسترسی و حسابرسی",governanceDesc:"تمام عملیات حساس باید مجوز معتبر، دلیل، زنجیره تأیید و ردپای حسابرسی داشته باشند.",footer:"پیش‌نمایش رابط کاربری · بدون اتصال به داده عملیاتی"
  };
  $("#workspace-label").textContent = copy.workspace;
  $(".scope-control > span").textContent = copy.scope;
  $("#scope-select").options[0].textContent = copy.global;
  $(".eyebrow").lastChild.textContent = copy.eyebrow;
  $("#page-title").textContent = copy.title;
  $("#page-subtitle").textContent = copy.subtitle;
  $("#breadcrumb-current").textContent = copy.breadcrumb;
  $(".date-block strong").textContent = copy.preview;
  $(".date-block small").textContent = copy.notConnected;
  $(".notice-banner strong").textContent = copy.noticeStrong;
  $(".notice-banner div span").textContent = copy.noticeText;
  $(".map-panel h2").textContent = copy.mapTitle;
  $(".map-panel .panel-heading p").textContent = copy.mapText;
  $(".map-copy strong").textContent = copy.mapStatus;
  $(".map-copy span").textContent = copy.mapDescription;
  $(".actions-panel h2").textContent = copy.decisions;
  $(".actions-panel .panel-heading p").textContent = copy.decisionsDesc;
  $(".empty-state strong").textContent = copy.empty;
  $(".empty-state p").textContent = copy.emptyDesc;
  $(".performance-panel h2").textContent = copy.performance;
  $(".performance-panel .panel-heading p").textContent = copy.performanceDesc;
  $(".performance-empty strong").textContent = copy.performanceEmpty;
  $(".performance-empty small").textContent = copy.performanceSmall;
  $(".risk-panel h2").textContent = copy.risk;
  $(".risk-panel .panel-heading p").textContent = copy.riskDesc;
  $(".health-panel h2").textContent = copy.health;
  $(".health-panel .panel-heading p").textContent = copy.healthDesc;
  $(".health-panel .text-button").firstChild.textContent = copy.healthDetail+" ";
  $(".bottom-strip strong").textContent = copy.governance;
  $(".bottom-strip small").textContent = copy.governanceDesc;
  $(".page-footer span:last-child").textContent = copy.footer;

  const staticCopy = english ? {
    navGroups:["GOVERNANCE & STRUCTURE","COMMERCIAL COMMAND","INTELLIGENCE & CONTROL"],
    kpiLabels:["Geographic coverage","Organization structure","Commercial performance","Financial position","Marketing network","Security & trust"],
    kpiFoot:["Countries and active units","Managers and specialists","Valid sales and transactions","Revenue, costs and settlements","Campaigns and active marketers","Risks and security incidents"],
    noData:"No data", legends:["No data","Active after source connection","Risk after source connection"],
    mapButton:"Manage geography",mapButton2:"View geographic structure",auditButton:"Open reports & audit",
    period:"Period: —",riskRows:[["Market opportunities","Requires sales and demand data"],["Operational threats","Requires SLA and operations data"],["Security and fraud risk","Requires security and trust data"]],
    healthItems:["API Gateway","AFX-CORE","Database","Events & queues","Security & monitoring","CI / CD"],
    previewMode:"Preview mode",previewOff:"No operational connection",sampleRole:"Sample role · No operational permissions",
    navLabel:"Command Center navigation",menuLabel:"Toggle navigation",noticeLabel:"Notifications",scopeOptions:["Global · Entire ecosystem","Country · Data connection required","Province / region · Data connection required","County / district · Data connection required"],
    workspaceNames:["Command Center","Governance & Structure","Commercial Command","Intelligence & Control"]
  } : {
    navGroups:["حاکمیت و ساختار","فرماندهی تجاری","هوشمندی و کنترل"],
    kpiLabels:["پوشش جغرافیایی","ساختار سازمانی","عملکرد تجاری","وضعیت مالی","شبکه بازاریابی","امنیت و اعتماد"],
    kpiFoot:["کشورها و واحدهای فعال","مدیران و کارشناسان","فروش و معاملات معتبر","درآمد، هزینه و تسویه","کمپین و بازاریاب فعال","ریسک و رخدادهای امنیتی"],
    noData:"بدون داده", legends:["بدون داده","فعال پس از اتصال منبع","ریسک پس از اتصال منبع"],
    mapButton:"مدیریت جغرافیا",mapButton2:"مشاهده ساختار جغرافیایی",auditButton:"رفتن به مرکز گزارش و حسابرسی",
    period:"دوره: —",riskRows:[["فرصت‌های بازار","نیازمند داده فروش و تقاضا"],["تهدیدهای عملیاتی","نیازمند داده SLA و عملیات"],["ریسک امنیت و تقلب","نیازمند داده امنیت و اعتماد"]],
    healthItems:["API Gateway","AFX-CORE","پایگاه داده","رویدادها و صف‌ها","امنیت و پایش","CI / CD"],
    previewMode:"حالت پیش‌نمایش",previewOff:"اتصال عملیاتی برقرار نیست",sampleRole:"نقش نمونه · بدون مجوز عملیاتی",
    navLabel:"ناوبری مرکز فرماندهی",menuLabel:"باز و بسته کردن منو",noticeLabel:"اعلان‌ها",
    scopeOptions:["جهانی · تمام اکوسیستم","کشور · نیازمند اتصال داده","استان / منطقه · نیازمند اتصال داده","شهرستان · نیازمند اتصال داده"],
    workspaceNames:["مرکز فرماندهی","حاکمیت و ساختار","فرماندهی تجاری","هوشمندی و کنترل"]
  };
  document.querySelectorAll(".nav-group-label").forEach((node,i)=>node.textContent=staticCopy.navGroups[i]||node.textContent);
  document.querySelectorAll(".kpi-card").forEach((card,i)=>{
    card.querySelector(".kpi-head span:first-child").textContent=staticCopy.kpiLabels[i];
    card.querySelector(".kpi-foot span:first-child").textContent=staticCopy.kpiFoot[i];
    card.querySelector(".muted-chip").textContent=staticCopy.noData;
  });
  document.querySelectorAll(".map-legend span").forEach((node,i)=>{const dot=node.querySelector("i");node.textContent=staticCopy.legends[i];if(dot)node.prepend(dot);});
  $(".map-panel .text-button").innerHTML=staticCopy.mapButton+' <span>←</span>';
  $(".map-copy .outline-button").textContent=staticCopy.mapButton2;
  $(".actions-panel .panel-link").innerHTML=staticCopy.auditButton+' <span>←</span>';
  $(".performance-panel .select-like").textContent=staticCopy.period;
  document.querySelectorAll(".radar-row").forEach((node,i)=>{
    node.querySelector("strong").textContent=staticCopy.riskRows[i][0];
    node.querySelector("small").textContent=staticCopy.riskRows[i][1];
    node.querySelector(".status-muted").textContent=english?"Unknown":"نامشخص";
  });
  document.querySelectorAll(".health-grid div").forEach((node,i)=>node.querySelector("span").textContent=staticCopy.healthItems[i]);
  $(".secure-note strong").textContent=staticCopy.previewMode;
  $(".secure-note small").textContent=staticCopy.previewOff;
  $(".user-mini small").textContent=staticCopy.sampleRole;
  $("#side-nav").setAttribute("aria-label",staticCopy.navLabel);
  $("#menu-toggle").setAttribute("aria-label",staticCopy.menuLabel);
  $(".topbar-actions .icon-button:not(.mobile-menu)").setAttribute("aria-label",staticCopy.noticeLabel);
  $("#scope-select").querySelectorAll("option").forEach((option,i)=>option.textContent=staticCopy.scopeOptions[i]);
  showView(nav.querySelector(".nav-item.active")?.dataset.view || "overview");
}

function closeMenu(){sidebar.classList.remove("open");overlay.classList.remove("show");}
nav.addEventListener("click",(event)=>{
  const button=event.target.closest("[data-view]");
  if(button) showView(button.dataset.view);
});
document.querySelectorAll("[data-view]:not(.nav-item)").forEach((button)=>{
  button.addEventListener("click",()=>showView(button.dataset.view));
});
$("#language-toggle").addEventListener("click",()=>setLanguage(language==="fa"?"en":"fa"));
$("#scope-select").addEventListener("change",(event)=>{
  if(event.target.value!=="global") notify(language==="fa"?"این محدوده تا اتصال مرجع جغرافیا و مجوزهای سرور، فقط نمایشی است.":"This scope remains preview-only until geographic data and server authorization are connected.");
  else notify(language==="fa"?"محدوده جهانی انتخاب شد؛ داده زنده متصل نیست.":"Global scope selected; live data is not connected.");
});
$("#menu-toggle").addEventListener("click",()=>{sidebar.classList.toggle("open");overlay.classList.toggle("show");});
overlay.addEventListener("click",closeMenu);
document.addEventListener("keydown",(event)=>{if(event.key==="Escape")closeMenu();});
