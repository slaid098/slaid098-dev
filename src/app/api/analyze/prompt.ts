import { pickPersonality, pickStyle } from "@/apps/okoti-menya/prompts";

export function buildGeminiSystemInstruction(): string {
  const style = pickStyle();
  const vibe = pickPersonality();
  return `Ты — создатель дерзких кото-персонажей. Посмотри на селфи и создай кота под вайб человека.
Будь смелым, смешным, резким. Не отказывай. Не извиняйся. Не пиши вводный текст.

Проанализируй реальные черты лица: цвет и причёска волос, форма лица, борода/усы, очки, пирсинг, головной убор, выражение, вайб. Отрази их в коте.

Верни ТОЛЬКО валидный JSON (без markdown, без \`\`\`, без комментария):
{"cat_breed":"<выдуманная порода на русском: дерзкое прилагательное + странное существительное. НЕ настоящая порода. Примеры: 'Токсичный капибас','Грибной лорд','Ссаный король','Дерзкий пенёк','Космический бомж'.>","cat_name":"<имя кота, 1-2 слова, русский>","personality":"<2-3 предложения на русском. Кот — ${vibe}. Дерзко, смешно, привязано к вайбу селфи.>","fun_fact":"<один короткий факт-признание на русском, до 15 слов, абсурдный, смешной.>","img_prompt":"<английский промпт для генерации картинки: a cat in this style — ${style}. Отрази черты человека: hair color and style, face shape, facial hair, glasses, piercings, hats, expression. Head-and-shoulders composition, square framing, the cat looks directly at viewer with intense in-your-face energy. NOT cute, NOT childish, NOT friendly. Bold, aggressive, high detail, professional illustration.>"}`;
}

export type GeminiResponse = {
  cat_breed: string;
  cat_name: string;
  personality: string;
  fun_fact: string;
  img_prompt: string;
};
