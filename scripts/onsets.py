#!/usr/bin/env python3
"""Spectral-flux onsets of a wav and how many video cuts land within +-1 frame of an onset.
usage: python3 -I onsets.py <wav> <cuts.json>"""
import json, sys, wave
import numpy as np
w = wave.open(sys.argv[1]); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
hop, n = 256, 1024
frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
S = np.abs(np.fft.rfft(frames, axis=1))
flux = np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(1)
flux = (flux - np.median(flux)) / (flux.std() + 1e-9)
t = (np.arange(len(flux)) + 1) * hop / sr
peaks = [t[i] for i in range(1, len(flux) - 1) if flux[i] > 1.5 and flux[i] >= flux[i-1] and flux[i] >= flux[i+1]]
on = []
for p in peaks:
    if not on or p - on[-1] > 0.03: on.append(p)
cuts = [s["start"] for s in json.load(open(sys.argv[2]))["shots"][1:]]
hit = sum(any(abs(c - o) <= 1/30 + 0.01 for o in on) for c in cuts)
print(f"onsets={len(on)} cuts={len(cuts)} cuts_on_onset={hit} ({hit/len(cuts):.0%})")
# dominant pitch per 0.5s window
for a in np.arange(0, len(x)/sr, 1.0):
    seg = x[int(a*sr):int((a+1.0)*sr)]
    if len(seg) < 2048: break
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); f = np.fft.rfftfreq(len(seg), 1/sr)
    m = (f > 60) & (f < 2000); top = f[m][np.argsort(sp[m])[-3:]][::-1]
    rms = 20*np.log10(np.sqrt((seg**2).mean()) + 1e-9)
    print(f"{a:5.1f}s rms={rms:6.1f}dB peaks_hz={[round(v) for v in top]}")
