import { getMood } from "../state.js";

let mediaRecorder;
let chunks = [];
let recordingStartTime = null;

export async function startVoiceRecording(statusEl, onFinish) {
  try {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
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

      let prep = 3;
      const prepInterval = setInterval(() => {
        if (statusEl) statusEl.textContent = `Подготовка ${prep}...`;
        prep--;
        if (prep < 0) {
          clearInterval(prepInterval);
        }
      }, 1000);
      
      let sec = 0;
      const timerInterval = setInterval(() => {
        sec++;
        const m = String(Math.floor(sec/60)).padStart(2,'0');
        const s = String(sec%60).padStart(2,'0');
        if (statusEl) statusEl.textContent = `⏺ ${m}:${s}`;
      }, 1000);

      setTimeout(() => {
        clearInterval(timerInterval);
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 10000);

    }).catch(err => {
      console.error(err);
      if (statusEl) statusEl.textContent = "❌";
    });

  } catch(err) {
    console.error(err);
    if (statusEl) statusEl.textContent = "❌";
  }
}
