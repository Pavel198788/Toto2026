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
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 -mx-2 px-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "all" ? "/matches" : `/matches?tab=${tab.key}`}
          className={[
            "shrink-0 px-4 py-1.5 rounded-sm text-[10px] font-black tracking-widest transition-colors whitespace-nowrap",
            activeTab === tab.key
              ? "bg-yellow-400 text-black"
              : "bg-[#111] border border-[#1a1500] text-gray-600 hover:text-gray-400",
          ].join(" ")}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-1.5 opacity-40 text-[9px] font-normal">{tab.count}</span>
          )}
        </Link>
      ))}
    </div>
  )
}
