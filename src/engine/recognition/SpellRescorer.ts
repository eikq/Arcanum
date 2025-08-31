import { HP_SPELL_LEXICON, LexEntry } from "@/data/spell_lexicon";

// Light Double-Metaphone-ish code tailored for our Latin-ish spell names.
// Keep tiny; accuracy > purity here.
function phoneticKey(s: string): string {
  const t = s.toLowerCase()
    .replace(/qu/g, "k")
    .replace(/x/g, "ks")
    .replace(/ph/g,"f")
    .replace(/ch/g,"x") // treat 'ch' distinct
    .replace(/[aeiou]+/g,"a")
    .replace(/[^a-z]/g,"");
  return t.replace(/(.)\1+/g, "$1"); // de-dupe repeats
}

function norm(s:string){
  return s.toLowerCase()
    .replace(/[''`]/g,"")
    .replace(/[^a-z0-9 ]/gi," ")
    .replace(/\s+/g," ")
    .trim();
}

// Levenshtein with small weights; ok for short strings
function edit(a:string,b:string){
  const m=a.length,n=b.length; 
  const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i; 
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){
    const cost=a[i-1]===b[j-1]?0:1;
    dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
  }
  return 1 - dp[m][n]/Math.max(1,Math.max(m,n)); // normalize 0..1 (1=identical)
}

function scoreAgainst(entry:LexEntry, q:string){
  // Compare transcript to each alias & name; also compare phonetic keys
  const cand = [entry.name, ...entry.aliases];
  const qn = norm(q);
  const qk = phoneticKey(qn);
  let best = 0;
  for(const c of cand){
    const cn = norm(c);
    const ck = phoneticKey(cn);
    const text = edit(qn, cn);
    const ph = edit(qk, ck);
    best = Math.max(best, 0.55*text + 0.45*ph);
  }
  // Bonus if any lex phoneme chunk appears inside q
  for(const ph of entry.phonemes){
    if (qn.includes(norm(ph))) best = Math.max(best, 0.9);
  }
  return best;
}

export type RescoreResult = { id:string; name:string; score:number; entry:LexEntry };

export function rescoreSpell(transcript:string, topN=3): RescoreResult[] {
  const results = HP_SPELL_LEXICON.map(e => ({ 
    id:e.id, 
    name:e.name, 
    entry:e, 
    score: scoreAgainst(e, transcript) 
  }));
  results.sort((a,b)=>b.score-a.score);
  return results.slice(0, topN);
}

// Convenience: pick top or fallback
export function bestOrFallback(transcript:string, minScore=0.4){
  const [top] = rescoreSpell(transcript, 1);
  if(!top || top.score < minScore){
    const fb = HP_SPELL_LEXICON.find(x=>x.id==="expelliarmus") ?? HP_SPELL_LEXICON[0]; // choose something safe
    return { entry: fb, score: top?.score ?? 0.15, matched:false };
  }
  return { entry: top.entry, score: top.score, matched:true };
}