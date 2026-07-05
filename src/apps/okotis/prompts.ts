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

export function buildFallbackImgPrompt(breed: string): string {
  const style = pickStyle();
  return `A cat in this exact style — ${style}. Head-and-shoulders composition, square framing, intense in-your-face energy, bold and aggressive, not cute, high detail, professional illustration. The cat is known as ${breed || "the unknown one"}.`;
}

export const LOADING_MESSAGES = [
  // Loading-статусы (10)
  "Загружаю порцию презрения…",
  "Калибрую усы под твой вайб…",
  "Подбираю породу. Это сложно. Ты не лёгкий случай.",
  "Загружаю 9 жизней… 7 загружено.",
  "Натягиваю хвост на нужный угол…",
  "Замешиваю тесто для характера…",
  "Кот делает выводы. Спойлер: не в твою пользу.",
  "Конвертирую твой вайб в породу…",
  "Загружаю корм… премиум-сегмент, естественно.",
  "Просыпаю кота. Он не в духе.",
  // Абсурд-факты (10)
  "Коты не спят. Они загружаются.",
  "У кота 32 мышцы в ухе. Все — для игнорирования тебя.",
  "Один кот пролежал 16 часов. Диван подал в суд.",
  "Кот смотрит на тебя 3 минуты. Ты заметил только сейчас.",
  "Кот пьёт воду из-под крана. Из миски — принципиально нет.",
  "Кот знает где лежит рыба. Рыба ещё не в курсе.",
  "Кот притащил мышь. Кот сам в шоке от подвига.",
  "Кот залез в коробку. Коробка мала. Кот не согласен.",
  "Кот чихнул со скоростью 160 км/ч. Соседи не согласны.",
  "У кота 230 костей. У тебя 206. Кот выиграл.",
  // Признания (10)
  "Спрашиваю кота про твой вайб… он отвернулся.",
  "Кот уже решил, что ты бесишь. Загружаю подтверждение…",
  "Генерирую характер… получился сложный. Как и ты.",
  "Кот посмотрел на фото. Оценил. Молча.",
  "Кот пытается понять твой вайб. У него не получается.",
  "Кот говорит, что ты нормальный. Ему можно верить?",
  "Спорю с котом про твой характер. Я проигрываю.",
  "Кот настаивает на другой породе. Я сдаюсь.",
  "Кот требует переснять селфи. С другом.",
  "Кот предлагает добавить лапки. Я скромно молчу.",
] as const;

export function pickLoadingMessage(exclude?: string): string {
  const pool = exclude ? LOADING_MESSAGES.filter((f) => f !== exclude) : LOADING_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)] ?? LOADING_MESSAGES[0] ?? "";
}
