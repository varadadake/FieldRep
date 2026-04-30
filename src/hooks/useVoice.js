import { useState, useEffect, useCallback, useRef } from 'react'
import { VoiceSDK } from '@sociovate/samvaad'

const TAG = '[Samvaad]'

export function useVoice(onIntent) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)

  const onIntentRef = useRef(onIntent)
  useEffect(() => { onIntentRef.current = onIntent }, [onIntent])

  useEffect(() => {
    VoiceSDK.onLoading((state) => {
      console.log(TAG, `State → ${state}`)
      if (state === 'recording') {
        setIsRecording(true)
        setIsProcessing(false)
        setError(null)
      } else if (state === 'processing') {
        setIsRecording(false)
        setIsProcessing(true)
      }
    })

    VoiceSDK.onError((err) => {
      console.error(TAG, `Error [${err.code}]: ${err.message}`)
      setError(err)
      setIsRecording(false)
      setIsProcessing(false)
    })

    const intentCb = (intent) => {
      console.log(TAG, `Intent received: ${intent.name}`, intent.params)
      setIsProcessing(false)
      if (typeof onIntentRef.current === 'function') {
        onIntentRef.current(intent)
      }
    }
    VoiceSDK.onIntent(intentCb)
    return () => { VoiceSDK.offIntent(intentCb) }
  }, [])

  const startRecording = useCallback(async () => {
    console.log(TAG, 'startRecording called')
    setError(null)
    setLevel(0)
    try {
      await VoiceSDK.startRecording((lvl) => setLevel(lvl))
    } catch (e) {
      console.error(TAG, 'startRecording failed:', e)
      setIsRecording(false)
    }
  }, [])

  const stopAndProcess = useCallback(async () => {
    console.log(TAG, 'stopAndProcess called')
    try {
      await VoiceSDK.stopRecordingAndProcess()
    } catch (e) {
      console.error(TAG, 'stopAndProcess failed:', e)
    }
  }, [])

  return { isRecording, isProcessing, error, level, startRecording, stopAndProcess }
}
