interface Props {
  onSubmit: () => void
  submitted: boolean
}

export default function CitizenActionPanel({ onSubmit, submitted }: Props) {
  return (
    <div className="bg-slate-800/60 border border-slate-600/40 rounded-2xl p-6 text-center">
      <div className="text-4xl mb-3">😴</div>
      <h3 className="text-slate-300 font-bold text-sm mb-2">You are a Citizen</h3>
      <p className="text-slate-400 text-xs mb-5 leading-relaxed">
        You have no night action. Confirm you are ready so the night can proceed.
        <br />
        <span className="text-slate-500">The village is counting on you during the day.</span>
      </p>

      <button
        id="submitCitizenSkip"
        onClick={onSubmit}
        disabled={submitted}
        className={`w-full font-bold py-3 rounded-xl transition-all duration-200 text-sm ${
          submitted
            ? 'bg-slate-700/60 text-slate-500 border border-slate-600 cursor-not-allowed'
            : 'bg-slate-600 hover:bg-slate-500 text-white shadow-lg'
        }`}
      >
        {submitted ? '✓ Sleeping... (ready)' : '💤 Sleep / Pass'}
      </button>
    </div>
  )
}
