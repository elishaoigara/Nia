'use client'

import { useRef } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { AFRICAN_COUNTRIES } from '@/lib/african-data'
import { INTERESTS, normalizeInterest } from '@/lib/interests'

export default function CircleFilters({ base, q, country, category }: { base: string; q: string; country: string; category: string }) {
 const dialog = useRef<HTMLDialogElement>(null)
 const active = Number(Boolean(country)) + Number(Boolean(category))
 return <>
  <button type="button" className="discover-filter-button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}><SlidersHorizontal size={18}/> Filters{active > 0 && <span>{active}</span>}</button>
  <dialog ref={dialog} className="discover-filter-dialog" aria-labelledby="discover-filter-title">
   <form action={base} method="get" className="discover-filter-form">
    <div className="discover-filter-head"><div><h2 id="discover-filter-title">Filter Circles</h2><p>Find a community that fits you.</p></div><button type="button" aria-label="Close filters" onClick={() => dialog.current?.close()}><X size={20}/></button></div>
    {q && <input type="hidden" name="q" value={q}/>} 
    <label>Country<select name="country" defaultValue={country}><option value="">All countries</option>{AFRICAN_COUNTRIES.filter(c=>c!=='Other').map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    <label>Interest<select name="category" defaultValue={category}><option value="">All interests</option>{INTERESTS.map(c=><option value={normalizeInterest(c)} key={c}>{c}</option>)}</select></label>
    <div className="discover-filter-actions"><a href={q ? `${base}?${new URLSearchParams({q})}` : base}>Clear filters</a><button type="submit" className="btn-primary">Show Circles</button></div>
   </form>
  </dialog>
 </>
}
