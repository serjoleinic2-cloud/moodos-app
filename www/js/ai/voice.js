import { getMood } from "../state.js";

const Filesystem = window.Capacitor?.Plugins?.Filesystem;
const Capacitor = window.Capacitor;

let mediaRecorder;
let chunks = [];
let recordingStartTime = null;

async function saveAudioToFile(audioData) {
  if (!Filesystem || !Capacitor?.isNativePlatform()) {
    return audioData;
  }
  
  try {
    const base64 = audioData.split(",")[1];
    if (!base64) return audioData;
    
    const ts = Date.now();
    const fileName = `voice_${ts}.webm`;
    const dir = "Documents";
    
    await Filesystem.writeFile({
      path: `Neyra/${fileName}`,
      data: base64,
      directory: dir
    });
    
    const fileInfo = await Filesystem.getUri({
      path: `Neyra/${fileName}`,
      directory: dir
    });
    
    return fileInfo.uri || audioData;
  } catch(e) {
    console.warn('[VOICE] Filesystem save failed:', e);
    return audioData;
  }
}

export async function startVoiceRecording(statusEl, onFinish) {
  try {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];
      recordingStartTime = Date.now();

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const duration = Math.round((Date.now() - recordingStartTime) / 1000);
        stream.getTracks().forEach(track => track.stop());
        const blob   = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const audioData = reader.result;
          
          let savedAudio = audioData;
          if (Filesystem && Capacitor?.isNativePlatform()) {
            savedAudio = await saveAudioToFile(audioData);
          }
          
          if (onFinish) {
            onFinish({ audio: savedAudio, duration, mood: getMood(), date: Date.now() });
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
