"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Activity, Brain, Volume2, Waves, Zap, Heart, ShieldAlert, Eye } from "lucide-react";

const VOLUME_THRESHOLD = 0.15; // Only detect when volume > 15%

interface AudioFeatures {
  volume: number;
  pitch: number;
  tempo: number;
  spectralCentroid: number;
  pitchVariation: number;
}

interface MentalState {
  label: string;
  confidence: number;
  color: string;
  icon: React.ReactNode;
  description: string;
}

interface AnalysisResult {
  states: MentalState[];
  dominant: MentalState;
  mood: { label: string; score: number };
  depressionRisk: number; // 0-100
  mentalHealthIndex: number; // 0-100
  trustScore: number; // 0-100 (high = truthful)
  slynessScore: number; // 0-100
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
  crying: {
    label: "Crying",
    confidence: 0,
    color: "bg-sky-600",
    icon: <Waves className="h-5 w-5" />,
    description: "Pulsing volume, pitch breaks, high vocal tension",
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

function analyzeVoice(features: AudioFeatures, history: AudioFeatures[]): AnalysisResult {
  const { volume, pitch, tempo, spectralCentroid, pitchVariation } = features;

  // Normalize against running history
  const avgVolume = history.length > 0 ? history.reduce((s, h) => s + h.volume, 0) / history.length : volume;
  const avgPitch = history.length > 0 ? history.reduce((s, h) => s + h.pitch, 0) / history.length : pitch;
  const avgTempo = history.length > 0 ? history.reduce((s, h) => s + h.tempo, 0) / history.length : tempo;

  const volNorm = avgVolume > 0 ? volume / avgVolume : volume;
  const pitchNorm = avgPitch > 0 ? pitch / avgPitch : pitch;
  const tempoNorm = avgTempo > 0 ? tempo / avgTempo : tempo;

  // --- 1. Base mental states ---
  const scores: Record<string, number> = {
    calm: 0, anxious: 0, stressed: 0, sad: 0, angry: 0, excited: 0, crying: 0,
  };

  scores.calm = (1 - Math.abs(volNorm - 1)) * 2 + (1 - Math.abs(pitchNorm - 1)) * 2 + (1 - Math.abs(tempoNorm - 1)) * 2 - pitchVariation * 10;
  scores.anxious = Math.max(0, pitchNorm - 1) * 3 + Math.max(0, volNorm - 1) * 2 + Math.max(0, tempoNorm - 1) * 2;
  scores.stressed = Math.max(0, volNorm - 1.1) * 3 + pitchVariation * 8 + (spectralCentroid > 2000 ? 1 : 0);
  scores.sad = Math.max(0, 1 - pitchNorm) * 3 + Math.max(0, 1 - volNorm) * 3 + Math.max(0, 1 - tempoNorm) * 2;
  scores.angry = (volNorm > 1.3 ? volNorm * 3 : 0) + (pitchVariation > 0.15 ? 2 : 0) + (spectralCentroid < 1500 && volume > 0.1 ? 1.5 : 0);
  scores.excited = pitchVariation * 10 + Math.max(0, tempoNorm - 1) * 2 + Math.abs(volNorm - 1) * 2;

  const keys = Object.keys(scores);
  const probs = softmax(keys.map((k) => scores[k]));
  const states = keys.map((k, i) => ({ ...MENTAL_STATES[k], confidence: Math.round(probs[i] * 100) }));
  const dominant = states.reduce((a, b) => (a.confidence > b.confidence ? a : b));

  // --- 2. Mood score (composite weighted state) ---
  const moodPositive = (states.find((s) => s.label === "Calm")?.confidence || 0) + (states.find((s) => s.label === "Excited")?.confidence || 0);
  const moodNegative = (states.find((s) => s.label === "Sad")?.confidence || 0) + (states.find((s) => s.label === "Stressed")?.confidence || 0) + (states.find((s) => s.label === "Anxious")?.confidence || 0) + (states.find((s) => s.label === "Crying")?.confidence || 0) * 1.5;
  const moodScore = Math.max(0, Math.min(100, Math.round(50 + (moodPositive - moodNegative) * 0.5)));
  const moodLabel = moodScore > 70 ? "Positive" : moodScore > 40 ? "Neutral" : "Negative";

  // --- 3. Depression risk (sustained low energy) ---
  // Low pitch + low volume + slow tempo + very low variation = flat affect
  const recent = history.slice(-30);
  const avgRecentPitch = recent.length > 0 ? recent.reduce((s, h) => s + h.pitch, 0) / recent.length : pitch;
  const avgRecentVolume = recent.length > 0 ? recent.reduce((s, h) => s + h.volume, 0) / recent.length : volume;
  const avgRecentTempo = recent.length > 0 ? recent.reduce((s, h) => s + h.tempo, 0) / recent.length : tempo;
  const avgRecentVariation = recent.length > 0 ? recent.reduce((s, h) => s + h.pitchVariation, 0) / recent.length : pitchVariation;

  // Compute volume pulsation (sobbing indicator)
  const volumeVar = recent.length > 1
    ? Math.sqrt(recent.reduce((s, h) => s + Math.pow(h.volume - avgRecentVolume, 2), 0) / recent.length)
    : 0;

  // Crying: pulsing volume + pitch breaks + high spectral centroid + irregular tempo
  // Compute after recent/tempoIrregularity are available
  const tempoIrregularity = recent.length > 1
    ? Math.sqrt(recent.slice(1).reduce((s, h, i) => s + Math.pow(h.tempo - recent[i].tempo, 2), 0) / (recent.length - 1))
    : 0;

  scores.crying =
    (volume > 0.2 ? 1.5 : 0) +
    (volumeVar > 0.08 ? volumeVar * 20 : 0) +
    (pitchVariation > 0.06 ? pitchVariation * 25 : 0) +
    (spectralCentroid > 1800 ? 2 : 0) +
    (tempoIrregularity > 0.04 ? tempoIrregularity * 15 : 0);

  // Re-softmax with crying included
  const probsWithCry = softmax(keys.map((k) => scores[k]));
  const statesWithCry = keys.map((k, i) => ({ ...MENTAL_STATES[k], confidence: Math.round(probsWithCry[i] * 100) }));
  const dominantWithCry = statesWithCry.reduce((a, b) => (a.confidence > b.confidence ? a : b));

  const depressionRisk = Math.max(0, Math.min(100, Math.round(
    (avgRecentPitch < 120 ? 20 : 0) +
    (avgRecentVolume < 0.2 ? 20 : 0) +
    (avgRecentTempo < 0.3 ? 15 : 0) +
    (avgRecentVariation < 0.03 ? 25 : 0) +
    (statesWithCry.find((s) => s.label === "Sad")?.confidence || 0) * 0.2
  )));

  // --- 4. Mental health index (stability + energy) ---
  const stabilityScore = Math.max(0, 100 - pitchVariation * 300);
  const energyScore = Math.max(0, Math.min(100, (volume * 200) + (tempo * 100)));
  const mentalHealthIndex = Math.round((stabilityScore * 0.4 + energyScore * 0.3 + (100 - depressionRisk) * 0.3));

  // --- 5. Trust score (truthfulness) ---
  // Deception indicators: pitch spikes, tempo irregularity, volume inconsistency, micro-tremors
  const volumeSpikes = recent.length > 1
    ? recent.slice(1).filter((h, i) => Math.abs(h.volume - recent[i].volume) > 0.15).length / recent.length
    : 0;
  const pitchSpikes = recent.length > 1
    ? recent.slice(1).filter((h, i) => Math.abs(h.pitch - recent[i].pitch) > 30).length / recent.length
    : 0;

  const deceptionIndicators =
    (pitchSpikes > 0.15 ? 25 : pitchSpikes * 100) +
    (volumeSpikes > 0.15 ? 20 : volumeSpikes * 80) +
    (tempoIrregularity > 0.1 ? 20 : tempoIrregularity * 150) +
    (pitchVariation > 0.2 ? 20 : pitchVariation * 80);

  const trustScore = Math.max(0, Math.min(100, Math.round(100 - deceptionIndicators)));

  // --- 6. Slyness score ---
  // Controlled smoothness with occasional calculated spikes, low overall variation but strategic pauses
  const slynessScore = Math.max(0, Math.min(100, Math.round(
    (pitchVariation < 0.08 && pitchVariation > 0.02 ? 25 : 0) +
    (tempoIrregularity > 0.03 && tempoIrregularity < 0.12 ? 20 : 0) +
    (volume > 0.2 && volume < 0.6 ? 15 : 0) +
    (spectralCentroid > 1500 && spectralCentroid < 2800 ? 15 : 0) +
    (trustScore < 70 && trustScore > 35 ? 25 : 0)
  )));

  return {
    states: statesWithCry,
    dominant: dominantWithCry,
    mood: { label: moodLabel, score: moodScore },
    depressionRisk,
    mentalHealthIndex,
    trustScore,
    slynessScore,
  };
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
  const [mood, setMood] = useState<{ label: string; score: number } | null>(null);
  const [depressionRisk, setDepressionRisk] = useState<number>(0);
  const [mentalHealthIndex, setMentalHealthIndex] = useState<number>(0);
  const [trustScore, setTrustScore] = useState<number>(0);
  const [slynessScore, setSlynessScore] = useState<number>(0);
  const [belowThreshold, setBelowThreshold] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const historyRef = useRef<AudioFeatures[]>([]);
  const resultsBufferRef = useRef<AnalysisResult[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const SMOOTHING_FRAMES = 120; // ~2 seconds at 60fps

  function smoothResults(buffer: AnalysisResult[]): AnalysisResult {
    if (buffer.length === 0) {
      return {
        states: [],
        dominant: { ...MENTAL_STATES.calm, confidence: 0 },
        mood: { label: "Neutral", score: 50 },
        depressionRisk: 0,
        mentalHealthIndex: 0,
        trustScore: 0,
        slynessScore: 0,
      };
    }
    if (buffer.length === 1) return buffer[0];

    const n = buffer.length;

    // Average state confidences
    const stateKeys = Object.keys(MENTAL_STATES);
    const avgStates = stateKeys.map((key) => {
      const avgConf = buffer.reduce((s, r) => s + (r.states.find((st) => st.label === MENTAL_STATES[key].label)?.confidence || 0), 0) / n;
      return { ...MENTAL_STATES[key], confidence: Math.round(avgConf) };
    });

    const dominant = avgStates.reduce((a, b) => (a.confidence > b.confidence ? a : b));

    const avgMoodScore = buffer.reduce((s, r) => s + r.mood.score, 0) / n;
    const moodLabel = avgMoodScore > 70 ? "Positive" : avgMoodScore > 40 ? "Neutral" : "Negative";

    return {
      states: avgStates,
      dominant,
      mood: { label: moodLabel, score: Math.round(avgMoodScore) },
      depressionRisk: Math.round(buffer.reduce((s, r) => s + r.depressionRisk, 0) / n),
      mentalHealthIndex: Math.round(buffer.reduce((s, r) => s + r.mentalHealthIndex, 0) / n),
      trustScore: Math.round(buffer.reduce((s, r) => s + r.trustScore, 0) / n),
      slynessScore: Math.round(buffer.reduce((s, r) => s + r.slynessScore, 0) / n),
    };
  }

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
    setMood(null);
    setDepressionRisk(0);
    setMentalHealthIndex(0);
    setTrustScore(0);
    setSlynessScore(0);
    setBelowThreshold(false);
    historyRef.current = [];
    resultsBufferRef.current = [];
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

        const volume = Math.min(computeRMS(timeData) * 4, 1);
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

        // Draw waveform regardless of volume
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "rgb(15, 23, 42)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = volume > VOLUME_THRESHOLD ? "rgb(99, 102, 241)" : "rgb(148, 163, 184)";
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

        // Only run mental state analysis when volume is above threshold
        if (volume < VOLUME_THRESHOLD) {
          setBelowThreshold(true);
          rafRef.current = requestAnimationFrame(analyse);
          return;
        }
        setBelowThreshold(false);

        const history = historyRef.current;
        const result = analyzeVoice(current, history);

        // Buffer results for smoothing over ~2 seconds
        const buf = resultsBufferRef.current;
        buf.push(result);
        if (buf.length > SMOOTHING_FRAMES) buf.shift();
        resultsBufferRef.current = buf;

        const smoothed = smoothResults(buf);
        setStates(smoothed.states);
        setDominantState(smoothed.dominant);
        setMood(smoothed.mood);
        setDepressionRisk(smoothed.depressionRisk);
        setMentalHealthIndex(smoothed.mentalHealthIndex);
        setTrustScore(smoothed.trustScore);
        setSlynessScore(smoothed.slynessScore);

        history.push(current);
        if (history.length > 120) history.shift();
        historyRef.current = history;

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

      {isListening && belowThreshold && (
        <Card className="mb-6 border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
              <Volume2 className="h-5 w-5" />
              Speak Louder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Volume is too low for reliable detection ({Math.round(features.volume * 100)}%). Please speak closer to the microphone or raise your voice. Analysis pauses below 15% volume to avoid false readings from background noise.
            </p>
          </CardContent>
        </Card>
      )}

      {isListening && dominantState && !belowThreshold && (
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

      {isListening && !belowThreshold && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {/* Mood */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                Mood Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mood?.label || "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">Score: {mood?.score ?? 0}/100</div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${mood?.label === "Positive" ? "bg-emerald-500" : mood?.label === "Negative" ? "bg-rose-500" : "bg-amber-500"}`}
                  style={{ width: `${mood?.score ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Depression Risk */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-500" />
                Depression Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{depressionRisk}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {depressionRisk < 25 ? "Low risk" : depressionRisk < 50 ? "Moderate" : depressionRisk < 75 ? "Elevated" : "High risk — consult professional"}
              </div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${depressionRisk < 25 ? "bg-emerald-500" : depressionRisk < 50 ? "bg-amber-500" : depressionRisk < 75 ? "bg-orange-500" : "bg-red-500"}`}
                  style={{ width: `${depressionRisk}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mental Health Index */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-500" />
                Mental Health Index
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mentalHealthIndex}/100</div>
              <div className="text-xs text-muted-foreground mt-1">
                {mentalHealthIndex > 70 ? "Healthy" : mentalHealthIndex > 45 ? "Fair" : "Needs attention"}
              </div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${mentalHealthIndex > 70 ? "bg-emerald-500" : mentalHealthIndex > 45 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${mentalHealthIndex}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Trust Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-blue-500" />
                Trust / Truthfulness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trustScore}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {trustScore > 75 ? "Likely truthful" : trustScore > 50 ? "Uncertain" : trustScore > 25 ? "Some deception cues" : "Deception likely"}
              </div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${trustScore > 75 ? "bg-emerald-500" : trustScore > 50 ? "bg-amber-500" : trustScore > 25 ? "bg-orange-500" : "bg-red-500"}`}
                  style={{ width: `${trustScore}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Slyness */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-violet-500" />
                Slyness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slynessScore}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {slynessScore < 25 ? "Straightforward" : slynessScore < 50 ? "Somewhat guarded" : slynessScore < 75 ? "Calculating" : "Highly manipulative tone"}
              </div>
              <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${slynessScore < 25 ? "bg-emerald-500" : slynessScore < 50 ? "bg-amber-500" : slynessScore < 75 ? "bg-orange-500" : "bg-red-500"}`}
                  style={{ width: `${slynessScore}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* All States */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                All Mental States
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
                  className={`h-full rounded-full transition-all ${features.volume >= VOLUME_THRESHOLD ? "bg-primary" : "bg-amber-500"}`}
                  style={{ width: `${features.volume * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Threshold: {Math.round(VOLUME_THRESHOLD * 100)}%</div>
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
