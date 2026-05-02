"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Loader2,
  Frown,
  Smile,
  Angry,
  Zap,
  Meh,
  AlertTriangle,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

const emotionIcons: Record<string, React.ReactNode> = {
  happy: <Smile className="h-4 w-4" />,
  sad: <Frown className="h-4 w-4" />,
  angry: <Angry className="h-4 w-4" />,
  surprised: <Zap className="h-4 w-4" />,
  neutral: <Meh className="h-4 w-4" />,
  fearful: <AlertTriangle className="h-4 w-4" />,
  disgusted: <ThumbsDown className="h-4 w-4" />,
};

const emotionColors: Record<string, string> = {
  happy: "bg-green-500",
  sad: "bg-blue-500",
  angry: "bg-red-500",
  surprised: "bg-yellow-500",
  neutral: "bg-gray-500",
  fearful: "bg-purple-500",
  disgusted: "bg-orange-500",
};

export default function EmotionDetectorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceapiRef = useRef<any>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [expressions, setExpressions] = useState<Record<string, number>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import("face-api.js");
        faceapiRef.current = faceapi;
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setIsModelLoaded(true);
      } catch (err) {
        setError("Failed to load AI models. Please check your internet connection.");
      }
    };
    loadModels();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
      setError(null);
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions in your browser.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsCameraOn(false);
    setDetectedEmotion(null);
    setConfidence(0);
    setExpressions({});
  }, []);

  // Detection loop
  useEffect(() => {
    if (!isCameraOn || !isModelLoaded) return;

    const detect = async () => {
      const faceapi = faceapiRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!faceapi || !video || !canvas) return;

      // Sync canvas size to video display size
      const rect = video.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceExpressions();

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scale factors (video intrinsic -> canvas display)
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      let dominantEmotion: string | null = null;
      let maxConfidence = 0;
      const allExpressions: Record<string, number> = {};

      detections.forEach((detection: any) => {
        const box = detection.detection.box;
        const expressions = detection.expressions as Record<string, number>;

        // Scale box to canvas
        const x = box.x * scaleX;
        const y = box.y * scaleY;
        const w = box.width * scaleX;
        const h = box.height * scaleY;

        // Find dominant emotion
        let maxExpr = "";
        let maxVal = 0;
        for (const [expr, val] of Object.entries(expressions)) {
          if (val > maxVal) {
            maxVal = val;
            maxExpr = expr;
          }
          // Aggregate expressions across faces
          allExpressions[expr] = (allExpressions[expr] || 0) + val;
        }

        if (maxVal > maxConfidence) {
          maxConfidence = maxVal;
          dominantEmotion = maxExpr;
        }

        // Draw green box
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Draw label
        const label = `${maxExpr} ${(maxVal * 100).toFixed(0)}%`;
        ctx.font = "bold 14px sans-serif";
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(x, y - 22, textWidth + 10, 22);
        ctx.fillStyle = "#000";
        ctx.fillText(label, x + 5, y - 6);
      });

      setDetectedEmotion(dominantEmotion);
      setConfidence(maxConfidence);
      if (dominantEmotion) {
        setExpressions(allExpressions);
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    // Wait for video to be ready
    const video = videoRef.current;
    if (video && video.readyState >= 2) {
      detect();
    } else if (video) {
      video.onloadeddata = () => detect();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isCameraOn, isModelLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const emotionList = ["happy", "sad", "angry", "surprised", "neutral", "fearful", "disgusted"];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-8">
          <Badge variant="secondary" className="mb-3">BCA Thesis Project</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Real-Time Emotion Detector
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Facial emotion recognition using deep learning. Detects happiness, sadness, anger, surprise, and more in real time through your webcam.
          </p>
        </div>
      </motion.div>

      <Card className="border-2 border-primary/10">
        <CardContent className="p-6 space-y-6">
          {!isModelLoaded ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <p className="text-muted-foreground">Loading AI models...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-3">
                  {!isCameraOn ? (
                    <Button onClick={startCamera} className="gap-2">
                      <Camera className="h-4 w-4" />
                      Start Camera
                    </Button>
                  ) : (
                    <Button onClick={stopCamera} variant="destructive" className="gap-2">
                      <CameraOff className="h-4 w-4" />
                      Stop Camera
                    </Button>
                  )}
                </div>
                {detectedEmotion && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-sm px-3 py-1 capitalize border-current ${
                        detectedEmotion === "happy"
                          ? "text-green-600 border-green-600"
                          : detectedEmotion === "angry"
                          ? "text-red-600 border-red-600"
                          : detectedEmotion === "sad"
                          ? "text-blue-600 border-blue-600"
                          : detectedEmotion === "surprised"
                          ? "text-yellow-600 border-yellow-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {emotionIcons[detectedEmotion]}
                      <span className="ml-1 capitalize">{detectedEmotion}</span>
                      <span className="ml-1">({(confidence * 100).toFixed(0)}%)</span>
                    </Badge>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                  {error}
                </div>
              )}

              <div className="relative rounded-lg overflow-hidden bg-black border aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                {!isCameraOn && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-2">
                    <Camera className="h-10 w-10" />
                    <p>Camera is off. Click "Start Camera" to begin.</p>
                  </div>
                )}
              </div>

              {/* Emotion bars */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Expression Probabilities</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {emotionList.map((emotion) => {
                    const val = expressions[emotion] || 0;
                    const isActive = detectedEmotion === emotion;
                    return (
                      <div key={emotion} className="flex items-center gap-2">
                        <div className="w-5 flex justify-center">{emotionIcons[emotion]}</div>
                        <span className={`text-xs w-20 capitalize ${isActive ? "font-semibold" : ""}`}>
                          {emotion}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isActive ? emotionColors[emotion] || "bg-primary" : "bg-muted-foreground/30"
                            }`}
                            style={{ width: `${Math.min(val * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {(val * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Project Info */}
      <section className="mt-12 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">About This Project</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Architecture</h3>
              <p className="text-sm text-muted-foreground">
                Uses TinyFaceDetector (a lightweight CNN) for real-time face detection
                and a deep neural network trained on the FER-2013 dataset for expression
                classification into 7 emotion categories.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Hardware Used (Original)</h3>
              <p className="text-sm text-muted-foreground">
                Raspberry Pi 3B+, USB webcam, Bluetooth microphone, HDMI display.
                The original BCA thesis demo ran on embedded hardware with voice command
                activation using Google Text-to-Speech.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Tech Stack</h3>
              <p className="text-sm text-muted-foreground">
                Python, OpenCV (Haar Cascades), TensorFlow (MobileNet), Tkinter GUI,
                gTTS for voice commands. This web demo uses face-api.js with
                TensorFlow.js for browser-native inference.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Privacy Note</h3>
              <p className="text-sm text-muted-foreground">
                All processing happens locally in your browser. No video or image data
                is sent to any server. The camera feed never leaves your device.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
