import { useState } from 'react'
import { Mic, MicOff, Volume2, Sparkles, X } from 'lucide-react'

export function AIVoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [response, setResponse] = useState("Hi! I'm your IntelliBus Voice Assistant. Click the mic and ask me anything about campus buses!")

  const handleStartListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setResponse("Voice recognition is not supported in this browser. Please type your query!")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript("Listening...")
    }

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      setTranscript(`"${text}"`)
      processVoiceQuery(text)
    }

    recognition.onerror = () => {
      setIsListening(false)
      setTranscript("Could not capture audio. Click mic to retry!")
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const processVoiceQuery = (query: string) => {
    const q = query.toLowerCase()
    let reply = ""

    if (q.includes("next") || q.includes("arrive") || q.includes("eta") || q.includes("when")) {
      reply = "BUS 101 is on Blue Express Loop and is estimated to arrive at Central Library in 4 minutes."
    } else if (q.includes("where") || q.includes("location") || q.includes("bus")) {
      reply = "BUS 101 is currently approaching Science & Tech Building traveling at 24 km per hour."
    } else if (q.includes("qr") || q.includes("ticket") || q.includes("board")) {
      reply = "Your digital QR boarding pass is active and valid for the next 15 minutes."
    } else {
      reply = "IntelliBus AI is actively monitoring 2 fleet buses. Blue Express Loop is operating on schedule!"
    }

    setResponse(reply)
    speakResponse(reply)
  }

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-5 py-3.5 rounded-full shadow-2xl hover:scale-105 transition-all group border-2 border-white/20"
        >
          <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
          <span className="text-sm">AI Voice Assistant</span>
        </button>
      ) : (
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl w-80 sm:w-96 border border-slate-800 relative">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={16} />
            <span>Campus AI Voice Intelligence</span>
          </div>

          {/* Assistant Response Box */}
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-sm mb-4 leading-relaxed flex items-start space-x-3">
            <Volume2 className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-slate-200">{response}</p>
          </div>

          {transcript && (
            <p className="text-xs text-slate-400 italic mb-4 text-center">{transcript}</p>
          )}

          {/* Voice Mic Control Button */}
          <button
            onClick={handleStartListening}
            disabled={isListening}
            className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-lg ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            {isListening ? 'Listening to your voice...' : 'Tap to Speak Query'}
          </button>
        </div>
      )}
    </div>
  )
}
