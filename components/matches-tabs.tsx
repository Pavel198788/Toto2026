"use client"

import Link from "next/link"

interface Tab {
  key: string
  label: string
  count: number
}

interface MatchesTabsProps {
  tabs: Tab[]
  activeTab: string
}

export function MatchesTabs({ tabs, activeTab }: MatchesTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "all" ? "/matches" : `/matches?tab=${tab.key}`}
          className={[
            "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
            activeTab === tab.key
              ? "bg-white text-black"
              : "bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-gray-200",
          ].join(" ")}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-1.5 opacity-50 text-xs font-normal">{tab.count}</span>
          )}
        </Link>
      ))}
    </div>
  )
}
