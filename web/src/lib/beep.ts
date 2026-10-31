export function playChime(context: AudioContext, long = false): void {
  const notes = long ? [880, 1174, 880, 1174, 988, 1318, 880] : [880, 1174, 880, 1174];
  const step = long ? 0.42 : 0.28;
  const peak = long ? 0.28 : 0.2;
  const start = context.currentTime;
  notes.forEach((frequency, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const at = start + index * step;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + step * 0.8);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(at);
    osc.stop(at + step * 0.85);
  });
}
