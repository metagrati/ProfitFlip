#!/usr/bin/env node
/**
 * gen-issues.mjs — v1.0
 * -------------------------------------------------------------------------
 * Comprehensive, production-ready GitHub issue synchroniser for HYBRID-PLUS
 * plans.  This file supersedes all previous canvas versions; everything has
 * been stitched together and fully closed off (including the previously
 * truncated close-missing logic and final summary).
 *
 * ▸ Node ≥18  ▸ `npm i glob @octokit/rest marked yargs`
 */

/* ────────────────────────────────────────────────────────── Imports */
import fs from 'fs/promises';
import path from 'path';
import { Octokit } from '@octokit/rest';
import { marked } from 'marked';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import crypto from 'crypto';

// Optional dep: glob (fail fast if missing)
let globSync;
try { ({ globSync } = await import('glob')); }
catch { console.error('❌  Missing dependency: glob  →  run  `npm i glob`'); process.exit(1); }

/* ────────────────────────────────────────────────────────── CLI */
const argv = yargs(hideBin(process.argv))
  .scriptName('gen-issues')
  .usage('$0 --plan <glob> --repo owner/repo [options]')
  .example('$0 -p docs/*PLAN*.md --dry-run --verbose', 'Preview changes from all plan files')
  .option('plan',         { alias:'p', type:'string', demandOption:true,  describe:'Markdown plan glob' })
  .option('repo',         {            type:'string',                    describe:'GitHub repo (owner/name)' })
  .option('token',        {            type:'string',                    describe:'GitHub token (else env)' })
  .option('dry-run',      {            type:'boolean', default:false,    describe:'No API calls' })
  .option('verbose',      {            type:'boolean', default:false,    describe:'Show diff/body preview' })
  .option('close-missing',{            type:'boolean', default:false,    describe:'Close issues not in any plan' })
  .option('concurrency',  {            type:'number',  default:5,        describe:'Parallel GitHub requests' })
  .option('delay',        {            type:'number',  default:0,        describe:'Fixed ms delay between tasks' })
  .option('max-retries',  {            type:'number',  default:3,        describe:'Max API retries per call' })
  .alias('h','help').strict().parseSync();

const {
  plan: PLAN_GLOB, repo: REPO_FLAG, token: TOKEN_FLAG,
  dryRun: DRY, verbose: VERBOSE, closeMissing: CLOSE_MISSING,
  concurrency: CONC, delay: FIXED_DELAY, maxRetries: MAX_RETRIES,
} = argv;

/* ────────────────────────────────────────────────────────── Repo/Token */
const REPO_SLUG = REPO_FLAG || process.env.GITHUB_REPOSITORY;
const GITHUB_TOKEN = TOKEN_FLAG || process.env.GITHUB_TOKEN;
if (!REPO_SLUG) throw new Error('Specify --repo or set GITHUB_REPOSITORY');
const [OWNER, REPO] = REPO_SLUG.split('/');
if (!OWNER || !REPO) throw new Error(`Invalid repo "${REPO_SLUG}"`);
if (!GITHUB_TOKEN && !DRY) throw new Error('GitHub token missing (use --token or env)');
console.log(`→ Repo: ${OWNER}/${REPO}${DRY ? '  (dry-run)' : ''}`);

/* ────────────────────────────────────────────────────────── Utils */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64');
const diffCtx = (a,b,c=2) => {
  const A=a.split(/\r?\n/), B=b.split(/\r?\n/); let out=[];
  for(let i=0;i<Math.max(A.length,B.length);i++) if(A[i]!==B[i]){
    for(let j=Math.max(0,i-c);j<Math.min(i+c+1,Math.max(A.length,B.length));j++)
      out.push((A[j]===B[j]?'  ':'- ')+ (A[j]||''), (A[j]===B[j]?'':'+ '+(B[j]||'')));
    break;
  }
  return out.slice(0,12).join('\n');
};

