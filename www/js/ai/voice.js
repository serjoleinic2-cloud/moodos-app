import { getMood } from "../state.js";

let mediaRecorder;
let chunks = [];
let recordingStartTime = null;

export async function startVoiceRecording(statusEl, onFinish) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    recordingStartTime = Date.now();

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const duration = Math.round((Date.now() - recordingStartTime) / 1000);
      stream.getTracks().forEach(track => track.stop());
      const blob   = new Blob(chunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        const audioData = reader.result;
        if (onFinish) {
          onFinish({ audio: audioData, duration, mood: getMood(), date: Date.now() });
        }
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();

    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }, 10000);

  } catch(err) {
    console.error(err);
    if (statusEl) statusEl.textContent = "❌";
  }
}