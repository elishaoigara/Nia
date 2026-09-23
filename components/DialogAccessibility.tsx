'use client'
import { useEffect } from 'react'
/** Keep keyboard focus in the topmost open dialog and restore it on close. */
export default function DialogAccessibility(){
 useEffect(()=>{
  let dialog:HTMLElement|null=null,previous:HTMLElement|null=null
  const selector='button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]'
  function update(){const next=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter(e=>e.getClientRects().length).at(-1)??null;if(next===dialog)return;if(!next){previous?.focus();previous=null}else{if(!dialog)previous=document.activeElement as HTMLElement;next.querySelector<HTMLElement>(selector)?.focus()}dialog=next}
  function key(e:KeyboardEvent){if(e.key!=='Tab'||!dialog)return;const items=Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(e=>e.getClientRects().length);if(!items.length)return;const first=items[0],last=items.at(-1)!;if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus()}}
  const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',key);return()=>{observer.disconnect();document.removeEventListener('keydown',key)}
 },[])
 return null
}
