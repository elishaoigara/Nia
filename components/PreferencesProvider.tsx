'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { publicSupabaseEnv } from '@/lib/env'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_PREFERENCES, TRANSLATIONS, type Preferences } from '@/lib/preferences'
const Context = createContext({ preferences: DEFAULT_PREFERENCES, ready: false, refresh: () => {}, t: (text: string) => text })
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
 const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
 const [ready, setReady] = useState(false)
 const [revision, setRevision] = useState(0)
 useEffect(() => {
  if (!publicSupabaseEnv.isConfigured) return
  let active = true
  const supabase=createClient()
  const load=async () => {
   const {data:{user}}=await supabase.auth.getUser()
   const {data,error}=user ? await supabase.from('user_preferences').select('*').eq('user_id',user.id).maybeSingle() : {data:null,error:null}
   if(active){setPreferences({...DEFAULT_PREFERENCES,...data} as Preferences);setReady(!error)}
  }
  void load()
  const { data: { subscription } }=supabase.auth.onAuthStateChange(() => { setTimeout(() => { void load() }, 0) })
  return () => { active=false;subscription.unsubscribe() }
 },[revision])
 useEffect(() => { document.documentElement.lang=preferences.interface_language },[preferences.interface_language])
 return <Context.Provider value={{preferences,ready,refresh:()=>setRevision(n=>n+1),t:text=>TRANSLATIONS[preferences.interface_language]?.[text] ?? text}}>{children}</Context.Provider>
}
export const usePreferences=()=>useContext(Context)
