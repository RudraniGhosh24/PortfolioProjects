"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Activity, Brain, Volume2, Waves, Zap } from "lucide-react";

interface AudioFeatures {
  volume: number;        // 0-1 RMS amplitude
  pitch: number;         // Fundamental frequency in Hz
  tempo: number;         // Speech rate proxy (zero-crossing rate normalized)
  spectralCentroid: number; // Brightness of voice
  pitchVariation: number; // Standard deviation of pitch
}

interface MentalState {
  label: string;
  confidence: number;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const MENTAL_STATES: Record<string, MentalState> = {
  calm: {
    label: "Calm",
    confidence: 0,
    color: "bg-emerald-500",
    icon: <Waves className="h-5 w-5" />,
    description: "Steady voice, moderate volume, stable pitch",
  },
  anxious: {
    label: "Anxious",
    confidence: 0,
    color: "bg-amber-500",
    icon: <Activity className="h-5 w-5" />,
    description: "Elevated pitch, faster speech, elevated volume",
  },
  stressed: {
    label: "Stressed",
    confidence: 0,
    color: "bg-orange-500",
    icon: <Zap className="h-5 w-5" />,
    description: "High volume, irregular rhythm, pitch spikes",
  },
  sad: {
    label: "Sad",
    confidence: 0,
    color: "bg-slate-500",
    icon: <Waves className="h-5 w-5" />,
    description: "Low pitch, reduced volume, slower tempo",
  },
  angry: {
    label: "Angry",
    confidence: 0,
    color: "bg-red-500",
    icon: <Zap className="h-5 w-5" />,
    description: "High volume, rough timbre, irregular pattern",
  },
  excited: {
    label: "Excited",
    confidence: 0,
    color: "bg-violet-500",
    icon: <Brain className="h-5 w-5" />,
    description: "High pitch variation, fast tempo, variable volume",
  },
};

function computeRMS(timeData: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < timeData.length; i++) {
    sum += timeData[i] * timeData[i];
  }
  return Math.sqrt(sum / timeData.length);
}

