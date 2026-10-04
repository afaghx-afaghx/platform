(() => {
  const selected = new Set();
  const current = () => window.__AFX_AI_RESULTS_V2__ || [];
  const t = (fa,en) => document.documentElement.lang === 'en' ? en : fa;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function mountControls() {
    const bar = document.querySelector('.ai-native-v2__resultbar');
    const root = document.querySelector('.ai-native-v2__results');
    if (!bar || !root || bar.querySelector('#ai-native-v2-compare')) return;
    const button = document.createElement('button');
    button.id='ai-native-v2-compare';
    button.className='ai-native-v2__compare';
    button.type='button';
    button.disabled=true;
    button.textContent=t('مقایسه','Compare');
    bar.appendChild(button);
    button.addEventListener('click', render);
  }
  function render() {
    const items=current(), keys=[...selected];
    const chosen=keys.map(k=>items[Number(k.replace('result-',''))]).filter(Boolean);
    const box=document.querySelector('#ai-native-v2-comparison');
    if (!box || chosen.length<2) return;
    const fields=['title','name','type','description'];
    const extras=new Set();
    chosen.forEach(item=>Object.keys(item||{}).forEach(k=>{if(!fields.includes(k)&&['string','number','boolean'].includes(typeof item[k])) extras.add(k)}));
    const all=[...fields,...extras].slice(0,10);
    const labels={title:t('عنوان','Title'),name:t('نام','Name'),type:t('نوع','Type'),description:t('توضیحات','Description')};
    box.innerHTML='<div class="ai-native-v2__comparison-head"><strong>'+t('مقایسه بر پایه داده واقعی','Comparison from live fields')+'</strong><span>'+t('فقط فیلدهای برگشتی از API نمایش داده می‌شوند.','Only API-returned fields are shown.')+'</span></div><div class="ai-native-v2__tablewrap"><table><thead><tr><th>'+t('ویژگی','Field')+'</th>'+chosen.map(item=>'<th>'+escapeHtml(item.title||item.name||item.type||'AFAGHX')+'</th>').join('')+'</tr></thead><tbody>'+all.map(field=>'<tr><th>'+escapeHtml(labels[field]||field)+'</th>'+chosen.map(item=>'<td>'+escapeHtml(item?.[field] ?? '—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    box.hidden=false;
  }
  function sync() {
    mountControls();
    const root=document.querySelector('#ai-native-v2-results');
    if (!root) return;
    root.querySelectorAll('[data-compare-key]').forEach(box=> {
      box.onchange=() => {
        if (box.checked) {
          if (selected.size>=3) { box.checked=false; return; }
          selected.add(box.dataset.compareKey);
        } else selected.delete(box.dataset.compareKey);
        const compare=document.querySelector('#ai-native-v2-compare');
        if (compare) compare.disabled=selected.size<2;
      };
    });
  }
  window.addEventListener('afx:ai-results', () => sync());
  const observer=new MutationObserver(sync);
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();