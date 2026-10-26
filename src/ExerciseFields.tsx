import { useState } from "react";
import { Camera } from "lucide-react";
import { MAX_EXERCISE_PHOTOS } from "./domain";
export default function ExerciseFields() {
  const [manual, setManual] = useState(false);
  const [photos, setPhotos] = useState(0);
  return (
    <>
      <label className="field">
        <span>Tipo de exercício</span>
        <select name="type">
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
      <label className="field">
        <span>Como informar o gasto?</span>
        <select
          value={manual ? "manual" : "estimate"}
          onChange={(e) => setManual(e.target.value === "manual")}
        >
          <option value="estimate">
            Estimar por tipo, duração e distância
          </option>
          <option value="manual">Já sei as calorias ativas do exercício</option>
        </select>
      </label>
      {manual && (
        <label className="field">
          <span>Calorias ativas deste exercício (kcal)</span>
          <input
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
      <div className="form-grid">
        <label className="field">
          <span>Duração (minutos){manual ? " · opcional" : ""}</span>
          <input
            name="minutes"
            type="number"
            min="1"
            max="600"
            step="1"
            required={!manual}
            placeholder="30"
          />
        </label>
        <label className="field">
          <span>Distância (km) · opcional</span>
          <input
            name="distanceKm"
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            placeholder="3,5"
          />
        </label>
      </div>
      <label className="field">
        <span>Intensidade percebida</span>
        <select name="intensity">
          <option>Leve</option>
          <option>Moderada</option>
          <option>Intensa</option>
        </select>
      </label>
      <div className="field">
        <span>Fotos do treino ou da corrida · opcional</span>
        <label className="secondary import-button photo-picker">
          <Camera size={17} />
          {photos
            ? `${photos} foto${photos > 1 ? "s" : ""} selecionada${photos > 1 ? "s" : ""}`
            : "Escolher fotos"}
          <input
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setPhotos(e.target.files?.length || 0)}
          />
        </label>
        <small className="field-hint">
          Até {MAX_EXERCISE_PHOTOS} fotos, como o print do relógio ou do
          percurso.
        </small>
      </div>
      <p className="form-note">
        {manual
          ? "Informe apenas as calorias ativas do treino, não o total diário nem calorias que incluem repouso. Esse valor substitui a estimativa automática."
          : "Precisamos da duração para estimar. Distância + duração ajustam a velocidade para caminhada, corrida e ciclismo. Musculação, yoga e pilates usam valores aproximados. Para natação, dança ou outro tipo, informe as calorias ativas; sem elas, o registro fica pendente."}
      </p>
    </>
  );
}
