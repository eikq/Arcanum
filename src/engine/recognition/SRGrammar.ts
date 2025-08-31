import { HP_SPELL_LEXICON } from "@/data/spell_lexicon";

export function applySpellGrammar(recognition: any){
  try{
    const Grammar = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    if(!Grammar) return;
    const list = new Grammar();
    // SRGS-like simple list; give them higher weight
    const phrases = HP_SPELL_LEXICON.flatMap(e=> [e.name, ...e.aliases]).join(" | ");
    const rule = `#JSGF V1.0; grammar spells; public <spell> = ${phrases};`;
    list.addFromString(rule, 1.0);
    recognition.grammars = list;
  }catch(error){
    // Silent fallback - grammar boost not supported
    console.log('Speech grammar not supported, using fallback recognition');
  }
}