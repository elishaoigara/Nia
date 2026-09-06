import CircleDirectory from '@/components/CircleDirectory'
export default async function Circles({searchParams}:{searchParams:Promise<{q?:string;country?:string;category?:string;page?:string}>}){return <CircleDirectory params={await searchParams}/>}
