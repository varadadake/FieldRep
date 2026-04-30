const TAG = '[Samvaad Audio]'

function encodeWav(audioBuffer) {
  const TARGET_RATE = 16000
  const srcRate = audioBuffer.sampleRate
  const ratio = srcRate / TARGET_RATE
  const ch0 = audioBuffer.getChannelData(0)
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null
  const numSamples = Math.ceil(audioBuffer.length / ratio)
  const dataLen = numSamples * 2
  const wavBuf = new ArrayBuffer(44 + dataLen)
  const view = new DataView(wavBuf)
  const ws = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true)
  ws(8, 'WAVE'); ws(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_RATE, true)
  view.setUint32(28, TARGET_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ws(36, 'data'); view.setUint32(40, dataLen, true)
  let off = 44
  for (let i = 0; i < numSamples; i++) {
    const src = Math.min(Math.round(i * ratio), ch0.length - 1)
    const s = Math.max(-1, Math.min(1, ch1 ? (ch0[src] + ch1[src]) / 2 : ch0[src]))
    view.setInt16(off, s < 0 ? s * 32768 : s * 32767, true)
    off += 2
  }
  return new Blob([wavBuf], { type: 'audio/wav' })
}

export class WebAudioRecorder {
  constructor() {
    this._mediaRecorder = null
    this._chunks = []
    this._stream = null
    this._analyser = null
    this._audioCtx = null
    this._levelRaf = null
    this._recording = false
  }

  async start(onLevelChange) {
    if (this._recording) return
    console.log(TAG, 'Requesting microphone…')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Could not access microphone'
      console.error(TAG, msg, err)
      throw { code: 'AUDIO_ERROR', message: msg, cause: err }
    }
    console.log(TAG, 'Microphone granted, starting MediaRecorder…')
    this._stream = stream
    this._chunks = []
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) {
        this._audioCtx = new AC()
        this._analyser = this._audioCtx.createAnalyser()
        this._analyser.fftSize = 256
        this._audioCtx.createMediaStreamSource(stream).connect(this._analyser)
        this._startLevelPolling(onLevelChange)
      }
    } catch (_) {}
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
    console.log(TAG, `MediaRecorder mime: ${mimeType || '(default)'}`)
    this._mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    this._mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this._chunks.push(e.data) }
    this._mediaRecorder.start(100)
    this._recording = true
    console.log(TAG, 'Recording started')
  }

  _startLevelPolling(onLevelChange) {
    if (!this._analyser || typeof onLevelChange !== 'function') return
    const buf = new Uint8Array(this._analyser.frequencyBinCount)
    const tick = () => {
      if (!this._recording) return
      this._analyser.getByteFrequencyData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i]
      onLevelChange(sum / (buf.length * 255))
      this._levelRaf = requestAnimationFrame(tick)
    }
    this._levelRaf = requestAnimationFrame(tick)
  }

  async stop() {
    if (!this._recording) return new Blob([], { type: 'audio/wav' })
    console.log(TAG, `Stopping… collected ${this._chunks.length} chunks`)
    const rawBlob = await new Promise((resolve) => {
      this._mediaRecorder.onstop = () => {
        resolve(new Blob(this._chunks, { type: this._mediaRecorder.mimeType || 'audio/webm' }))
      }
      this._mediaRecorder.stop()
    })
    this._cleanup()
    console.log(TAG, `Raw recording: ${rawBlob.size} bytes, type=${rawBlob.type}`)
    if (rawBlob.size < 1000) {
      console.error(TAG, 'Recording too short (< 1KB)')
      throw { code: 'AUDIO_ERROR', message: 'Recording too short — speak for at least 1 second', cause: null }
    }

    console.log(TAG, 'Decoding audio with AudioContext…')
    const arrayBuf = await rawBlob.arrayBuffer()
    const AC = window.AudioContext || window.webkitAudioContext
    const ctx = new AC()
    let decoded
    try {
      decoded = await ctx.decodeAudioData(arrayBuf)
    } catch (e) {
      ctx.close()
      console.error(TAG, 'decodeAudioData failed:', e)
      throw { code: 'AUDIO_ERROR', message: 'Could not decode recorded audio', cause: e }
    }
    ctx.close()
    console.log(TAG, `Decoded: ${decoded.length} samples, ${decoded.sampleRate}Hz, ${decoded.numberOfChannels}ch`)

    const wav = encodeWav(decoded)
    console.log(TAG, `Encoded WAV: ${wav.size} bytes (16kHz mono)`)
    return wav
  }

  _cleanup() {
    this._recording = false
    if (this._levelRaf) cancelAnimationFrame(this._levelRaf)
    if (this._stream) { this._stream.getTracks().forEach((t) => t.stop()); this._stream = null }
    if (this._audioCtx) { this._audioCtx.close().catch(() => {}); this._audioCtx = null; this._analyser = null }
    this._chunks = []
  }

  isRecording() { return this._recording }
}
