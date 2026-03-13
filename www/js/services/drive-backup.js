import {
  getMoodHistory,
  getNotesHistory,
  getVoiceHistory,
  getSessionHistory,
  getPhotoHistory
} from "./memory.js";


function getWeekFileName() {

  const date = new Date();
  const year = date.getFullYear();

  const firstDay = new Date(year, 0, 1);
  const week = Math.ceil((((date - firstDay) / 86400000) + firstDay.getDay() + 1) / 7);

  return `week-${year}-${week}.json`;

}



export function createWeeklyBackup() {

  const data = {

    mood_history: getMoodHistory(),
    notes_history: getNotesHistory(),
    voice_history: getVoiceHistory(),
    session_history: getSessionHistory(),
    photo_history: getPhotoHistory(),

    exported_at: Date.now()

  };

  const json = JSON.stringify(data);

  const blob = new Blob([json], {
    type: "application/json"
  });

  return {
    fileName: getWeekFileName(),
    blob: blob
  };

}