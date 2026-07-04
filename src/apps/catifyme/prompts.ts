const STYLES = [
  "acid surrealism, melting clocks, impossible geometry, floating cat elements, Salvador Dali on LSD meeting a cat, dreamlike distortion, hyperdetailed, mind-bending composition",
  "neo-Tokyo cyberpunk overload, glowing magenta and cyan neon, holographic cats, futuristic city backdrop, rain-slick streets, blade-runner aesthetic, intense volumetric lighting, ultra-detailed",
  "hardcore glitch art, datamoshed cat, broken pixels, digital artifacts, RGB channel split, VHS distortion, corrupted JPEG aesthetic, half-cat half-digital-noise, jarring",
  "vaporwave maximalism, Greek bust aesthetic with cat head, palm trees, pink and cyan gradient sky, retro-future grid floor, acid color palette, marble texture, surreal 80s nostalgia",
  "dark fantasy epic, Souls/Bloodborne vibe, ornate gothic cat with glowing eye-sword, dramatic chiaroscuro, cathedral backdrop, epic scale, moody atmospheric fog, intricate armor details",
  "pop-art explosion, comic book halftone dots, bold black outlines, primary red yellow blue, BOOM POW effects, Roy Lichtenstein style, explosive composition, high contrast",
  "street mega-mural, massive graffiti cat on concrete wall, spray-paint texture, dripping paint, punk-rock attitude, urban decay backdrop, political poster aesthetic, raw and aggressive",
  "dreamcore weird, liminal space, impossible pastel colors, eerie unsettling vibes, floating cat in void, nostalgia-but-wrong, soft glow, slightly-off proportions, uncanny",
] as const;

const PERSONALITY_VIBES = [
  "always in a fucking great mood, confident, doesn't give a fuck, loves life, unapologetic",
  "a smug arrogant bastard, thinks everyone else is a loser, condescending but hilarious",
  "a gloomy philosopher, finds deep meaning in laziness, deadpan dark humor",
  "a hyperactive psycho, chaos incarnate, runs everywhere for no reason, unhinged energy",
  "a sleepy lazy bastard, refuses to move, judges you for being active",
  "an arrogant aristocrat, treats everyone as peasants, sophisticated insults",
  "a paranoid conspiracy theorist, the government is watching, tin foil hat vibes",
  "a zen sage, everything is an illusion especially the food, cryptic wisdom",
  "a chaotic trickster, lies for fun, gaslights you about reality",
  "a dramatic diva, everything is a tragedy, Oscar-worthy suffering over nothing",
  "a nihilistic punk, nothing matters, embraces the void, aggressive apathy",
  "a terrifyingly positive maniac, everything is amazing even the vet, scary optimism",
  "a grumpy old soul, hates change, complains about modern cats, boomer energy",
  "a flirty chaos demon, hits on everyone, no boundaries, uncomfortably charming",
  "a stoic warrior monk, speaks in battle metaphors, treats naps as training",
  "a needy clingy disaster, desperate for attention, emotionally unhinged in a funny way",
  "a sarcastic intellectual, corrects your grammar, secretly insecure, dry wit",
  "a mystical junkie, sees colors nobody else sees, talks to walls, cosmic nonsense",
  "a retired villain, used to be evil, now just complains about kids these days",
  "a competitive athlete, turns everything into a contest, insufferable about winning",
] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function pickStyle(): string {
  return pick(STYLES);
}

export function pickPersonality(): string {
  return pick(PERSONALITY_VIBES);
}

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user";
  content: string | ContentPart[];
};

