import type { FC } from 'react'

interface Props {
  dark: boolean
}

const SACEmbed: FC<Props> = ({ dark }) => {
  const storyUrl = import.meta.env.VITE_SAC_STORY_URL as string | undefined

  if (storyUrl) {
    return (
      <iframe
        src={storyUrl}
        className="sac-embed"
        allow="fullscreen"
        title="SAP Analytics Cloud Story"
      />
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center flex-1 gap-4 p-8 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
      <div className={`rounded-xl border-2 border-dashed p-10 max-w-lg text-center ${dark ? 'border-slate-600 bg-slate-800/50' : 'border-gray-300 bg-gray-50'}`}>
        <p className={`text-base font-semibold mb-2 ${dark ? 'text-slate-200' : 'text-gray-700'}`}>
          SAP Analytics Cloud Embed
        </p>
        <p className="text-sm leading-relaxed">
          Set <code className={`px-1 py-0.5 rounded text-xs font-mono ${dark ? 'bg-slate-700 text-blue-300' : 'bg-gray-200 text-blue-700'}`}>VITE_SAC_STORY_URL</code> in your Vercel environment variables to embed your SAC story here.
        </p>
        <p className={`mt-3 text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
          Example: <span className="font-mono">https://&lt;tenant&gt;.us10.hanacloudservices.cloud.sap/sap/fpa/ui/tenants/…</span>
        </p>
      </div>
    </div>
  )
}

export default SACEmbed
