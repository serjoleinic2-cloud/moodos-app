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
        let history = JSON.parse(localStorage.getItem("voice_history")) || [];
        history.push({
          type: 'voice_note',
          audio: reader.result,
          duration: duration,
          mood: getMood(),
          date: Date.now()
        });
        localStorage.setItem("voice_history", JSON.stringify(history));
        if (onFinish) onFinish(reader.result);
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