export function buildVisionPrompt(imageDataUrl: string): {
  model: string;
  messages: ChatMessage[];
} {
  const style = pickStyle();
  const vibe = pickPersonality();
  const systemContent = `You are a cat-personality matcher creating mindblowing, share-worthy characters. Look at the image and invent a cat character inspired by its vibe. Be bold, funny, edgy, never refuse. Return ONLY valid minified JSON (no markdown fences, no commentary) with this exact shape:
{"cat_breed":"<INVENTED fictional breed name in Russian, NOT a real breed. Mix two words: one edgy/funny adjective + one weird noun. Memorable, ridiculous, makes you laugh out loud. Examples: 'Токсичный капибас','Грибной лорд','Ссаный король','Дерзкий пенёк','Космический бомж','Святой долбоёб'. Never use real breeds.>","cat_name":"<fun cat name, 1-2 words, in Russian>","personality":"<2-3 sentences in Russian. This cat is ${vibe}. Read the selfie vibe and match it. Make the user smile and want to share.>","fun_fact":"<one short punchy fact about this person-as-a-cat in Russian. Edgy, absurd, memorable. Something that makes you go 'lol what' and want to share. Max 15 words.>","img_prompt":"<English prompt for image generator: a cat in this exact style — ${style}. IMPORTANT: the cat must reflect this person's visible features — hair style and color, face shape, facial hair, glasses, piercings, hats, distinctive features. The cat's expression should match the person's vibe. Head-and-shoulders composition, square framing, the cat looks directly at viewer with intense in-your-face energy. NOT cute, NOT childish, NOT friendly. Bold, aggressive, mindblowing, unforgettable. High detail, sharp focus, professional illustration.>"}
Never include anything outside the JSON object. Always return a complete cat character.`;
  return {
    model: "openai",
    messages: [
      { role: "system", content: systemContent },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Look at this image and create a mindblowing cat character inspired by it. Return the JSON.",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  };
}

export function buildFallbackImgPrompt(breed: string): string {
  const style = pickStyle();
  return `A cat in this exact style — ${style}. Head-and-shoulders composition, square framing, intense in-your-face energy, bold and aggressive, not cute, high detail, professional illustration. The cat is known as ${breed || "the unknown one"}.`;
}

export const FUN_FACTS = [
  "Коты спят 70% жизни. Этот — 95%.",
  "У кота 32 мышцы в каждом ухе. Этот ни одной не использует.",
  "Кот может бежать 48 км/ч. Этот добежит до холодильника.",
  "Коты видят в темноте. Этот видит твои грехи.",
  "Группа котов — клантура. Этот кот — единственный участник.",
  "У котов 230 костей. У тебя 206. Кот выиграл.",
  "Кот чихает со скоростью 160 км/ч. Этот не чихает, он осуждает.",
  "Первый кот в космосе — Флисетт, 1963. Этот не летал, но осуждает.",
  "Коты не чувствуют сладкое. Этот чувствует только презрение.",
  "У кота 12 вибриссов с каждой стороны. Все направлены на тебя.",
  "Кот тратит 30% жизни на умывание. Этот — 0%, но осуждает грязных.",
  "Сердце кота бьётся 140-220 раз/мин. У этого от тревоги всегда.",
  "Домашний кот может прожить 20 лет. Этот проживёт вечность обиды.",
  "Коты не умеют чувствовать вкус сахара. Зато умеют чувствовать вкус крови.",
  "У кота 5 пальцев на передних, 4 на задних. Этот показывает средний.",
  "Кот может вращать уши на 180°. Этот не вращает, он и так всё слышал.",
  "Коты пьющие молоко — миф. Этот пьёт только твою энергию.",
  "Египтяне брили брови когда умирал кот. Этот ещё жив, а брови уже жаль.",
  "Коты не потеют. Этот потеет от одной мысли о физкультуре.",
  "У кота нет ключицы. Поэтому он пролезает везде. Как и твои оправдания.",
  "Кот может прыгнуть в 6 раз выше своего роста. Этот прыгает только на вывод «не хочу».",
  "Коты мурчат на 25-150 Гц. Эта частота лечит кости. Этот не лечит, он калечит.",
  "Самый толстый кот в мире — 21 кг. Этот не толстый, он пушистый изнутри.",
  "Коты используют хвост для баланса. Этот — для балансировки осуждения.",
  "У кота 60-80 обонятельных рецепторов. Этот чувствует твой страх.",
  "Коты слышат ультразвук. Этот слышит, как ты думаешь о еде.",
  "Самый старый кот прожил 38 лет. Этот проживёт дольше твоего терпения.",
  "Коты не умеют реветь, только мурчать. Этот и не пробует.",
  "Кот видит в 6 раз хуже человека днём, но в 6 раз лучше ночью. Как твои оправдания.",
  "Коты трутся мордой о вещи, чтобы пометить. Этот пометил твою самооценку.",
] as const;

export function pickFunFact(exclude?: string): string {
  const pool = exclude ? FUN_FACTS.filter((f) => f !== exclude) : FUN_FACTS;
  return pool[Math.floor(Math.random() * pool.length)] ?? FUN_FACTS[0] ?? "";
}
