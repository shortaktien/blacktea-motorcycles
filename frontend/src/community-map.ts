import mapData from './community-map-data.json';
import subdivisionData from './community-map-subdivisions.json';

export type PostalCountry = 'D' | 'A' | 'CH';
export type CommunityMapModel = 'Bonfire' | 'Wildfire';
export type CommunityMapRegion = {
  country: PostalCountry;
  prefix: string;
  memberCount: number;
  modelCounts?: Partial<Record<CommunityMapModel, number>>;
  totalKilometers?: number;
  kilometersByModel?: Partial<Record<CommunityMapModel, number>>;
};
export type CommunityMapPoint = { x: number; y: number; label: string; countryLabel: string };

const countryLabels: Record<PostalCountry, string> = { D: 'Deutschland', A: 'Österreich', CH: 'Schweiz' };
export const communityMapViewBox = '0 0 800 820';

// Borders and postal regions share the same Mercator projection of WGS84 coordinates.
function mercator(lon: number, lat: number): [number, number] {
  return [lon * Math.PI / 180, -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
}
const vertices = mapData.countries.flatMap(country => country.polygons.flat(2));
const projected = vertices.map(([lon, lat]) => mercator(lon, lat));
const minX = Math.min(...projected.map(p => p[0]));
const maxX = Math.max(...projected.map(p => p[0]));
const minY = Math.min(...projected.map(p => p[1]));
const maxY = Math.max(...projected.map(p => p[1]));
const scale = Math.min(720 / (maxX - minX), 740 / (maxY - minY));

export function projectCommunityCoordinates(lon: number, lat: number): { x: number; y: number } {
  const [x, y] = mercator(lon, lat);
  return { x: 400 + (x - (minX + maxX) / 2) * scale, y: 410 + (y - (minY + maxY) / 2) * scale };
}

const labelCoordinates: Record<PostalCountry, [number, number]> = {
  D: [9.8, 51.3], A: [14.1, 47.5], CH: [8.05, 46.7],
};
export const communityMapCountries = mapData.countries.map(country => {
  const code = country.code as PostalCountry;
  return {
    code,
    label: countryLabels[code],
    labelPoint: projectCommunityCoordinates(...labelCoordinates[code]),
    path: country.polygons.flatMap(polygon => polygon.map(ring => ring.map(([lon, lat], index) => {
      const { x, y } = projectCommunityCoordinates(lon, lat);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ') + 'Z')).join(' '),
  };
});
export const communityMapSubdivisions = subdivisionData.subdivisions;

export function getCommunityMapPoint(region: CommunityMapRegion): CommunityMapPoint | null {
  const coordinates = (mapData.postalRegions[region.country] as Record<string, number[]>)[region.prefix];
  // Never invent a position for a postal prefix absent from the dataset.
  if (!coordinates) return null;
  return {
    ...projectCommunityCoordinates(coordinates[0], coordinates[1]),
    label: `PLZ-Bereich ${region.prefix}`,
    countryLabel: countryLabels[region.country],
  };
}
