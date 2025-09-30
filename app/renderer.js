// renderer.js
const startButton = document.getElementById('startButton')
const stopButton = document.getElementById('stopButton')
const video = document.querySelector('video')

startButton.addEventListener('click', () => {
  console.log(navigator.mediaDevices);
  navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: {
      width: 1500,
      height: 1600,
      frameRate: 120
    }
  }).then(stream => {
    video.srcObject = stream
    video.onloadedmetadata = (e) => video.play()
  }).catch(e => console.log(e))
})

stopButton.addEventListener('click', () => {
  video.pause()
})