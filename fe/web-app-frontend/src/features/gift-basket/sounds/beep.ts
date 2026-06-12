let _unlocked = false;

export function unlockAudio() {
    if (_unlocked) return;
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0;
    audio.play().then(() => { _unlocked = true; audio.pause(); }).catch(() => { });
}

export function playBeep() {
    const ctx = new AudioContext();
    const audio = new Audio('/sounds/notification.mp3');
    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.value = 5;
    source.connect(gain);
    gain.connect(ctx.destination);
    audio.play().catch(() => { });
}