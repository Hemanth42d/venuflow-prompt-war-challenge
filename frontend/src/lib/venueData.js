// Venue layout for SVG map rendering and local pathfinding display

export const VENUE_ZONES = [
  { id: 'main-stadium', name: 'Main Stadium', type: 'arena', capacity: 5000, points: '200,80 400,80 450,180 400,280 200,280 150,180', center: { x: 300, y: 180 }, color: '#4285F4' },
  { id: 'north-concourse', name: 'North Concourse', type: 'concourse', capacity: 2000, points: '160,20 440,20 450,70 400,80 200,80 150,70', center: { x: 300, y: 50 }, color: '#34A853' },
  { id: 'south-concourse', name: 'South Concourse', type: 'concourse', capacity: 2000, points: '150,290 200,280 400,280 450,290 440,340 160,340', center: { x: 300, y: 310 }, color: '#34A853' },
  { id: 'east-gate', name: 'East Wing', type: 'gate', capacity: 1500, points: '450,80 520,120 520,240 450,280 450,180', center: { x: 490, y: 180 }, color: '#FBBC05' },
  { id: 'west-gate', name: 'West Wing', type: 'gate', capacity: 1500, points: '150,180 150,80 80,120 80,240 150,280', center: { x: 110, y: 180 }, color: '#FBBC05' },
  { id: 'food-court-a', name: 'Food Court A', type: 'amenity', capacity: 800, points: '440,10 540,10 540,70 450,70', center: { x: 492, y: 40 }, color: '#EA4335' },
  { id: 'food-court-b', name: 'Food Court B', type: 'amenity', capacity: 800, points: '450,290 540,290 540,350 440,350', center: { x: 492, y: 320 }, color: '#EA4335' },
  { id: 'merch-store', name: 'Merchandise Store', type: 'amenity', capacity: 400, points: '530,130 590,130 590,230 530,230', center: { x: 560, y: 180 }, color: '#EA4335' },
  { id: 'first-aid', name: 'First Aid Center', type: 'facility', capacity: 100, points: '10,130 70,130 70,230 10,230', center: { x: 40, y: 180 }, color: '#ffffff' },
  { id: 'parking-east', name: 'Parking East', type: 'parking', capacity: 3000, points: '530,50 590,50 590,120 530,120', center: { x: 560, y: 85 }, color: '#9aa0a6' },
  { id: 'parking-west', name: 'Parking West', type: 'parking', capacity: 3000, points: '10,50 70,50 70,120 10,120', center: { x: 40, y: 85 }, color: '#9aa0a6' },
  { id: 'gate-1', name: 'Gate 1', type: 'entrance', capacity: 500, points: '160,0 220,0 220,20 160,20', center: { x: 190, y: 10 }, color: '#5f6368' },
  { id: 'gate-2', name: 'Gate 2', type: 'entrance', capacity: 500, points: '380,0 440,0 440,20 380,20', center: { x: 410, y: 10 }, color: '#5f6368' },
  { id: 'gate-3', name: 'Gate 3', type: 'entrance', capacity: 500, points: '160,340 220,340 220,360 160,360', center: { x: 190, y: 350 }, color: '#5f6368' },
  { id: 'gate-4', name: 'Gate 4', type: 'entrance', capacity: 500, points: '380,340 440,340 440,360 380,360', center: { x: 410, y: 350 }, color: '#5f6368' },
];

export const ZONE_MAP = Object.fromEntries(VENUE_ZONES.map((z) => [z.id, z]));
