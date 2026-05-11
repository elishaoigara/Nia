// African countries + major cities used across Nia
export const AFRICAN_COUNTRIES = [
  'Kenya', 'Nigeria', 'Ghana', 'South Africa', 'Ethiopia', 'Tanzania',
  'Uganda', 'Rwanda', 'Senegal', 'Côte d\'Ivoire', 'Cameroon', 'Zimbabwe',
  'Zambia', 'Mozambique', 'Angola', 'Egypt', 'Morocco', 'Tunisia',
  'Algeria', 'Sudan', 'Mali', 'Burkina Faso', 'Niger', 'Chad',
  'Democratic Republic of Congo', 'Republic of Congo', 'Gabon',
  'Botswana', 'Namibia', 'Malawi', 'Lesotho', 'Eswatini',
  'Madagascar', 'Mauritius', 'Somalia', 'Eritrea', 'Djibouti',
  'Liberia', 'Sierra Leone', 'Guinea', 'Togo', 'Benin',
  'Other'
]

export const COUNTRY_FLAGS: Record<string, string> = {
  'Kenya': '🇰🇪', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'South Africa': '🇿🇦',
  'Ethiopia': '🇪🇹', 'Tanzania': '🇹🇿', 'Uganda': '🇺🇬', 'Rwanda': '🇷🇼',
  'Senegal': '🇸🇳', 'Côte d\'Ivoire': '🇨🇮', 'Cameroon': '🇨🇲', 'Zimbabwe': '🇿🇼',
  'Zambia': '🇿🇲', 'Mozambique': '🇲🇿', 'Angola': '🇦🇴', 'Egypt': '🇪🇬',
  'Morocco': '🇲🇦', 'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'Sudan': '🇸🇩',
  'Mali': '🇲🇱', 'Burkina Faso': '🇧🇫', 'Niger': '🇳🇪', 'Chad': '🇹🇩',
  'Democratic Republic of Congo': '🇨🇩', 'Republic of Congo': '🇨🇬',
  'Gabon': '🇬🇦', 'Botswana': '🇧🇼', 'Namibia': '🇳🇦', 'Malawi': '🇲🇼',
  'Madagascar': '🇲🇬', 'Mauritius': '🇲🇺', 'Somalia': '🇸🇴',
  'Liberia': '🇱🇷', 'Sierra Leone': '🇸🇱', 'Togo': '🇹🇬', 'Benin': '🇧🇯',
  'Other': '🌍'
}

export const AFRICAN_REGIONS = [
  { id: 'east', label: 'East Africa', emoji: '🦁', countries: ['Kenya','Tanzania','Uganda','Rwanda','Ethiopia','Somalia','Eritrea','Djibouti','Mozambique','Malawi','Zambia','Zimbabwe'] },
  { id: 'west', label: 'West Africa', emoji: '🥁', countries: ['Nigeria','Ghana','Senegal','Côte d\'Ivoire','Cameroon','Mali','Burkina Faso','Niger','Togo','Benin','Liberia','Sierra Leone','Guinea'] },
  { id: 'southern', label: 'Southern Africa', emoji: '🦏', countries: ['South Africa','Botswana','Namibia','Zimbabwe','Zambia','Malawi','Mozambique','Lesotho','Eswatini','Angola'] },
  { id: 'north', label: 'North Africa', emoji: '🐪', countries: ['Egypt','Morocco','Tunisia','Algeria','Sudan','Chad'] },
  { id: 'central', label: 'Central Africa', emoji: '🦍', countries: ['Democratic Republic of Congo','Republic of Congo','Gabon','Cameroon','Chad','Angola'] },
]

export function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] ?? '🌍'
}

export function getRegion(country: string): string {
  const region = AFRICAN_REGIONS.find(r => r.countries.includes(country))
  return region?.label ?? 'Africa'
}
