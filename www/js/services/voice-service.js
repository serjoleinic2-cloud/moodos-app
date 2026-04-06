import { t } from "../i18n.js";

let mediaRecorder;
let chunks = [];

export async function startVoiceRecording(
  statusEl,
  onFinish
) {
  try {

    if (!navigator.mediaDevices) {
      statusEl.textContent = t("voice_unavailable");
      return;
    }

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    mediaRecorder = new MediaRecorder(stream);

    chunks = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {

      const blob =
        new Blob(chunks, { type: "audio/webm" });

      const reader = new FileReader();

      reader.onloadend = () => {

        let history =
          JSON.parse(
            localStorage.getItem("voice_history")
          ) || [];

        history.push({
          audio: reader.result,
          time: Date.now()
        });

        localStorage.setItem(
          "voice_history",
          JSON.stringify(history)
        );

        statusEl.textContent = t("voice_saved");
        onFinish();
      };

      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();

    statusEl.textContent = t("voice_recording");

    setTimeout(() => {
      mediaRecorder.stop();
    }, 10000);

  } catch (err) {
    console.error(err);
    statusEl.textContent = t("voice_failed");
  }
}