/* ────────────────────────────────────────────────────────── Markdown parsing */
const HEADING_RX = /\*\*(P\d+-T\d+)\*\*/i;
const exactOrInc = (arr,kw)=>{ const l=kw.toLowerCase(); const ex=arr.findIndex(h=>h===l); return ex!==-1?ex:arr.findIndex(h=>h.includes(l)); };
const lblPhase   = id => `phase-${id.split('-')[0].slice(1)}`;
const parseTable = (toks,file)=>{
  const out=[];
  for(const t of toks) if(t.type==='table'){
    const h=t.header.map(s=>s.toLowerCase());
    const iId=exactOrInc(h,'id'); if(iId===-1) continue;
    const iTask=exactOrInc(h,'task'),iLab=exactOrInc(h,'label');
    const iEta=exactOrInc(h,'eta'),iDep=exactOrInc(h,'depend');
    for(const row of t.rows){ const id=row[iId]?.trim(); if(!/^P\d+-T\d+$/i.test(id||'')) continue;
      const labels=[lblPhase(id)]; if(/⚡/.test(row[iLab])) labels.push('parallel'); const m=row[iEta]?.match(/(\d+)\s*m/i); if(m) labels.push(`eta-${m[1]}m`);
      out.push({id,title:`${id}: ${row[iTask]?.trim()||'Untitled'}`,depends:row[iDep]?.match(/P\d+-T\d+/gi)?.join(', ')||'',labels,source:file,mode:'table'});
    }
  }
  return out;
};
const parseHeading = (toks,file)=>{
  const out=[]; let cur=null,depth=0;
  for(const tk of toks){ if(tk.type==='heading'){ const m=tk.text.match(HEADING_RX);
      if(m){ if(cur) out.push(cur); cur={id:m[1], heading:tk.text, body:[], depth:tk.depth}; depth=tk.depth; continue; }
      if(cur && tk.depth<=depth){ out.push(cur); cur=null; }
    }
    if(cur && tk.raw) cur.body.push(tk.raw);
  } if(cur) out.push(cur);
  return out.map(t=>{ const body=t.body.join(''); const labels=[lblPhase(t.id)]; if(/⚡/.test(t.heading)||/⚡/.test(body)) labels.push('parallel'); const m=(t.heading+body).match(/ETA[:\s]*(\d+)\s*m/i); if(m) labels.push(`eta-${m[1]}m`);
    return {id:t.id,title:`${t.id}: ${t.heading.replace(HEADING_RX,'').trim()}`,depends:'',labels,source:file,mode:'heading',bodyRaw:body}; });
};

/* ────────────────────────────────────────────────────────── Gather tasks */
const files = globSync(PLAN_GLOB,{nodir:true});
if(!files.length) throw new Error(`No files match pattern "${PLAN_GLOB}"`);
console.log(`Scanning ${files.length} plan file(s)…`);
const tasks=[], seen=new Set(); let dup=0;
for(const f of files){ const md=await fs.readFile(f,'utf8'); const tok=marked.lexer(md); let arr=parseTable(tok,f); if(!arr.length) arr=parseHeading(tok,f);
  if(!arr.length){ console.warn(`  ⚠️  No tasks parsed in ${f}`); continue; }
  for(const t of arr){ if(seen.has(t.id)){dup++; console.warn(`  ⚠️  Duplicate ID ${t.id} (skip in ${f})`); continue;} seen.add(t.id); tasks.push(t);} }
if(!tasks.length) throw new Error('No tasks found across all plan files.');
console.log(`→ Parsed ${tasks.length} tasks (duplicates ignored: ${dup})`);

/* ────────────────────────────────────────────────────────── GitHub */
const octo = DRY ? null : new Octokit({ auth:GITHUB_TOKEN });
const cache=new Map();
if(!DRY){ for await(const pg of octo.paginate.iterator(octo.search.issuesAndPullRequests,{q:`repo:${OWNER}/${REPO} is:issue`,per_page:100})) for(const iss of pg.data){ const m=iss.title.match(/^(P\d+-T\d+):/); if(m) cache.set(m[1],iss);} }

