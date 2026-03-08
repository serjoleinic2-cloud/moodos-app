import { detectMoodState } from "../services/state-engine.js"
import { addMoodEntry } from "../services/memory.js"

export function onEnter() {

 const slider = document.getElementById("moodSlider")
 const valueLabel = document.getElementById("moodValue")
 const confirmBtn = document.getElementById("moodConfirmBtn")
 const savedLabel = document.getElementById("moodSavedLabel")

 if (!slider) return

 valueLabel.textContent = slider.value + "%"

 slider.addEventListener("input", () => {
  valueLabel.textContent = slider.value + "%"
 })

 confirmBtn.addEventListener("click", () => {

  const moodValue = Number(slider.value)

  const state = detectMoodState(moodValue)

  addMoodEntry({
   value: moodValue,
   state: state,
   time: Date.now()
  })

  savedLabel.textContent = "Сохранено ✓"

  setTimeout(() => {
   savedLabel.textContent = ""
  }, 2000)

 })

}