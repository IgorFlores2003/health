import type { IconType } from "react-icons";
import {
  RiBoxingFill,
  RiCheckboxCircleFill,
  RiDropFill,
  RiEmotionHappyFill,
  RiEmotionLaughFill,
  RiFireFill,
  RiFlashlightFill,
  RiHeart3Fill,
  RiRocket2Fill,
  RiSparklingFill,
  RiStarFill,
  RiThumbUpFill,
  RiTrophyFill,
} from "react-icons/ri";

/**
 * Reações dos comentários: ícones do app no lugar de emoji. As chaves são as
 * mesmas aceitas pelo banco (migração …_comment_media.sql).
 */
export const STICKERS: Record<string, [IconType, string, string]> = {
  heart: [RiHeart3Fill, "Coração", "text-rose-500"],
  fire: [RiFireFill, "Fogo", "text-orange-500"],
  thumbs: [RiThumbUpFill, "Joinha", "text-blue-500"],
  trophy: [RiTrophyFill, "Troféu", "text-amber-500"],
  strong: [RiBoxingFill, "Força", "text-red-600"],
  star: [RiStarFill, "Estrela", "text-yellow-500"],
  flash: [RiFlashlightFill, "Energia", "text-yellow-600"],
  water: [RiDropFill, "Água", "text-sky-500"],
  rocket: [RiRocket2Fill, "Foguete", "text-indigo-500"],
  party: [RiSparklingFill, "Festa", "text-fuchsia-500"],
  happy: [RiEmotionHappyFill, "Feliz", "text-amber-500"],
  laugh: [RiEmotionLaughFill, "Risada", "text-amber-500"],
  check: [RiCheckboxCircleFill, "Feito", "text-emerald-500"],
};
