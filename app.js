'use strict';
const view=document.querySelector('#view'), pages={home:'Tổng quan',road:'Lộ trình',jobs:'Nghề nghiệp',terms:'Thuật ngữ',research:'Nghiên cứu'};
const names={CORE:'Nền tảng dùng chung',LOG:'Kho vận',PUR:'Thu mua',HR:'Nhân sự',FNB:'Vận hành nhà hàng'};
const colors={CORE:['#546847','#e9edda','◎'],LOG:['#366e76','#dbeceb','▦'],PUR:['#866029','#f5ead0','⇄'],HR:['#795781','#f0e4f1','♧'],FNB:['#a45539','#f7e2d6','♨']};
const depth={D1:'Hiểu · Understand',D2:'Thực hiện · Apply',D3:'Kiểm soát · Verify & Control',D4:'Ra quyết định · Decision-making'};
const access={ENTRY_OPEN:'Đầu vào',ENTRY_CONDITIONAL:'Đầu vào có điều kiện',EXPERIENCE_REQUIRED:'Yêu cầu kinh nghiệm',QUALIFICATION_REQUIRED:'Yêu cầu bằng cấp',CAREER_PROGRESSION:'Phát triển nghề nghiệp',UNCLEAR:'Chưa đủ thông tin'};
const ai={AI_ASSIST:'AI hỗ trợ',AI_TRANSITION:'Có thể tự động hóa',HUMAN_CONTROL:'Con người làm chủ'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=a=>'<ul>'+a.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
const fold=(s,html)=>'<details><summary>'+esc(s)+'</summary>'+html+'</details>';
const num=i=>String(i).padStart(2,'0'), key='hub.atlas.leaves.v1';
let db,nodes,ordered,children={},done=new Set(),page,domain,lesson,q='',filter='',noticeTimer;
function notify(msg){document.querySelector('#notice').textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>document.querySelector('#notice').textContent='',3000)}
function leaves(id){return children[id]?.flatMap(leaves)??[id]}
function state(id){const all=leaves(id),n=all.filter(x=>done.has(x)).length;return n===0?'new':n===all.length?'done':'part'}
const statusName={new:'Chưa học',part:'Đang học',done:'Hoàn thành'};
function count(items){return items.filter(x=>state(x.id)==='done').length}
const route=id=>'#road/all/'+id;
const bar=(a,b)=>'<div class="bar"><i style="width:'+Math.round(100*a/(b||1))+'%"></i></div>';
function courseDomain(n,d){return !d||d==='all'||n.domain_id===d||n.applicable_domains.includes(d)}
function palette(id){return '--t:'+colors[id][0]+';--p:'+colors[id][1]}
const symbols = {
 home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 road: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h8"/>',
 jobs: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12q9 5 18 0"/>',
 terms: '<path d="M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1zM12 6v14"/>',
 research: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
 LOG: '<path d="m3 8 9-5 9 5v9l-9 5-9-5zM3 8l9 5 9-5M12 13v9M7 5.8l9 5"/>',
 PUR: '<path d="M5 7h14l-3-3M19 17H5l3 3M19 7l-3 3M5 17l3-3"/>',
 HR: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"/>',
 FNB: '<path d="M3 17h18M5 15a7 7 0 0 1 14 0M12 8V6M10 5h4M5 20h14"/>',
 CORE: '<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>'
};
function icon(name) {
 return '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+symbols[name]+'</svg>';
}
function home() {
 const completed = count(ordered);
 const next = ordered.find(n => state(n.id)==='part') || ordered.find(n => state(n.id)==='new');
 const fields = ['LOG','PUR','HR','FNB','CORE'].map(d => {
  const items = ordered.filter(n => courseDomain(n,d));
  const learned = count(items);
  return `<a class="domain" style="${palette(d)}" href="#road/${d}">
    <span class="symbol">${icon(d)}</span><span><small class="code">${d}</small><b>${names[d]}</b>${bar(learned,items.length)}</span>
    <small>${learned}/${items.length} <span class="arrow">↗</span></small></a>`;
 }).join('');
 return `<section class="hero">
    <img class="landscape" src="assets/moonlit-river.webp" alt="" fetchpriority="high">
    <div class="hero-copy"><div class="eyebrow">Lộ trình cá nhân</div>
    <h1>Quản trị vận hành<br><em>đa ngành</em></h1>
    <a class="btn" href="${next?route(next.id):'#road'}">${next?(state(next.id)==='part'?'Tiếp tục học':'Mở bài học tiếp theo'):'Xem lộ trình'} <span class="arrow">→</span></a></div>
  </section>
  <div class="stats"><div class="stat"><small>Tiến độ tổng thể</small><strong>${Math.round(completed*100/ordered.length)}%</strong>${bar(completed,ordered.length)}</div>
    <div class="stat"><small>Bài đã hoàn thành</small><strong>${completed} <small>/ ${ordered.length}</small></strong></div>
    <a class="stat" href="#jobs"><small>Vị trí nghề nghiệp</small><strong>${db.roles.length} <small>↗</small></strong></a></div>
  <div class="title"><h2>Lĩnh vực học tập</h2><a href="#road">Toàn bộ lộ trình →</a></div><div class="domains">${fields}</div>
  ${next?`<div class="title"><h2>Bài học tiếp theo</h2></div><a class="panel next" href="${route(next.id)}"><span class="code">${next.id}</span><strong>${esc(next.title_vi)} ↗</strong></a>`:''}
  <div class="title"><h2>Mục tiêu học tập</h2></div><div class="panel">${list(db.project.objectives)}<a class="jump" href="#jobs">Xem tiến độ theo vị trí →</a></div>`;
}
function term(t){return '<div class="term"><b>'+esc(t.term_en)+'</b>'+esc(t.term_vi)+(t.abbreviation||t.full_form?'<small> · '+esc([t.abbreviation,t.full_form].filter(Boolean).join(' · '))+'</small>':'')+'<p>'+esc(t.meaning_vi)+'</p></div>'}
function refs(ids){return ids.map(id=>'<a href="'+route(id)+'">'+esc(id)+' · '+esc(nodes[id]?.title_vi)+'</a>').join('<br>')||'Không có'}
function check(id){return '<input type="checkbox" data-check="'+id+'" aria-label="Hoàn thành '+esc(nodes[id].title_vi)+'">'}
function tree(id){const n=nodes[id];return '<div class="child">'+check(id)+' <b>'+esc(n.title_vi)+'</b>'+fold(id+' · '+depth[n.required_depth],'<p>'+esc(n.description)+'</p>'+(children[id]||[]).map(tree).join(''))+'</div>'}
function lessonBody(n){
 const terms=db.glossary.filter(t=>n.term_ids.includes(t.id)||t.related_knowledge_ids.includes(n.id));
 return '<div class="lesson-progress"><label>'+check(n.id)+' Hoàn thành bài học</label><span data-count="'+n.id+'"></span><div class="bar"><i data-fill="'+n.id+'"></i></div></div><p class="muted">'+esc(n.title_en)+'</p><p>'+esc(n.description)+'</p><p><b>Nhóm năng lực</b> · '+esc(nodes[n.parent_id].title_vi)+'</p><p><b>Ứng dụng</b> · '+n.applicable_domains.map(d=>names[d]).join(', ')+'</p><p><b>Học trước</b><br>'+refs(n.prerequisites)+'</p>'+ (n.recommended_prerequisites.length?fold('Nên học trước',refs(n.recommended_prerequisites)):'')+'<h3>Chuẩn đầu ra</h3>'+list(n.learning_outcomes)+'<h3>Checklist nội dung</h3>'+(children[n.id]||[]).map(tree).join('')+fold('Thực hành · '+n.practice_mode.join(', '),list(n.practical_applications)+'<p>'+esc(n.tools.join(' · '))+'</p>')+fold('Thuật ngữ liên quan ('+terms.length+')',terms.map(term).join(''))+fold([...new Set(n.ai_notes.map(x=>ai[x.label]).concat(n.human_decisions.length?['Con người làm chủ']:[]))].join(' · '),n.ai_notes.map(a=>'<h3>'+esc(ai[a.label])+'</h3><b>'+esc(a.task)+'</b>'+list([a.technology,a.current_capability,a.near_term_outlook,'Trách nhiệm: '+a.human_responsibility,'Rủi ro: '+a.risks])).join('')+list(n.human_decisions))+'<button class="plain" data-copy="'+n.id+'">⧉ Sao chép lệnh học</button>'
}
function row(n){return '<details class="lesson" data-id="'+n.id+'" style="'+palette(n.domain_id)+'"><summary><span class="seq">'+num(n.sequence_number)+'</span><span><span class="code">'+n.id+' · '+names[n.domain_id]+'</span><strong>'+esc(n.title_vi)+'</strong><small>'+depth[n.required_depth]+' · <span data-state="'+n.id+'" data-value="'+state(n.id)+'">'+statusName[state(n.id)]+'</span></small></span></summary><div class="content"></div></details>'}
function jobs(){
 return '<h1>Vị trí nghề nghiệp</h1><p class="muted">Tiến độ thể hiện số bài yêu cầu đã hoàn thành. Kinh nghiệm thực tế và điều kiện tuyển dụng được ghi riêng cho từng vị trí.</p>'+db.roles.map(r=>{const req=r.knowledge_requirements,required=req.filter(k=>!['OPTIONAL','RECOMMENDED'].includes(k.requirement_type)),total=required.filter(k=>state(k.knowledge_id)==='done').length;return '<details class="role"><summary><span><small class="code">'+r.domain_id+' · '+access[r.accessibility]+'</small><strong style="display:block">'+esc(r.title_vi)+'</strong><small>'+total+'/'+required.length+' bài yêu cầu</small></span></summary><div class="content"><p>'+esc(r.title_en)+'</p><h3>Nhiệm vụ chính</h3>'+list(r.core_tasks)+[['Điều kiện tuyển dụng',r.required_qualifications],['Ưu tiên',r.preferred_qualifications],['Tiếng Anh',r.english_requirements],['Kinh nghiệm',r.experience_requirements],['Thực hành',r.practical_experience_requirements]].map(([k,v])=>'<p><b>'+k+'</b> · '+esc(v)+'</p>').join('')+'<h3>Kiến thức theo vị trí</h3>'+req.map(k=>'<p>'+refs([k.knowledge_id])+' · '+depth[k.required_depth]+'</p>').join('')+'</div></details>'}).join('')
}
function research(){return '<h1>Nguồn và giới hạn nghiên cứu</h1><div class="panel">'+fold('Phạm vi khảo sát',esc(db.research_summary.company_and_role_scope))+db.research_figures.map(f=>fold(f.title_vi,'<img loading="lazy" style="max-width:100%;height:auto" src="'+esc(f.path)+'" alt="'+esc(f.title_vi)+'">')).join('')+fold('Giới hạn dữ liệu',list(db.research_summary.source_gaps_and_unverified_items))+fold('Giới hạn khi ứng tuyển',list(db.research_summary.program_limitations_against_real_hiring))+fold('Nguồn tham khảo ('+db.sources.length+')',db.sources.map(s=>'<p><a class="source" href="'+esc(s.url)+'" target="_blank" rel="noreferrer">'+esc(s.title)+' ↗</a>'+esc(s.publisher)+' · '+esc(s.evidence_summary)+'</p>').join(''))+'</div>'}
function normalize(v){return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('đ','d')}
function matches(v){return normalize(v).includes(normalize(q.trim()))}
function results(){
 const isRoad=page==='road';
 const items=isRoad?ordered.filter(n=>courseDomain(n,domain)&&(!filter||state(n.id)===filter)&&matches([n.id,n.title_vi,n.title_en,...leaves(n.id).map(id=>nodes[id].title_vi),...(children[n.id]||[]).map(id=>nodes[id].title_vi)].join(' '))):db.glossary.filter(t=>matches([t.term_en,t.term_vi,t.abbreviation,t.full_form].join(' ')));
 document.querySelector('#results').innerHTML=items.length?items.map(isRoad?row:term).join(''):'<p class="empty">Không tìm thấy kết quả phù hợp.</p>';
 document.querySelector('#amount').textContent=items.length+(isRoad?' bài học':' thuật ngữ');
}
function hydrate(el){if(!el.querySelector('.content').hasChildNodes())el.querySelector('.content').innerHTML=lessonBody(nodes[el.dataset.id]);sync()}
function sync() {
 view.querySelectorAll('[data-check]').forEach(el => {
  const value = state(el.dataset.check);
  el.checked = value === 'done';
  el.indeterminate = value === 'part';
 });
 view.querySelectorAll('[data-state]').forEach(el => {
  const value = state(el.dataset.state);
  el.textContent = statusName[value];
  el.dataset.value = value;
 });
 view.querySelectorAll('[data-count]').forEach(el => {
  const ids = leaves(el.dataset.count);
  const completed = ids.filter(id => done.has(id)).length;
  el.textContent = completed+' / '+ids.length+' nội dung';
  el.parentElement.querySelector('[data-fill]').style.width = (100*completed/ids.length)+'%';
 });
}
function render(){
 const args=location.hash.slice(1).split('/');page=Object.hasOwn(pages,args[0])?args[0]:'home';domain=Object.hasOwn(names,args[1])?args[1]:'all';lesson=args[2];q='';filter='';
 document.querySelector('#crumb').textContent=pages[page];document.querySelector('nav').innerHTML=Object.entries(pages).map(([k,v])=>'<a href="#'+k+'" class="'+(page===k?'on':'')+'" '+(page===k?'aria-current="page"':'')+'><span class="icon">'+icon(k)+'</span>'+v+'</a>').join('');
 if(page==='road'||page==='terms'){
 view.innerHTML='<h1>'+(page==='road'?'Lộ trình học tập':'Thuật ngữ chuyên ngành')+'</h1><div class="filters"><input type="search" aria-label="Tìm kiếm" placeholder="'+(page==='road'?'Tìm theo tên hoặc mã kiến thức':'Tìm thuật ngữ Anh – Việt')+'">'+(page==='road'?'<select aria-label="Lĩnh vực" id="domain"><option value="all">Tất cả lĩnh vực</option>'+Object.entries(names).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select><select aria-label="Trạng thái" id="filter"><option value="">Mọi trạng thái</option>'+Object.entries(statusName).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select>':'')+'</div><small class="muted" id="amount"></small><div id="results"></div>';
 view.querySelector('input').oninput=e=>{q=e.target.value;results()};if(page==='road'){view.querySelector('#domain').value=domain;view.querySelector('#domain').onchange=e=>{location.hash='road/'+e.target.value};view.querySelector('#filter').onchange=e=>{filter=e.target.value;results()}}results();
 }else view.innerHTML=page==='home'?home():page==='jobs'?jobs():research();
 window.scrollTo({top:0,behavior:'instant'});
 if (!lesson && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const entrances = view.querySelectorAll(':scope > :is(h1,.hero,.stats,.filters,.panel), .lesson:nth-child(-n+4), .term:nth-child(-n+4), .role:nth-of-type(-n+4)');
  entrances.forEach((element,index) => element.animate(
   [{opacity:.45,transform:'translateY(6px)'},{opacity:1,transform:'none'}],
   {duration:260,delay:Math.min(index,4)*28,easing:'cubic-bezier(.2,.75,.2,1)',fill:'backwards'}
  ));
 }
 if(lesson&&page==='road'){const el=[...view.querySelectorAll('.lesson')].find(x=>x.dataset.id===lesson);if(el){el.open=true;hydrate(el);el.scrollIntoView({behavior:'instant'})}}
}
view.addEventListener('toggle',e=>{if(e.target.matches('.lesson[open]'))hydrate(e.target)},true);
view.addEventListener('change',e=>{const id=e.target.dataset.check;if(!id)return;leaves(id).forEach(k=>e.target.checked?done.add(k):done.delete(k));try{localStorage.setItem(key,JSON.stringify([...done]))}catch{notify('Trình duyệt chưa lưu được tiến độ.')}sync();if(filter)results()});
view.addEventListener('click',async e=>{const n=nodes[e.target.dataset.copy];if(n){const prompt='Bắt đầu bài học '+n.id+' – '+n.title_vi+'.';try{await navigator.clipboard.writeText(prompt);notify('Đã sao chép lệnh học')}catch{window.prompt('Sao chép lệnh học',prompt)}}});
async function init(){
 const embedded = document.getElementById('roadmap-data');
 if (embedded) {
  db = JSON.parse(embedded.textContent);
 } else {
  const response = await fetch('roadmap.json');
  if (!response.ok) throw new Error('Roadmap unavailable');
  db = await response.json();
 }
 nodes=Object.fromEntries(db.knowledge_nodes.map(n=>[n.id,n]));ordered=db.learning_order.map(id=>nodes[id]);for(const n of db.knowledge_nodes)if(n.parent_id)(children[n.parent_id]??=[]).push(n.id);
 try{done=new Set(JSON.parse(localStorage.getItem(key)||'[]'))}catch{notify('Không đọc được tiến độ đã lưu.')}
 window.addEventListener('hashchange',render);render()
}
init().catch(()=>{view.textContent='Không đọc được roadmap.json. Vui lòng tải lại trang.'})
