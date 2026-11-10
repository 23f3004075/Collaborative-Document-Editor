"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, FileText, Users } from "lucide-react";
import { usePersona } from "@/context/PersonaContext";
import { UserAvatar } from "./RoleBadge";

interface NavbarProps {
  rightSlot?: React.ReactNode;
}

export function Navbar({ rightSlot }: NavbarProps) {
  const { activeUser, personas, isSwitching, switchPersona } = usePersona();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleSelectPersona(userId: string) {
    setDropdownOpen(false);
    await switchPersona(userId);
  }

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-slate-900 hover:opacity-90 transition-opacity shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-semibold text-base tracking-tight hidden sm:inline">
            Ajaia Docs
          </span>
        </Link>
        {rightSlot}
      </div>

      <div className="relative flex items-center gap-3" ref={menuRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          disabled={isSwitching}
          aria-expanded={dropdownOpen}
          aria-label="Switch active user persona"
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
        >
          <UserAvatar user={activeUser} size="sm" />
          <div className="hidden md:block leading-tight">
            <div className="text-xs font-semibold text-slate-800">
              {activeUser.name}
            </div>
            <div className="text-[11px] text-slate-500">
              {activeUser.roleTitle}
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Users className="w-3.5 h-3.5" />
              Switch Team Persona
            </div>
            <div className="py-1">
              {personas.map((persona) => {
                const isActive = persona.id === activeUser.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleSelectPersona(persona.id)}
                    className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${
                      isActive ? "bg-indigo-50/60" : ""
                    }`}
                  >
                    <UserAvatar user={persona} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {persona.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {persona.roleTitle} • {persona.email}
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
            <div className="px-3 pt-2 pb-1 border-t border-slate-100 text-[11px] text-slate-500">
              Switch accounts anytime to test Owner, Editor, and Viewer access.
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

