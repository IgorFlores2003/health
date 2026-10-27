/**
 * Sons do app tocados com Web Audio (sem arquivos). Os navegadores só
 * liberam o som depois de um toque na tela: sem isso, `play` devolve false.
 */
export async function playNotes(notes: [number, number][], beat: number) {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return false;
  const ctx = new AC();
  await ctx.resume().catch(() => undefined);
  if (ctx.state !== "running") {
    void ctx.close();
    return false;
  }
  let t = ctx.currentTime + 0.05;
  for (const [freq, beats] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const len = beats * beat;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.95);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + len);
    t += len;
  }
  setTimeout(() => void ctx.close(), (t - ctx.currentTime + 0.5) * 1000);
  return true;
}

/** "Plim" de desafio concluído: arpejo curto subindo. */
export const playSuccess = () =>
  playNotes(
    [
      [784, 1],
      [988, 1],
      [1319, 2],
    ],
    0.09,
  );
