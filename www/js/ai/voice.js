let mediaRecorder;
let chunks = [];

export async function startVoiceRecording(
  statusEl,
  onFinish
) {
  try {

    statusEl.textContent = "Requesting mic...";

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    mediaRecorder =
      new MediaRecorder(stream);

    chunks = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {

      const blob =
        new Blob(chunks, {
          type: "audio/webm"
        });

      const reader =
        new FileReader();

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

        statusEl.textContent = "Saved";

        if (onFinish) onFinish(reader.result);
      };

      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();

    statusEl.textContent = "Recording...";

    setTimeout(() => {
      mediaRecorder.stop();
    }, 10000);

  } catch (err) {
    console.error(err);
    statusEl.textContent =
      "Microphone denied";
  }
}