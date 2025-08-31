import type { Spell } from "@/types/game";

// Minimal phoneme notation: ARPAbet-ish strings or simple syllables.
// Keep short; we use them only for distance scoring.
export type LexEntry = {
  id: string;
  name: string;
  aliases: string[];        // common misspellings + hyphenations
  phonemes: string[];       // 1–3 variants (coarse is fine)
  element: Spell["element"];
  type: Spell["type"];
  difficulty: Spell["difficulty"];
};

export const HP_SPELL_LEXICON: LexEntry[] = [
  { id:"expelliarmus", name:"Expelliarmus", element:"light", type:"attack", difficulty:"medium",
    aliases:["expeliarmus","expellyarmus","expe-li-ar-mus","disarm","disarming spell","expe-lee-are-mus","expelyarmus"],
    phonemes:["EH K S P EH L IY AA R M AH S","ex pel ee ar mus"] },
  { id:"stupefy", name:"Stupefy", element:"arcane", type:"attack", difficulty:"easy",
    aliases:["stupify","stoo-pe-fy","stu-pe-fai","stupfy","stupefai"],
    phonemes:["S T UW P AH F AY","stoo peh fai"] },
  { id:"wingardium_leviosa", name:"Wingardium Leviosa", element:"wind", type:"utility", difficulty:"hard",
    aliases:["wingardium leviosar","leviosa spell","win gardium levi o sa","levitate"],
    phonemes:["wihn GAR dee um leh vee OH sah"] },
  { id:"lumos", name:"Lumos", element:"light", type:"utility", difficulty:"easy",
    aliases:["loomos","lummus","light spell","lumo"],
    phonemes:["LOO mos"] },
  { id:"nox", name:"Nox", element:"shadow", type:"utility", difficulty:"easy",
    aliases:["knox","nochs","darken"],
    phonemes:["NOX"] },
  { id:"accio", name:"Accio", element:"wind", type:"utility", difficulty:"easy",
    aliases:["akio","asio","accio spell","summon"],
    phonemes:["AK ee oh","AE K IY OW"] },
  { id:"alohomora", name:"Alohomora", element:"arcane", type:"utility", difficulty:"easy",
    aliases:["alohamora","aloha mora","unlock","open lock"],
    phonemes:["ah LOH hah MOR ah"] },
  { id:"protego", name:"Protego", element:"light", type:"shield", difficulty:"medium",
    aliases:["protego shield","proteco","proteggo","protecto","shield"],
    phonemes:["pro TAY go"] },
  { id:"reparo", name:"Reparo", element:"light", type:"utility", difficulty:"easy",
    aliases:["repair oh","repairo","fix","repair spell"],
    phonemes:["reh PAH roh"] },
  { id:"expecto_patronum", name:"Expecto Patronum", element:"light", type:"attack", difficulty:"hard",
    aliases:["expecto patrona","patronus","expecto","dementor spell"],
    phonemes:["ek SPECK toh pah TROH num"] },
  { id:"incendio", name:"Incendio", element:"fire", type:"attack", difficulty:"easy",
    aliases:["incendia","incendiyo","fire spell","inferno"],
    phonemes:["in SEN dee oh"] },
  { id:"aguamenti", name:"Aguamenti", element:"water", type:"attack", difficulty:"medium",
    aliases:["aguamente","agua menti","water jet","water spell"],
    phonemes:["ah gwah MEN tee"] },
  { id:"diffindo", name:"Diffindo", element:"earth", type:"attack", difficulty:"medium",
    aliases:["defindo","diffindo spell","severing"],
    phonemes:["dih FIN doh"] },
  { id:"rictusempra", name:"Rictusempra", element:"wind", type:"attack", difficulty:"medium",
    aliases:["rictosempra","tickling charm","rick too semp rah"],
    phonemes:["rik too SEM prah"] },
  { id:"obliviate", name:"Obliviate", element:"shadow", type:"utility", difficulty:"hard",
    aliases:["oblivate","oblivion spell","memory wipe"],
    phonemes:["oh BLIH vee ate"] },
  { id:"episkey", name:"Episkey", element:"light", type:"heal", difficulty:"easy",
    aliases:["episky","healing spell","heal"],
    phonemes:["eh PISS kee"] },
  { id:"sectumsempra", name:"Sectumsempra", element:"shadow", type:"attack", difficulty:"hard",
    aliases:["sectum sempra","sectumsempera","shadow slash"],
    phonemes:["SEK tum SEM prah"] },
  { id:"silencio", name:"Silencio", element:"shadow", type:"utility", difficulty:"medium",
    aliases:["silensio","silence spell","mute"],
    phonemes:["sih LEN see oh"] },
  { id:"petrificus_totalus", name:"Petrificus Totalus", element:"arcane", type:"attack", difficulty:"hard",
    aliases:["petrificus","totalus","body bind","petrify","petrificus totalis"],
    phonemes:["peh TRIF ih kus toh TAL us"] },
  { id:"imperio", name:"Imperio", element:"shadow", type:"attack", difficulty:"hard",
    aliases:["imperial","im perio","imper i o"],
    phonemes:["im PEER ee oh"] },
  { id:"crucio", name:"Crucio", element:"shadow", type:"attack", difficulty:"hard",
    aliases:["crusio","crushio","croo she oh","cru she oh","crucial","whoseeyou","who see yo"],
    phonemes:["KROO shee oh","K R UW SH IY OW"] },
  { id:"avada_kedavra", name:"Avada Kedavra", element:"shadow", type:"attack", difficulty:"veryhard",
    aliases:["avadakedavra","avada kadavra","avada kedavrah","avadah","kill curse"],
    phonemes:["ah VAH dah keh DAHV rah"] },
];