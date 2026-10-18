import CircleDirectory from '@/components/CircleDirectory'
export default async function Explore({searchParams}:{searchParams:Promise<{q?:string;country?:string;category?:string;page?:string;type?:string}>}){return <CircleDirectory params={await searchParams} discover/>}
