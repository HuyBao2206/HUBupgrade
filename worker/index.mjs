const relations = ['Khách qua đường','Sơ giao','Bằng hữu','Đồng đạo','Cố nhân','Hảo hữu','Tri kỷ','Thủ túc','Tâm thượng nhân','Phu thê / Bạn đời'];
const knowledgeId = /^(CORE|PUR|LOG|HR|FNB)-\d{2}(\.\d{2})+$/;
function profileData(input,name) {
  const validIds = list => Array.isArray(list) && list.length <= 500 &&
    list.every(id => typeof id==='string' && knowledgeId.test(id)) && new Set(list).size===list.length;
  if (input?.username!==name || !relations.includes(input.relation) ||
      !/^[a-f0-9-]{36}$/.test(input.id) || !Number.isFinite(Date.parse(input.createdAt)) ||
      !validIds(input.completedLessons) || !validIds(input.completedItems)) return null;
  return {username:name,relation:input.relation,id:input.id,completedLessons:input.completedLessons,
    completedItems:input.completedItems,createdAt:input.createdAt,updatedAt:new Date().toISOString()};
}
function encode(text) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}
export default {
  async fetch(request,env) {
    const origin = env.ALLOWED_ORIGIN ?? 'https://huybao2206.github.io';
    const repo = env.GITHUB_REPO ?? 'HuyBao2206/HUBupgrade';
    const branch = env.GITHUB_BRANCH ?? 'main';
    if (!origin || request.headers.get('Origin')!==origin) return new Response(null,{status:403});
    const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store',
      'Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
    const reply=(status,body)=>Response.json(body,{status,headers});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
    const match=new URL(request.url).pathname.match(/^\/profiles\/([a-z0-9]+)$/);
    if(!match) return reply(404,{error:'unknown_route'});
    if(!['GET','PUT'].includes(request.method)) return reply(405,{error:'method'});
    if(!env.GITHUB_TOKEN) return reply(503,{error:'configuration'});
    const name=match[1];
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(name));
    const filename=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const url='https://api.github.com/repos/'+repo+'/contents/data/progress/'+filename+'.json';
    const gh={Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','User-Agent':'hub-progress-worker','X-GitHub-Api-Version':'2022-11-28'};
    try {
      const existing=await fetch(url+'?ref='+encodeURIComponent(branch),{headers:gh,cache:'no-store'});
      if(!existing.ok && existing.status!==404) return reply(503,{error:'storage_unavailable'});
      const file=existing.ok?await existing.json():null;
      const previous=file?JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content),c=>c.charCodeAt(0)))):null;
      if(request.method==='GET') return file?reply(200,{profile:previous,sha:file.sha}):reply(404,{error:'missing'});
      if(!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415,{error:'content_type'});
      const raw=await request.text();
      if(raw.length>65536) return reply(413,{error:'size'});
      let data;
      try {data=JSON.parse(raw);} catch {return reply(400,{error:'json'});}
      const profile=profileData(data?.profile,name);
      if(!profile) return reply(400,{error:'invalid_profile'});
      if(data.sha!==(file?.sha??null) || (previous && (profile.id!==previous.id || profile.relation!==previous.relation || profile.createdAt!==previous.createdAt)))
        return reply(409,{error:'conflict'});
      const saved=await fetch(url,{method:'PUT',headers:{...gh,'Content-Type':'application/json'},
        body:JSON.stringify({message:'Save learning progress [skip ci]',branch,
          content:encode(JSON.stringify(profile)),...(file && {sha:file.sha})})});
      if(saved.status===409 || saved.status===422) return reply(409,{error:'conflict'});
      if(!saved.ok) return reply(503,{error:'storage_unavailable'});
      return reply(200,{profile,sha:(await saved.json()).content.sha});
    } catch { return reply(503,{error:'storage_unavailable'}); }
  }
};