function computeZCR(timeData: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < timeData.length; i++) {
    if ((timeData[i] >= 0) !== (timeData[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / timeData.length;
}

function computePitchAutocorrelation(timeData: Float32Array, sampleRate: number): number {
  const threshold = 0.2;
  const minPeriod = Math.floor(sampleRate / 500); // max 500 Hz
  const maxPeriod = Math.floor(sampleRate / 50);  // min 50 Hz

  let bestPeriod = 0;
  let bestCorrelation = -1;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    let norm = 0;
    for (let i = 0; i < timeData.length - period; i++) {
      correlation += timeData[i] * timeData[i + period];
      norm += timeData[i] * timeData[i] + timeData[i + period] * timeData[i + period];
    }
    const normalized = (2 * correlation) / (norm + 1e-10);
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      bestPeriod = period;
    }
  }

  if (bestCorrelation < threshold) return 0;
  return sampleRate / bestPeriod;
}

function computeSpectralCentroid(freqData: Uint8Array, sampleRate: number): number {
  let numerator = 0;
  let denominator = 0;
  const binSize = sampleRate / 2 / freqData.length;
  for (let i = 0; i < freqData.length; i++) {
    const freq = i * binSize;
    const magnitude = freqData[i];
    numerator += freq * magnitude;
    denominator += magnitude;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function inferMentalState(features: AudioFeatures, history: AudioFeatures[]): MentalState[] {
  const { volume, pitch, tempo, spectralCentroid, pitchVariation } = features;

  // Normalize features against running history for relative judgement
  const avgVolume = history.length > 0 ? history.reduce((s, h) => s + h.volume, 0) / history.length : volume;
  const avgPitch = history.length > 0 ? history.reduce((s, h) => s + h.pitch, 0) / history.length : pitch;
  const avgTempo = history.length > 0 ? history.reduce((s, h) => s + h.tempo, 0) / history.length : tempo;

  const volNorm = avgVolume > 0 ? volume / avgVolume : volume;
  const pitchNorm = avgPitch > 0 ? pitch / avgPitch : pitch;
  const tempoNorm = avgTempo > 0 ? tempo / avgTempo : tempo;

  // Scores for each state (higher = more likely)
  const scores: Record<string, number> = {
    calm: 0,
    anxious: 0,
    stressed: 0,
    sad: 0,
    angry: 0,
    excited: 0,
  };

  // Calm: moderate everything, low variation
  scores.calm =
    (1 - Math.abs(volNorm - 1)) * 2 +
    (1 - Math.abs(pitchNorm - 1)) * 2 +
    (1 - Math.abs(tempoNorm - 1)) * 2 -
    pitchVariation * 10;

  // Anxious: high pitch, elevated volume, fast tempo
  scores.anxious =
    Math.max(0, pitchNorm - 1) * 3 +
    Math.max(0, volNorm - 1) * 2 +
    Math.max(0, tempoNorm - 1) * 2;

  // Stressed: high volume, irregular, high spectral centroid
  scores.stressed =
    Math.max(0, volNorm - 1.1) * 3 +
    pitchVariation * 8 +
    (spectralCentroid > 2000 ? 1 : 0);

  // Sad: low pitch, low volume, slow tempo
  scores.sad =
    Math.max(0, 1 - pitchNorm) * 3 +
    Math.max(0, 1 - volNorm) * 3 +
    Math.max(0, 1 - tempoNorm) * 2;

  // Angry: very high volume, rough (low spectral centroid relative to pitch)
  scores.angry =
    (volNorm > 1.3 ? volNorm * 3 : 0) +
    (pitchVariation > 0.15 ? 2 : 0) +
    (spectralCentroid < 1500 && volume > 0.1 ? 1.5 : 0);

  // Excited: high variation, fast tempo, variable volume
  scores.excited =
    pitchVariation * 10 +
    Math.max(0, tempoNorm - 1) * 2 +
    Math.abs(volNorm - 1) * 2;

  const keys = Object.keys(scores);
  const vals = keys.map((k) => scores[k]);
  const probs = softmax(vals);

  return keys.map((k, i) => ({
    ...MENTAL_STATES[k],
    confidence: Math.round(probs[i] * 100),
  }));
}

export default function MentalStateDetectorPage() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string>("");
  const [features, setFeatures] = useState<AudioFeatures>({
    volume: 0,
    pitch: 0,
    tempo: 0,
    spectralCentroid: 0,
    pitchVariation: 0,
  });
  const [states, setStates] = useState<MentalState[]>([]);
  const [dominantState, setDominantState] = useState<MentalState | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const historyRef = useRef<AudioFeatures[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopListening = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setIsListening(false);
    setDominantState(null);
    historyRef.current = [];
  }, []);

  const startListening = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      historyRef.current = [];

      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const pitchHistory: number[] = [];

      const analyse = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(timeData);
        analyserRef.current.getByteFrequencyData(freqData);

        const volume = Math.min(computeRMS(timeData) * 4, 1); // scale up for visibility
        const pitch = computePitchAutocorrelation(timeData, audioContext.sampleRate);
        const tempo = Math.min(computeZCR(timeData) * 2, 1);
        const spectralCentroid = computeSpectralCentroid(freqData, audioContext.sampleRate);

        if (pitch > 0) pitchHistory.push(pitch);
        if (pitchHistory.length > 60) pitchHistory.shift();

        const pitchVariation = pitchHistory.length > 1
          ? Math.sqrt(
              pitchHistory.reduce((s, p) => s + Math.pow(p - pitchHistory.reduce((a, b) => a + b) / pitchHistory.length, 2), 0) /
              pitchHistory.length
            ) / (pitchHistory.reduce((a, b) => a + b) / pitchHistory.length || 1)
          : 0;

        const current: AudioFeatures = {
          volume,
          pitch: Math.round(pitch),
          tempo: Math.round(tempo * 100) / 100,
          spectralCentroid: Math.round(spectralCentroid),
          pitchVariation: Math.round(pitchVariation * 100) / 100,
        };

        setFeatures(current);

        const history = historyRef.current;
        const states = inferMentalState(current, history);
        setStates(states);
        const dominant = states.reduce((a, b) => (a.confidence > b.confidence ? a : b));
        setDominantState(dominant);

        history.push(current);
        if (history.length > 120) history.shift();
        historyRef.current = history;

        // Draw waveform
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "rgb(15, 23, 42)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = dominant.confidence > 30 ? "rgb(99, 102, 241)" : "rgb(148, 163, 184)";
            ctx.beginPath();
            const sliceWidth = canvas.width / timeData.length;
            let x = 0;
            for (let i = 0; i < timeData.length; i++) {
              const v = timeData[i] * 0.8;
              const y = (canvas.height / 2) + v * (canvas.height / 2);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
              x += sliceWidth;
            }
            ctx.stroke();
          }
        }

        rafRef.current = requestAnimationFrame(analyse);
      };

      rafRef.current = requestAnimationFrame(analyse);
    } catch (err: any) {
      setError(err.message || "Could not access microphone. Please allow microphone permissions.");
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Mental State Detector</h1>
        <p className="text-muted-foreground mt-1">
          Real-time voice analysis to infer emotional and mental states from pitch, volume, tempo, and timbre.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              variant={isListening ? "destructive" : "default"}
              className="gap-2"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isListening ? "Stop Analysis" : "Start Voice Analysis"}
            </Button>
            {isListening && (
              <Badge variant="secondary" className="animate-pulse">
                Listening...
              </Badge>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={160}
              className="w-full rounded-lg border bg-slate-950"
            />
            {!isListening && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Waveform will appear here when you start speaking
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isListening && dominantState && (
        <Card className={`mb-6 border-2 ${dominantState.confidence > 40 ? "border-primary/50" : ""}`}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {dominantState.icon}
              Detected State: {dominantState.label}
              <Badge className={dominantState.color}>{dominantState.confidence}% confidence</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{dominantState.description}</p>
          </CardContent>
        </Card>
      )}

      {isListening && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Volume (RMS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(features.volume * 100)}%</div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${features.volume * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Waves className="h-4 w-4" />
                Pitch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{features.pitch > 0 ? `${features.pitch} Hz` : "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {features.pitch > 0
                  ? features.pitch < 150
                    ? "Low (male-range)"
                    : features.pitch < 250
                      ? "Mid (female-range)"
                      : "High"
                  : "No voiced signal detected"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Speech Rate (ZCR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(features.tempo * 100)}%</div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${features.tempo * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Spectral Centroid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{features.spectralCentroid} Hz</div>
              <div className="text-xs text-muted-foreground mt-1">
                {features.spectralCentroid > 2000 ? "Bright / Sharp" : features.spectralCentroid > 1000 ? "Balanced" : "Dark / Warm"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Pitch Variation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{features.pitchVariation}</div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.min(features.pitchVariation * 200, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                All States
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {states
                .sort((a, b) => b.confidence - a.confidence)
                .map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-sm flex-1">{s.label}</span>
                    <span className="text-sm font-medium">{s.confidence}%</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Click Start and allow microphone access.</p>
            <p>2. Speak naturally — the tool analyzes your voice in real time.</p>
            <p>3. Pitch is detected via autocorrelation; volume via RMS amplitude.</p>
            <p>4. Spectral centroid measures voice brightness; ZCR approximates speech rate.</p>
            <p>5. A softmax classifier maps these features to six mental states.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This is a research demonstration using heuristics on acoustic features. It is not a
              clinical diagnostic tool. For mental health concerns, please consult a qualified
              professional.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
