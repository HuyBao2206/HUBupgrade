const progressUI = (() => {
  const relations = [
    ['Khách qua đường','過客 - Quá khách','Người lạ tình cờ lướt qua nhau, chưa từng quen biết.'],
    ['Sơ giao','初交','Người mới quen biết, mối quan hệ còn xã giao, khách sáo.'],
    ['Bằng hữu','朋友','Bạn bè bình thường, ngang hàng.'],
    ['Đồng đạo','同道','Người cùng chung chí hướng, sở thích hoặc cùng một "hệ" với nhau.'],
    ['Cố nhân','故人','Người quen cũ, người bạn từ thuở trước lâu ngày gặp lại.'],
    ['Hảo hữu','好友','Bạn tốt, thân thiết và tin tưởng lẫn nhau.'],
    ['Tri kỷ','知己','Người hiểu thấu tâm tư, tính cách của mình nhất.'],
    ['Thủ túc','手足','Anh em ruột thịt hoặc bạn bè thân thiết như tay chân.'],
    ['Tâm thượng nhân','心上人','Người trong lòng, người thầm thương trộm nhớ hoặc người yêu.'],
    ['Phu thê / Bạn đời','夫妻 / 伴侶','Vợ chồng, người gắn bó trọn đời.']
  ];
  const dialog = document.querySelector('#progress-dialog');
  const create = document.querySelector('#create-profile'), enter = document.querySelector('#enter-profile');
  const openers = document.querySelector('#profile-actions');
  const legacy = document.querySelector('#legacy-choice');
  const tooltip = document.createElement('div');
  tooltip.id='relation-tip';
  tooltip.hidden=true;
  tooltip.setAttribute('role','tooltip');
  dialog.append(tooltip);
  let busy=false, closing=false, anchor, pinned, restoreFocus, selectedProfile, onChange;
  const submit = form => form.querySelector('[type=submit]');
  const message = form => form.querySelector('.form-error');
  function hideTip() {
    anchor?.removeAttribute('aria-describedby');
    anchor=null; pinned=false; tooltip.hidden=true;
  }
  function showTip(button,sticky) {
    hideTip();
    const [,han,meaning]=relations[Number(button.dataset.info)];
    tooltip.textContent=han+': '+meaning;
    tooltip.hidden=false;
    anchor=button; pinned=sticky;
    button.setAttribute('aria-describedby',tooltip.id);
    const box=button.getBoundingClientRect(), bounds=dialog.getBoundingClientRect();
    const left=Math.max(bounds.left+8,Math.min(box.right-tooltip.offsetWidth,bounds.right-tooltip.offsetWidth-8));
    const top=box.bottom+tooltip.offsetHeight+8 < Math.min(bounds.bottom,innerHeight)
      ? box.bottom+5 : box.top-tooltip.offsetHeight-5;
    tooltip.style.left=(left-bounds.left+dialog.scrollLeft)+'px';
    tooltip.style.top=(top-bounds.top+dialog.scrollTop)+'px';
  }
  function showFormState() {
    const ready=storageService.validName(create.elements.username.value) && !!create.elements.relation.value;
    submit(create).setAttribute('aria-disabled',String(!ready || busy));
  }
  function flag(form,text,target) {
    message(form).textContent=text;
    target.classList.remove('shake');
    void target.offsetWidth;
    target.classList.add('shake');
    const field=target.matches('fieldset')?target.querySelector('input'):target;
    field.setAttribute('aria-invalid','true');
    field.focus();
  }
  function open(mode,trigger) {
    if(dialog.open || closing) return;
    restoreFocus=trigger||document.activeElement;
    create.reset(); enter.reset();
    for(const f of [create,enter]) {
      message(f).textContent='';
      f.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    }
    try { legacy.hidden=!storageService.legacyItems().length; }
    catch { legacy.hidden=true; }
    if (selectedProfile && storageService.read(selectedProfile.username)?.conflict) {
      create.elements.relation.value=selectedProfile.relation;
      message(create).textContent='Danh xưng bị trùng khi đồng bộ. Chọn tên khác để giữ tiến độ.';
    }
    showFormState(); dialog.dataset.column=mode;
    dialog.showModal();
    const field=(mode==='enter'?enter:create).elements.username;
    field.focus({preventScroll:true});
    if(mode==='enter') field.scrollIntoView({block:'nearest',behavior:'instant'});
    else dialog.scrollTop=0;
  }
  async function close() {
    if(!dialog.open || closing) return;
    closing=true; hideTip(); dialog.classList.add('leaving');
    await Promise.allSettled(dialog.getAnimations().map(animation=>animation.finished));
    dialog.close(); dialog.classList.remove('leaving'); closing=false;
    if(restoreFocus?.isConnected && !restoreFocus.hidden) restoreFocus.focus({preventScroll:true});
    else openers.querySelector('[data-dialog=enter]').focus({preventScroll:true});
  }
  function display(profile) {
    selectedProfile=profile;
    const active=document.querySelector('#active-name'), leave=document.querySelector('#leave-profile');
    active.hidden=leave.hidden=!profile;
    active.textContent=profile?.username||'';
    active.title=active.textContent;
    const collision=profile && storageService.read(profile.username)?.conflict;
    openers.querySelector('[data-dialog=create]').hidden=!!profile && !collision;
    openers.querySelector('[data-dialog=create]').textContent=collision?'Đổi danh xưng bị trùng':'Khai mở tiến trình';
    openers.querySelector('[data-dialog=enter]').textContent=profile?'Đổi tiến trình':'Vào tiến trình của bạn';
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if(busy || closing) return;
    const form=event.currentTarget, input=form.elements.username, raw=input.value;
    if(!storageService.validName(raw)) return flag(form,'Chỉ dùng chữ cái không dấu và số.',input);
    if(form===create && !create.elements.relation.value) return flag(form,'Hãy chọn một mối quan hệ.',document.querySelector('#relations'));
    busy=true; dialog.setAttribute('aria-busy','true'); submit(form).setAttribute('aria-busy','true');
    message(form).textContent=''; showFormState();
    try {
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const profile=form===create
        ? await storageService.create(raw,create.elements.relation.value,!legacy.hidden && legacy.querySelector('input').checked)
        : await storageService.enter(raw);
      onChange(profile);
      await close();
      notify((form===create?'Đã tạo tiến trình · ':'Đã vào tiến trình · ')+profile.username);
    } catch(error) {
      flag(form,error instanceof DOMException?'Trình duyệt không lưu được tiến trình.':error.message,input);
    } finally {
      busy=false; dialog.removeAttribute('aria-busy'); submit(form).removeAttribute('aria-busy'); showFormState();
    }
  }
  function init(change) {
    onChange=change;
    const grid=dialog.querySelector('.relation-grid');
    relations.forEach(([name],i)=>{
      const card=document.createElement('div'); card.className='relation-card';
      card.style.setProperty('--i',i);
      card.innerHTML='<label><input type="radio" name="relation" required><span class="choice-mark" aria-hidden="true"></span><span></span></label><button type="button" class="info">i</button>';
      card.querySelector('input').value=name;
      card.querySelector('label span:last-child').textContent=name;
      const info=card.querySelector('button');
      info.dataset.info=i; info.setAttribute('aria-label','Giải nghĩa '+name);
      info.onclick=()=>{if(anchor===info && pinned) hideTip(); else showTip(info,true)};
      info.onpointerenter=e=>{if(e.pointerType==='mouse' && !pinned) showTip(info,false)};
      info.onpointerleave=()=>{if(!pinned) hideTip()};
      info.onblur=hideTip;
      grid.append(card);
    });
    dialog.addEventListener('pointerdown',e=>{if(!e.target.closest('.info')) hideTip()});
    dialog.addEventListener('scroll',hideTip); window.addEventListener('resize',hideTip);
    for(const form of [create,enter]) {
      form.onsubmit=handleSubmit;
      form.oninput=()=>{
        message(form).textContent='';
        form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
        showFormState();
      };
    }
    openers.onclick=e=>{
      const button=e.target.closest('button');
      if(button?.dataset.dialog) open(button.dataset.dialog,button);
      if(button?.id==='leave-profile') {
        storageService.leave(); onChange(null); notify('Đã thoát tiến trình');
        openers.querySelector('[data-dialog=enter]').focus();
      }
    };
    dialog.addEventListener('cancel',e=>{e.preventDefault(); if(pinned) hideTip(); else if(!busy) close()});
    dialog.querySelector('[data-close]').onclick=()=>{if(!busy) close()};
    dialog.onclick=e=>{
      if(e.target!==dialog || busy) return;
      const b=dialog.getBoundingClientRect();
      if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom) close();
    };
  }
  return {init,display,open};
})();
