export const INTERESTS = ['Music','Football','Gaming','Comedy','Fashion','Film','Food','Travel','Friendship','Art','Technology','Business','Careers','Education','Books','Fitness','Culture']
export function normalizeInterest(value: string) {
 const key = value.trim().toLowerCase()
 return ({tech:'technology',sports:'football',learning:'education'} as Record<string,string>)[key] ?? key
}
export function normalizeLanguage(value: string) {
 const key=value.trim().toLowerCase()
 return ({en:'english',sw:'swahili',kiswahili:'swahili',fr:'french',ar:'arabic',pt:'portuguese'} as Record<string,string>)[key] ?? key
}
