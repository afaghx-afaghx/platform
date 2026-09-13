(() => {
  const catalog = {
    en: {
      categories: [
        ['RM','Raw Materials','Metals, minerals and industrial inputs'],
        ['IG','Industrial Goods','Machinery, equipment and components'],
        ['AG','Agriculture & Food','Farm products and food supply'],
        ['ER','Energy & Resources','Energy, fuels and strategic resources'],
        ['ET','Electronics & Technology','Components, devices and technology'],
        ['CB','Construction & Building','Steel, cement and building materials'],
        ['CG','Consumer Goods','Everyday products for business and retail']
      ],
      featured: [
        ['Steel Coil','Industrial Goods','Multiple grades • Quote requested','SC'],
        ['Copper Cathode','Raw Materials','Industrial supply • Quote requested','CU'],
        ['Wheat Grain','Agriculture & Food','Bulk supply • Quote requested','WG'],
        ['Industrial Pump','Industrial Goods','Factory equipment • Quote requested','IP']
      ],
      best: [
        ['Aluminium Billet','Raw Materials','Qualified supply partners','AL'],
        ['Polymer Resin','Industrial Goods','Production input','PR'],
        ['Cement Clinker','Construction & Building','Bulk trade opportunity','CC'],
        ['Solar Modules','Electronics & Technology','Commercial energy systems','SM'],
        ['Stainless Sheet','Industrial Goods','Manufacturing material','SS']
      ],
      newArrivals: [
        ['Food Packaging','Consumer Goods','Distributor-ready supply','FP'],
        ['Industrial Valves','Industrial Goods','Process equipment','IV'],
        ['Olive Oil','Agriculture & Food','Food & hospitality supply','OO'],
        ['LED Components','Electronics & Technology','OEM components','LE'],
        ['Structural Steel','Construction & Building','Project supply','ST']
      ],
      categoriesRails: {
        'Raw Materials': ['Iron Ore','Copper Cathode','Aluminium Billet','Zinc Ingot','Petrochemical Feedstock'],
        'Industrial Goods': ['Industrial Pumps','Bearings','Motors','Valves','Compressors'],
        'Agriculture & Food': ['Wheat Grain','Corn','Edible Oils','Dried Fruits','Food Ingredients'],
        'Energy & Resources': ['Fuel Products','Industrial Gas','Solar Systems','Mining Inputs','Energy Equipment'],
        'Technology & Electronics': ['Semiconductors','LED Components','Power Electronics','Sensors','Networking Equipment'],
        'Construction & Building': ['Structural Steel','Cement','Insulation','Pipes','Building Panels'],
        'Consumer Goods': ['Packaging','Household Supplies','Personal Care','Retail Products','Office Supplies']
      },
      suppliers: ['Atlas Industrial Supply','Nova Metals Trading','GreenField Foods','Vertex Energy Systems'],
      labels: {
        catalog:'COMMODITY EXCHANGE', catalogTitle:'Discover the market, section by section.', catalogIntro:'A structured commercial discovery layer for goods, suppliers and opportunities. Prototype content is clearly marked for the Experience layer.', browse:'Browse all categories', featured:'FEATURED PRODUCTS', featuredTitle:'Featured supply opportunities', best:'BEST SELLERS', bestTitle:'Frequently discovered products', arrivals:'NEW ARRIVALS', arrivalsTitle:'Recently added opportunities', opportunities:'MARKET OPPORTUNITIES', opportunitiesTitle:'Connect supply with real business demand.', opportunityText:'Bring goods, production capacity or procurement demand into a single commercial discovery experience.', explore:'Explore opportunities', categoryPrefix:'Explore', suppliersLabel:'TOP SUPPLIERS', suppliersTitle:'Meet suppliers behind the market', viewSupplier:'View supplier', request:'Request a quote', demo:'Preview', quote:'Quote requested', cta:'Build your business on AFAGHX', ctaText:'Move from product discovery to supplier connection, services and trade when the underlying capabilities are enabled.'
      }
    },
    fa: {
      categories: [
        ['مواد','مواد اولیه','فلزات، مواد معدنی و نهاده‌های صنعتی'],
        ['صنعت','کالاهای صنعتی','ماشین‌آلات، تجهیزات و قطعات'],
        ['کشاورزی','کشاورزی و غذا','محصولات کشاورزی و زنجیره غذا'],
        ['انرژی','انرژی و منابع','انرژی، سوخت و منابع راهبردی'],
        ['فناوری','فناوری و الکترونیک','قطعات، تجهیزات و فناوری'],
        ['ساخت','ساختمان و ساخت‌وساز','فولاد، سیمان و مصالح ساختمانی'],
        ['مصرفی','کالاهای مصرفی','کالاهای روزمره برای کسب‌وکار و خرده‌فروشی']
      ],
      featured: [
        ['ورق فولادی','کالاهای صنعتی','چند گرید • درخواست قیمت','SF'],
        ['کاتد مس','مواد اولیه','تأمین صنعتی • درخواست قیمت','مس'],
        ['گندم','کشاورزی و غذا','تأمین عمده • درخواست قیمت','گ'],
        ['پمپ صنعتی','کالاهای صنعتی','تجهیزات کارخانه • درخواست قیمت','پ']
      ],
      best: [
        ['شمش آلومینیوم','مواد اولیه','تأمین‌کنندگان واجد شرایط','آل'],
        ['رزین پلیمری','کالاهای صنعتی','نهاده تولید','رز'],
        ['کلینکر سیمان','ساختمان و ساخت‌وساز','فرصت تجارت عمده','س'],
        ['ماژول خورشیدی','فناوری و الکترونیک','سامانه انرژی تجاری','خ'],
        ['ورق استیل','کالاهای صنعتی','مواد تولیدی','ا']
      ],
      newArrivals: [
        ['بسته‌بندی غذایی','کالاهای مصرفی','تأمین آماده توزیع','ب'],
        ['شیرآلات صنعتی','کالاهای صنعتی','تجهیزات فرایندی','ش'],
        ['روغن زیتون','کشاورزی و غذا','تأمین غذا و هتلداری','ر'],
        ['قطعات LED','فناوری و الکترونیک','قطعات OEM','ل'],
        ['فولاد سازه‌ای','ساختمان و ساخت‌وساز','تأمین پروژه','ف']
      ],
      categoriesRails: {
        'مواد اولیه':['سنگ آهن','کاتد مس','شمش آلومینیوم','شمش روی','خوراک پتروشیمی'],
        'کالاهای صنعتی':['پمپ صنعتی','بلبرینگ','موتور','شیرآلات','کمپرسور'],
        'کشاورزی و غذا':['گندم','ذرت','روغن خوراکی','خشکبار','مواد اولیه غذایی'],
        'انرژی و منابع':['محصولات سوختی','گاز صنعتی','سامانه خورشیدی','نهاده معدن','تجهیزات انرژی'],
        'فناوری و الکترونیک':['نیمه‌رسانا','قطعات LED','الکترونیک قدرت','حسگرها','تجهیزات شبکه'],
        'ساختمان و ساخت‌وساز':['فولاد سازه‌ای','سیمان','عایق','لوله','پنل ساختمانی'],
        'کالاهای مصرفی':['بسته‌بندی','لوازم خانگی','بهداشت فردی','کالای خرده‌فروشی','ملزومات اداری']
      },
      suppliers:['تأمین صنعتی اطلس','بازرگانی فلزات نووا','صنایع غذایی گرین‌فیلد','سامانه‌های انرژی ورتکس'],
      labels:{
        catalog:'مرکز مبادلات کالا',catalogTitle:'بازار را بخش‌به‌بخش کشف کنید.',catalogIntro:'یک لایه ساختاریافته برای کشف کالا، تأمین‌کننده و فرصت تجاری. محتوای این بخش در حال حاضر صرفاً نمایشی و مخصوص Experience است.',browse:'مشاهده همه دسته‌ها',featured:'کالاهای منتخب',featuredTitle:'فرصت‌های منتخب تأمین',best:'محبوب‌ترین‌ها',bestTitle:'کالاهایی که بیشتر کشف می‌شوند',arrivals:'تازه‌ها',arrivalsTitle:'فرصت‌های تازه‌وارد',opportunities:'فرصت‌های بازار',opportunitiesTitle:'عرضه را به تقاضای واقعی کسب‌وکار متصل کنید.',opportunityText:'کالا، ظرفیت تولید یا تقاضای خرید را وارد یک تجربه واحد برای کشف و ارتباط تجاری کنید.',explore:'مشاهده فرصت‌ها',categoryPrefix:'مشاهده',suppliersLabel:'تأمین‌کنندگان برتر',suppliersTitle:'تأمین‌کنندگان پشت بازار را بشناسید',viewSupplier:'مشاهده تأمین‌کننده',request:'درخواست قیمت',demo:'پیش‌نمایش',quote:'درخواست قیمت',cta:'کسب‌وکار خود را روی AFAGHX بسازید',ctaText:'از کشف کالا به ارتباط با تأمین‌کننده، خدمات و تجارت حرکت کنید؛ هر زمان که قابلیت‌های واقعی زیرساخت فعال شوند.'
      }
    }
  };

  function esc(value){return String(value).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function productCard(item){
    const [name,cat,meta,symbol]=item;
    return `<article class="product-card"><div class="product-card__visual"><span class="product-card__symbol">${esc(symbol)}</span></div><div class="product-card__body"><span class="product-card__tag">${esc(catalog[state.lang].labels.demo)}</span><h3>${esc(name)}</h3><p class="product-card__desc">${esc(cat)}</p><div class="product-card__meta"><span>${esc(meta)}</span><span>${esc(catalog[state.lang].labels.quote)}</span></div><a class="product-card__action" href="#join">${esc(catalog[state.lang].labels.request)}</a></div></article>`;
  }
  function railCard(name,index){
    const chars = name.slice(0,2);
    return `<article class="rail-card"><div class="rail-card__visual">${esc(chars)}</div><strong>${esc(name)}</strong><span>${esc(state.lang==='fa'?'تأمین و کشف تجاری':'Commercial discovery & supply')}</span></article>`;
  }
  function build(){
    const labels=catalog[state.lang].labels;
    const c=catalog[state.lang];
    const categoryTiles=c.categories.map(([icon,name,desc])=>`<a class="category-tile" href="#cat-${esc(name).replace(/\s+/g,'-')}"><span class="category-tile__icon">${esc(icon)}</span><span><strong>${esc(name)}</strong><span>${esc(desc)}</span></span></a>`).join('');
    const featured=c.featured.map(productCard).join('');
    const best=c.best.map(productCard).join('');
    const arrivals=c.newArrivals.map(productCard).join('');
    const rails=Object.entries(c.categoriesRails).map(([name,items])=>`<section id="cat-${esc(name).replace(/\s+/g,'-')}" class="commercial-section commercial-section--soft"><div class="commercial-inner"><div class="commercial-section__head"><div><p class="commercial-kicker">${esc(labels.categoryPrefix)}</p><h2>${esc(name)}</h2></div><a class="commercial-link" href="#exchange">${esc(labels.browse)} →</a></div><div class="rail-grid">${items.map((x,i)=>railCard(x,i)).join('')}</div></div></section>`).join('');
    const suppliers=c.suppliers.map((name,i)=>`<article class="supplier-card"><div class="supplier-card__logo">${esc(name.slice(0,1))}</div><strong>${esc(name)}</strong><span>${esc(state.lang==='fa'?'تأمین صنعتی و تجاری':'Industrial and commercial supply')}</span><a href="#join">${esc(labels.viewSupplier)} →</a></article>`).join('');
    return `<div class="commercial-shell" id="exchange"><section class="commercial-section"><div class="commercial-inner"><div class="commercial-section__head"><div><p class="commercial-kicker">${esc(labels.catalog)}</p><h2>${esc(labels.catalogTitle)}</h2><p class="commercial-section__intro">${esc(labels.catalogIntro)}</p></div><a class="commercial-link" href="#featured">${esc(labels.browse)} →</a></div><div class="category-rail">${categoryTiles}</div></div></section><section id="featured" class="commercial-section commercial-section--soft"><div class="commercial-inner"><div class="commercial-section__head"><div><p class="commercial-kicker">${esc(labels.featured)}</p><h2>${esc(labels.featuredTitle)}</h2></div></div><div class="product-grid">${featured}</div></div></section><section class="commercial-section"><div class="commercial-inner"><div class="commercial-section__head"><div><p class="commercial-kicker">${esc(labels.best)}</p><h2>${esc(labels.bestTitle)}</h2></div></div><div class="product-grid">${best}</div></div></section><section class="commercial-section commercial-section--soft"><div class="commercial-inner"><div class="commercial-section__head"><div><p class="commercial-kicker">${esc(labels.arrivals)}</p><h2>${esc(labels.arrivalsTitle)}</h2></div></div><div class="product-grid">${arrivals}</div></div></section><section class="commercial-section"><div class="commercial-inner"><div class="opportunity-grid"><article class="opportunity-card"><p class="commercial-kicker" style="color:#cce5ff">${esc(labels.opportunities)}</p><h3>${esc(labels.opportunitiesTitle)}</h3><p>${esc(labels.opportunityText)}</p><a class="commercial-cta__button" style="margin-top:24px;display:inline-flex" href="#join">${esc(labels.explore)} →</a></article><article class="opportunity-card opportunity-card--light"><p class="commercial-kicker">${esc(labels.catalog)}</p><h3>${esc(state.lang==='fa'?'کشف فرصت‌های تجاری، نه فقط کالا':'Discover commercial opportunities, not only products.')}</h3><p>${esc(state.lang==='fa'?'ساختار صفحه به‌گونه‌ای است که هر دسته بازار یک بخش مستقل و قابل توسعه داشته باشد.':'Each market category is isolated into a scalable section so product discovery can grow without turning the homepage into a single dense grid.')}</p></article></div></div></section>${rails}<section class="commercial-section commercial-section--soft"><div class="commercial-inner"><div class="commercial-section__head"><div><p class="commercial-kicker">${esc(labels.suppliersLabel)}</p><h2>${esc(labels.suppliersTitle)}</h2></div></div><div class="supplier-grid">${suppliers}</div></div></section><section class="commercial-cta"><div class="commercial-inner"><div class="commercial-cta__panel"><div><h2>${esc(labels.cta)}</h2><p>${esc(labels.ctaText)}</p></div><a class="commercial-cta__button" href="#join">${esc(labels.explore)} →</a></div></div></section></div>`;
  }

  const state={lang:document.documentElement.lang==='fa'?'fa':'en',mounted:false};
  function mount(){
    if(state.mounted || !document.body.classList.contains('homepage')) return;
    const hero=document.querySelector('.hero'); if(!hero) return;
    const node=document.createElement('div'); node.innerHTML=build();
    hero.insertAdjacentElement('afterend',node.firstElementChild);
    document.body.classList.add('commercial-mode');
    state.mounted=true;
  }
  function rerender(){
    const current=document.querySelector('.commercial-shell');
    if(!current){ mount(); return; }
    current.outerHTML=build();
  }
  function watchLanguage(){
    const observer=new MutationObserver(()=>{
      const lang=document.documentElement.lang==='fa'?'fa':'en';
      if(lang!==state.lang){state.lang=lang;rerender();}
    });
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }
  window.addEventListener('DOMContentLoaded',()=>{mount();watchLanguage();});
})();