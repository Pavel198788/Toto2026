export default function Loading() {
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-pulse">
      <div className="text-center space-y-3">
        <div className="h-4 bg-gray-800 rounded-sm w-24 mx-auto" />
        <div className="h-8 bg-gray-800 rounded-sm w-3/4 mx-auto" />
        <div className="h-4 bg-gray-800 rounded-sm w-1/3 mx-auto" />
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div className="h-5 bg-gray-800 rounded-sm w-1/3" />
        <div className="h-12 bg-gray-800 rounded-sm w-full" />
      </div>
    </div>
  )
}
