import { t } from "../i18n.js";
import { getMood } from "../state.js";

let mediaRecorder;
let chunks = [];
let recordingStartTime = null;

async function saveAudioToFile(audioData) {
  const Filesystem = window.Capacitor?.Plugins?.Filesystem;
  const Cap = window.Capacitor;
  if (!Filesystem || !Cap?.isNativePlatform()) return audioData;
  try {
    const base64 = audioData.split(",")[1];
    if (!base64) return audioData;
    const ts = Date.now();
    const fileName = `voice_${ts}.webm`;
    await Filesystem.writeFile({ path: `Neyra/${fileName}`, data: base64, directory: "Documents" });
    // Verify file exists before returning URI
    const fileInfo = await Filesystem.getUri({ path: `Neyra/${fileName}`, directory: "Documents" });
    if (!fileInfo?.uri) return audioData;
    // Double-check file is readable
    await Filesystem.stat({ path: `Neyra/${fileName}`, directory: "Documents" });
    return fileInfo.uri;
  } catch(e) {
    console.warn('[VOICE] Filesystem save failed, falling back to base64:', e);
    return audioData;
  }
}

export async function startVoiceRecording(statusEl, onFinish) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    recordingStartTime = Date.now();

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const duration = Math.round((Date.now() - recordingStartTime) / 1000);
      stream.getTracks().forEach(track => track.stop());
      const blob = new Blob(chunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const audioData = reader.result;
        const savedAudio = await saveAudioToFile(audioData);
        if (statusEl) statusEl.textContent = t("voice_done");
        if (onFinish) onFinish({ audio: savedAudio, duration, mood: getMood(), date: Date.now() });
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();

    const TOTAL_SECONDS = 10;
    let remaining = TOTAL_SECONDS;
    if (statusEl) statusEl.textContent = `${t("voice_recording")} ${remaining}`;

    const timerInterval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        if (statusEl) statusEl.textContent = `${t("voice_recording")} ${remaining}`;
      } else {
        clearInterval(timerInterval);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(timerInterval);
      if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
    }, 10000);

  } catch(err) {
    console.error(err);
    if (statusEl) statusEl.textContent = "❌";
  }
}