/* ────────────────────────────────────────────────────────── Retry wrapper */
async function attempt(fn,label){ let tries=0; while(true){ try{return await fn();}
  catch(e){
    if(e.status===403 && e.headers?.['x-ratelimit-remaining']==='0'){ const wait=(+e.headers['x-ratelimit-reset']*1000)-Date.now()+1000; console.warn(`⏳ Rate-limit (${label}) wait ${Math.ceil(wait/1000)}s`); await sleep(wait); }
    else if(++tries<MAX_RETRIES){ console.warn(`⚠️  ${label} retry ${tries}/${MAX_RETRIES-1}`); await sleep(1000*tries); }
    else throw e; } } }

/* ────────────────────────────────────────────────────────── Stat + logger */
const stat={create:0,update:0,noop:0,close:0,error:0,duplicates:dup};
const icon={create:'＋',update:'↻',noop:'✓',close:'✖',error:'‼'};
const log=(act,id,num='')=>{ console.log(`${icon[act]} ${id}${num?` (#${num})`:''}`); stat[act]++; };

/* ────────────────────────────────────────────────────────── Upsert */
async function sync(t){
  const base={source:path.relative('.',t.source),depends:t.depends};
  const sig = t.mode==='table' ? b64(base) : b64({...base,sha:sha256(t.bodyRaw)});
  const body = t.mode==='table' ? `<!-- gen-issues: ${sig} -->\n${JSON.stringify(base,null,2)}` : `<!-- gen-issues: ${sig} -->\n${t.bodyRaw}`;
  const existing=cache.get(t.id);
  if(existing){
    const cur=existing.body?.match(/^<!-- gen-issues: (.+?) -->/)?.[1];
    if(cur===sig){ log('noop',t.id,existing.number); return; }
    if(DRY){ log('update',t.id,existing.number); if(VERBOSE) console.log(diffCtx(existing.body||'',body)); return; }
    await attempt(()=>octo.issues.update({owner:OWNER,repo:REPO,issue_number:existing.number,title:t.title,body,labels:t.labels}),`update ${t.id}`);
    log('update',t.id,existing.number); return;
  }
  if(DRY){ log('create',t.id); if(VERBOSE) console.log(body.slice(0,500)+(body.length>500?'…':'')); return; }
  const {data}=await attempt(()=>octo.issues.create({owner:OWNER,repo:REPO,title:t.title,body,labels:t.labels}),`create ${t.id}`);
  log('create',t.id,data.number);
}

/* ────────────────────────────────────────────────────────── Pool */
const pool=[];
for(const t of tasks){
  const p=(async()=>{ try{ await sync(t);} catch(e){ stat.error++; console.error(`‼ ${t.id} – ${e.message}`);} })();
  pool.push(p);
  if(pool.length>=CONC){ await Promise.all(pool.splice(0)); }
  if(FIXED_DELAY) await sleep(FIXED_DELAY);
}
await Promise.all(pool);

/* ────────────────────────────────────────────────────────── Close missing */
if(CLOSE_MISSING && !DRY){
  for(const [id,iss] of cache.entries())
    if(!seen.has(id))
      { await attempt(()=>octo.issues.update({owner:OWNER,repo:REPO,issue_number:iss.number,state:'closed'}),`close ${id}`); log('close',id,iss.number);} }

/* ────────────────────────────────────────────────────────── Summary */
const pad=n=>n.toString().padStart(3,' ');
console.log(`\nSummary: create ${pad(stat.create)}  update ${pad(stat.update)}  noop ${pad(stat.noop)}  close ${pad(stat.close)}  error ${pad(stat.error)}  duplicates ${pad(stat.duplicates)}`);
console.log('✔ sync complete');
