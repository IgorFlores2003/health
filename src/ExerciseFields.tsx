import { useState } from "react";
import { RiImageAddLine } from "react-icons/ri";
import { MAX_EXERCISE_PHOTOS } from "./domain";
export default function ExerciseFields() {
  const [manual, setManual] = useState(false);
  const [photos, setPhotos] = useState(0);
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="label">Tipo de exercício</span>
        <select name="type" className="input">
          {[
            "Caminhada",
            "Musculação",
            "Corrida",
            "Ciclismo",
            "Natação",
            "Yoga",
            "Pilates",
            "Dança",
            "Outro",
          ].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Como informar o gasto</span>
        <select
          className="input"
          value={manual ? "manual" : "estimate"}
          onChange={(e) => setManual(e.target.value === "manual")}
        >
          <option value="estimate">
            Estimar por tipo, duração e distância
          </option>
          <option value="manual">Já sei as calorias ativas</option>
        </select>
      </label>
      {manual && (
        <label className="block">
          <span className="label">Calorias ativas (kcal)</span>
          <input
            className="input"
            name="activeCalories"
            type="number"
            min="0"
            max="10000"
            step="1"
            required
            placeholder="Ex.: 250"
          />
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">
            Duração (min){manual ? " · opcional" : ""}
          </span>
          <input
            className="input"
            name="minutes"
            type="number"
            min="1"
            max="600"
            step="1"
            required={!manual}
            placeholder="30"
          />
        </label>
        <label className="block">
          <span className="label">Distância (km) · opcional</span>
          <input
            className="input"
            name="distanceKm"
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            placeholder="3,5"
          />
        </label>
      </div>
      <label className="block">
        <span className="label">Intensidade</span>
        <select name="intensity" className="input">
          <option>Leve</option>
          <option>Moderada</option>
          <option>Intensa</option>
        </select>
      </label>
      <div>
        <span className="label">Fotos · opcional</span>
        <label className="btn-secondary relative overflow-hidden">
          <RiImageAddLine size={18} />
          {photos
            ? `${photos} foto${photos > 1 ? "s" : ""} selecionada${photos > 1 ? "s" : ""}`
            : "Escolher fotos"}
          <input
            className="absolute inset-0 cursor-pointer opacity-0"
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setPhotos(e.target.files?.length || 0)}
          />
        </label>
        <p className="hint">
          Até {MAX_EXERCISE_PHOTOS} fotos, como o print do relógio ou do
          percurso.
        </p>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-500">
        {manual
          ? "Informe só as calorias ativas do treino, sem o total do dia e sem o repouso. Esse valor substitui a estimativa automática."
          : "A duração é obrigatória para estimar. Com a distância, ajustamos a velocidade em caminhada, corrida e ciclismo. Musculação, yoga e pilates usam valores aproximados. Para natação, dança ou outro tipo, informe as calorias ativas; sem elas, o registro fica pendente."}
      </p>
    </div>
  );
}
