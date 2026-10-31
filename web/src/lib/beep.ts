export function playChime(context: AudioContext): void {
  const start = context.currentTime;
  for (let i = 0; i < 4; i++) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = i % 2 === 0 ? 880 : 1174;
    const at = start + i * 0.28;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(at);
    osc.stop(at + 0.24);
  }
}
