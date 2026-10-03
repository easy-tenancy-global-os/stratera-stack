/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  fleetData.ts — STRATERA Estate Fleet Core mock telemetry
 *  Deterministic mock arrays (fleet, missions, incidents, care alerts,
 *  maintenance scans, protocol status) plus a live-tick helper.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────
export type RobotType = 'security' | 'care' | 'delivery' | 'maintenance'
export type RobotStatus = 'Patrolling' | 'Delivering' | 'Monitoring' | 'Charging' | 'Idle' | 'Sanitizing' | 'Emergency'
export type Zone =
  | 'Perimeter' | 'Main Lobby' | 'North Lobby' | 'Residential 12F'
  | 'Residential 24F' | 'Parking B1' | 'Parking B2' | 'Playground'
  | 'Rooftop' | 'Elevator Bank A' | 'Elevator Bank B' | 'Service Corridor'

export interface Robot {
  id: string             // e.g. 'ET-S07'
  callsign: string       // human-friendly name
  type: RobotType
  status: RobotStatus
  zone: Zone
  battery: number        // 0..100
  connectivity: '5G' | 'Wi-Fi 6E' | 'CBRS' | 'Mesh'
  signal: number         // 0..100 signal strength
  mission?: string       // current mission summary
  x: number              // 0..100 spatial-map coord (%)
  y: number              // 0..100
  cameraOn: boolean      // internal cam state (Zero-Trust toggle)
  path?: Array<{ x: number; y: number }>   // pathfinding preview
  firmware: string
  hardware: string       // e.g. 'ROS 2 Humble · Jetson AGX Orin'
  uptime: string         // "72h 14m"
}

export interface Mission {
  id: string
  robotId: string
  title: string
  type: 'Patrol' | 'Delivery' | 'Sanitization' | 'Health Check' | 'Inspection' | 'Escort' | 'Emergency'
  eta: string
  progress: number       // 0..100
  priority: 'low' | 'normal' | 'high' | 'critical'
}

export interface Incident {
  id: string
  ts: string             // ISO timestamp
  severity: 'info' | 'warning' | 'critical'
  zone: Zone
  category: 'Perimeter Breach' | 'Glass Break' | 'Unauth Access' | 'Motion Anomaly' | 'License Plate' | 'Thermal Signature'
  title: string
  detail: string
  status: 'open' | 'dispatched' | 'resolved'
  assignedRobotId?: string
}

export interface CareAlert {
  id: string
  ts: string
  unit: string             // apartment number
  resident: string         // "Mrs. Chen (82)"
  type: 'Fall Detection' | 'Respiration Drop' | 'HR Anomaly' | 'No-motion 4h' | 'Med Reminder' | 'Wander Alert'
  vitals: { hr?: number; resp?: number; spo2?: number }
  handled: boolean
  detail: string
  sensor: 'FMCW Radar' | 'mmWave Radar' | 'UWB' | 'PIR'
}

export interface EscortRequest {
  id: string
  requester: string
  unit: string
  from: Zone
  to: Zone
  requestedAt: string
  etaMinutes: number
  assignedRobotId?: string
  status: 'queued' | 'in-progress' | 'complete'
}

export interface DeliveryTask {
  id: string
  courier: string          // robot id
  parcel: string           // "Rx: Atorvastatin 20mg" | "Meal — Unit 2401"
  from: Zone
  to: string               // unit number
  elevatorBank: 'A' | 'B'
  progress: number
  eta: string
  kind: 'medical' | 'meal' | 'grocery' | 'parcel'
}

export interface MaintenanceScan {
  id: string
  ts: string
  asset: 'Roof HVAC' | 'Boiler Room' | 'Facade' | 'Elevator Machine' | 'Cooling Tower' | 'Solar Array'
  robotId: string
  findings: string
  severity: 'ok' | 'attention' | 'urgent'
  metric: string           // e.g. "Δ 4.2°C hotspot on Compressor B"
}

export interface ProtocolStatus {
  id: string
  name: 'ROS 2 Humble' | 'VDA 5050' | 'BACnet Elevator API' | 'MQTT Smart Door'
        | 'OPC UA' | 'Matter 1.3' | 'Zigbee 3.0' | 'LoRaWAN'
  layer: 'Robotics' | 'AGV/AMR' | 'Building' | 'IoT'
  status: 'online' | 'degraded' | 'offline'
  nodes: number
  latencyMs: number
  version: string
}

// ─────────────────────────────────────────────────────────────────────────────
//  Static baseline data (mock but plausible)
// ─────────────────────────────────────────────────────────────────────────────
export const ROBOTS: Robot[] = [
  { id:'ET-S01', callsign:'Sentinel Alpha',   type:'security',    status:'Patrolling', zone:'Perimeter',
    battery:88, connectivity:'5G', signal:96,  mission:'Perimeter sweep · loop 3/8',
    x:12,  y:82, cameraOn:true,  firmware:'v3.4.2', hardware:'ROS 2 Humble · Jetson AGX Orin',  uptime:'96h 04m',
    path:[{x:12,y:82},{x:24,y:74},{x:38,y:70},{x:52,y:66}] },
  { id:'ET-S02', callsign:'Sentinel Bravo',   type:'security',    status:'Patrolling', zone:'Parking B1',
    battery:74, connectivity:'CBRS', signal:82, mission:'License-plate scan · Level B1',
    x:34,  y:22, cameraOn:true,  firmware:'v3.4.2', hardware:'ROS 2 Humble · Jetson AGX Orin',  uptime:'52h 18m' },
  { id:'ET-S03', callsign:'Sentinel Charlie', type:'security',    status:'Patrolling', zone:'Main Lobby',
    battery:91, connectivity:'Wi-Fi 6E', signal:99, mission:'Concierge assist · lobby',
    x:52,  y:52, cameraOn:true,  firmware:'v3.4.2', hardware:'ROS 2 Humble · Jetson AGX Orin',  uptime:'12h 40m' },
  { id:'ET-S04', callsign:'Sentinel Delta',   type:'security',    status:'Emergency',  zone:'Rooftop',
    battery:63, connectivity:'5G', signal:74, mission:'⚠ Thermal signature investigation',
    x:70,  y:8,  cameraOn:true,  firmware:'v3.4.2', hardware:'ROS 2 Humble · Jetson AGX Orin',  uptime:'214h 09m' },

  { id:'ET-C01', callsign:'Carewatch Aurora', type:'care',        status:'Monitoring', zone:'Residential 24F',
    battery:82, connectivity:'Wi-Fi 6E', signal:94, mission:'FMCW radar sweep · Unit 2401',
    x:82,  y:14, cameraOn:false, firmware:'v2.7.1', hardware:'FMCW Radar 77GHz · Edge NPU',    uptime:'318h 22m' },
  { id:'ET-C02', callsign:'Carewatch Nova',   type:'care',        status:'Monitoring', zone:'Residential 12F',
    battery:79, connectivity:'Wi-Fi 6E', signal:88, mission:'Fall-detection standby · Unit 1207',
    x:74,  y:44, cameraOn:false, firmware:'v2.7.1', hardware:'FMCW Radar 77GHz · Edge NPU',    uptime:'201h 55m' },
  { id:'ET-C03', callsign:'Carewatch Vega',   type:'care',        status:'Monitoring', zone:'Playground',
    battery:66, connectivity:'Mesh', signal:71, mission:'Geo-fence guardian · 14 children',
    x:22,  y:64, cameraOn:true,  firmware:'v2.7.1', hardware:'UWB Beacon Array + mmWave',      uptime:'6h 12m' },

  { id:'ET-D01', callsign:'Courier Mercury',  type:'delivery',    status:'Delivering', zone:'Elevator Bank A',
    battery:57, connectivity:'Wi-Fi 6E', signal:93, mission:'Rx · Unit 1804 · Elevator A',
    x:58,  y:36, cameraOn:false, firmware:'v4.1.0', hardware:'VDA 5050 AMR · SLAM LiDAR',      uptime:'8h 03m' },
  { id:'ET-D02', callsign:'Courier Atlas',    type:'delivery',    status:'Delivering', zone:'Elevator Bank B',
    battery:64, connectivity:'Wi-Fi 6E', signal:90, mission:'Meal tray · Unit 2401',
    x:62,  y:38, cameraOn:false, firmware:'v4.1.0', hardware:'VDA 5050 AMR · SLAM LiDAR',      uptime:'14h 51m' },
  { id:'ET-D03', callsign:'Courier Titan',    type:'delivery',    status:'Idle',       zone:'North Lobby',
    battery:41, connectivity:'Wi-Fi 6E', signal:85, mission:'Awaiting queue',
    x:42,  y:46, cameraOn:false, firmware:'v4.1.0', hardware:'VDA 5050 AMR · SLAM LiDAR',      uptime:'2h 22m' },

  { id:'ET-M01', callsign:'Janus Scrubber',   type:'maintenance', status:'Sanitizing', zone:'Main Lobby',
    battery:69, connectivity:'Wi-Fi 6E', signal:97, mission:'UV-C sanitization · 42% of lobby',
    x:48,  y:56, cameraOn:false, firmware:'v5.0.3', hardware:'UV-C 254nm + HEPA H14 · Ackermann',uptime:'23h 40m' },
  { id:'ET-M02', callsign:'Janus Crawler',    type:'maintenance', status:'Patrolling', zone:'Service Corridor',
    battery:81, connectivity:'Wi-Fi 6E', signal:88, mission:'Thermal HVAC scan · corridor 4W',
    x:24,  y:34, cameraOn:false, firmware:'v5.0.3', hardware:'Thermal Imager 640×512 · Crawler',uptime:'70h 08m' },
  { id:'ET-M03', callsign:'Aerial Sable',     type:'maintenance', status:'Charging',   zone:'Rooftop',
    battery:22, connectivity:'5G', signal:78, mission:'On dock · rooftop nest',
    x:88,  y:12, cameraOn:false, firmware:'v5.0.3', hardware:'Aerial UAV · RTK-GPS · IR',       uptime:'0h 04m' },

  { id:'ET-S05', callsign:'Sentinel Echo',    type:'security',    status:'Charging',   zone:'Service Corridor',
    battery:18, connectivity:'Wi-Fi 6E', signal:82, mission:'Charge cycle · 42m remaining',
    x:16,  y:38, cameraOn:false, firmware:'v3.4.2', hardware:'ROS 2 Humble · Jetson AGX Orin', uptime:'0h 42m' },
]

export const MISSIONS: Mission[] = [
  { id:'M-8801', robotId:'ET-S01', title:'Perimeter sweep loop',       type:'Patrol',       eta:'12m',  progress:34, priority:'normal' },
  { id:'M-8802', robotId:'ET-S02', title:'ALPR scan · Parking B1',     type:'Patrol',       eta:'6m',   progress:71, priority:'normal' },
  { id:'M-8803', robotId:'ET-S04', title:'Thermal investigation · Rooftop', type:'Emergency', eta:'3m',   progress:22, priority:'critical' },
  { id:'M-8804', robotId:'ET-D01', title:'Rx delivery · Unit 1804',    type:'Delivery',     eta:'4m',   progress:82, priority:'high' },
  { id:'M-8805', robotId:'ET-D02', title:'Meal tray · Unit 2401',      type:'Delivery',     eta:'7m',   progress:55, priority:'normal' },
  { id:'M-8806', robotId:'ET-C01', title:'FMCW sweep · 2401',          type:'Health Check', eta:'—',    progress:100,priority:'normal' },
  { id:'M-8807', robotId:'ET-M01', title:'UV-C cycle · Main Lobby',    type:'Sanitization', eta:'18m',  progress:42, priority:'low' },
  { id:'M-8808', robotId:'ET-M02', title:'HVAC thermal · Corridor 4W', type:'Inspection',   eta:'22m',  progress:11, priority:'normal' },
]

export const INCIDENTS: Incident[] = [
  { id:'I-4401', ts:'2026-08-09T14:22:08Z', severity:'critical', zone:'Rooftop',
    category:'Thermal Signature', title:'Unexplained thermal signature detected',
    detail:'Aerial IR imaging picked up a 34°C anomaly near HVAC unit 3 · human-shape confidence 0.86',
    status:'dispatched', assignedRobotId:'ET-S04' },
  { id:'I-4400', ts:'2026-08-09T13:58:41Z', severity:'warning',  zone:'Parking B1',
    category:'License Plate', title:'Watchlist plate match · GL-DX-3319',
    detail:'ANPR flagged plate against tenant watchlist · confidence 0.94',
    status:'open' },
  { id:'I-4399', ts:'2026-08-09T13:11:02Z', severity:'info',     zone:'Perimeter',
    category:'Motion Anomaly', title:'Cyclist along south boundary',
    detail:'Loitering 4m 12s outside south fence · cleared without escalation',
    status:'resolved', assignedRobotId:'ET-S01' },
  { id:'I-4398', ts:'2026-08-09T12:47:15Z', severity:'warning',  zone:'Elevator Bank B',
    category:'Unauth Access', title:'Card swipe outside credential window',
    detail:'MQTT smart-door · Unit 1902 credential used at 12:47 · scheduled window 06:00–22:00 · benign',
    status:'resolved' },
  { id:'I-4397', ts:'2026-08-09T09:33:00Z', severity:'critical', zone:'Playground',
    category:'Perimeter Breach', title:'Child left geo-fence zone',
    detail:'UWB tag 4A31 exited safe polygon · guardian AMR ET-C03 engaged in 4s · child returned',
    status:'resolved', assignedRobotId:'ET-C03' },
]

export const CARE_ALERTS: CareAlert[] = [
  { id:'C-991', ts:'2026-08-09T14:19:44Z', unit:'2401', resident:'Mrs. Chen (82)',
    type:'HR Anomaly', vitals:{ hr: 112, resp: 22 }, handled:false, sensor:'FMCW Radar',
    detail:'Resting heart rate elevated 22% above 30-day baseline · concierge notified' },
  { id:'C-990', ts:'2026-08-09T13:48:00Z', unit:'1207', resident:'Mr. Rossi (76)',
    type:'Med Reminder', vitals:{}, handled:true, sensor:'FMCW Radar',
    detail:'Confirmed 14:00 blood-pressure medication via voice acknowledgement' },
  { id:'C-989', ts:'2026-08-09T09:22:11Z', unit:'0812', resident:'Ms. Adeyemi (68)',
    type:'No-motion 4h', vitals:{ resp: 14 }, handled:true, sensor:'mmWave Radar',
    detail:'Motion resumed at 09:26 · resident acknowledged wellness check' },
]

export const ESCORTS: EscortRequest[] = [
  { id:'E-771', requester:'Priya S.', unit:'1804', from:'Parking B1', to:'Residential 12F',
    requestedAt:'2026-08-09T14:24:18Z', etaMinutes:2, assignedRobotId:'ET-S02', status:'in-progress' },
  { id:'E-770', requester:'Amir K.',  unit:'2301', from:'Main Lobby', to:'Parking B2',
    requestedAt:'2026-08-09T14:12:00Z', etaMinutes:7, status:'queued' },
]

export const DELIVERIES: DeliveryTask[] = [
  { id:'D-2201', courier:'ET-D01', parcel:'Rx · Atorvastatin 20mg', from:'Main Lobby', to:'Unit 1804',
    elevatorBank:'A', progress:82, eta:'4m', kind:'medical' },
  { id:'D-2202', courier:'ET-D02', parcel:'Meal tray · low-sodium',  from:'Service Corridor', to:'Unit 2401',
    elevatorBank:'B', progress:55, eta:'7m', kind:'meal' },
  { id:'D-2203', courier:'ET-D03', parcel:'Grocery drop · queued',   from:'North Lobby', to:'Unit 0910',
    elevatorBank:'A', progress:0,  eta:'—',  kind:'grocery' },
]

export const MAINT_SCANS: MaintenanceScan[] = [
  { id:'S-501', ts:'2026-08-09T13:04:00Z', asset:'Roof HVAC',      robotId:'ET-M03',
    findings:'Compressor B thermal Δ +4.2°C vs. Compressor A — early bearing wear',
    severity:'attention', metric:'Δ 4.2°C hotspot' },
  { id:'S-500', ts:'2026-08-09T12:41:00Z', asset:'Cooling Tower',  robotId:'ET-M03',
    findings:'Fan RPM steady · vibration signature nominal',
    severity:'ok', metric:'Vibration 2.3 mm/s RMS' },
  { id:'S-499', ts:'2026-08-09T11:22:00Z', asset:'Elevator Machine', robotId:'ET-M02',
    findings:'Rope tension within spec · brake pad wear 62%',
    severity:'ok', metric:'Brake wear 62%' },
  { id:'S-498', ts:'2026-08-09T09:15:00Z', asset:'Facade',         robotId:'ET-M03',
    findings:'Sealant delamination on curtain-wall panel B14 · 24×18cm',
    severity:'urgent', metric:'Panel B14 delamination' },
]

export const PROTOCOLS: ProtocolStatus[] = [
  { id:'P-01', name:'ROS 2 Humble',        layer:'Robotics', status:'online',    nodes:14, latencyMs: 12, version:'2024.05' },
  { id:'P-02', name:'VDA 5050',            layer:'AGV/AMR',  status:'online',    nodes: 3, latencyMs: 24, version:'2.0'    },
  { id:'P-03', name:'BACnet Elevator API', layer:'Building', status:'online',    nodes: 6, latencyMs: 40, version:'BTL 4'  },
  { id:'P-04', name:'MQTT Smart Door',     layer:'IoT',      status:'online',    nodes:412, latencyMs:  8, version:'5.0'   },
  { id:'P-05', name:'OPC UA',              layer:'Building', status:'degraded',  nodes: 22, latencyMs:118, version:'1.05'  },
  { id:'P-06', name:'Matter 1.3',          layer:'IoT',      status:'online',    nodes:184, latencyMs: 18, version:'1.3'   },
  { id:'P-07', name:'Zigbee 3.0',          layer:'IoT',      status:'online',    nodes: 76, latencyMs: 22, version:'3.0'   },
  { id:'P-08', name:'LoRaWAN',             layer:'IoT',      status:'online',    nodes: 42, latencyMs:230, version:'1.0.4' },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Live-tick helper — small perturbations to feel "alive" without churn
// ─────────────────────────────────────────────────────────────────────────────
export function tickRobots(robots: Robot[]): Robot[] {
  return robots.map(r => {
    // battery: charging bots slowly increase, others slowly decrease
    let battery = r.battery
    if (r.status === 'Charging') battery = Math.min(100, battery + 1.2)
    else if (r.status !== 'Idle') battery = Math.max(3, battery - (Math.random() * 0.35))
    // signal: mild jitter
    const signal = clamp(r.signal + (Math.random() * 4 - 2), 40, 100)
    // spatial drift for patrolling / delivering / sanitizing / emergency
    let { x, y } = r
    if (['Patrolling','Delivering','Sanitizing','Emergency'].includes(r.status)) {
      x = clamp(x + (Math.random() * 1.2 - 0.6), 3, 97)
      y = clamp(y + (Math.random() * 1.0 - 0.5), 3, 97)
    }
    return { ...r, battery: Math.round(battery * 10) / 10, signal: Math.round(signal), x, y }
  })
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aggregate KPIs
// ─────────────────────────────────────────────────────────────────────────────
export interface FleetKPIs {
  totalActive: number
  activeMissions: number
  avgBattery: number
  highSeverityIncidents: number
  warningIncidents: number
  careAlertsOpen: number
  careAlertsHandled: number
}

export function computeKPIs(
  robots: Robot[],
  missions: Mission[],
  incidents: Incident[],
  care: CareAlert[],
): FleetKPIs {
  const activeStates: RobotStatus[] = ['Patrolling','Delivering','Monitoring','Sanitizing','Emergency']
  const totalActive = robots.filter(r => activeStates.includes(r.status)).length
  const activeMissions = missions.filter(m => m.progress < 100).length
  const avgBattery = Math.round(robots.reduce((a, r) => a + r.battery, 0) / robots.length)
  const highSeverityIncidents = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length
  const warningIncidents      = incidents.filter(i => i.severity === 'warning'  && i.status !== 'resolved').length
  const careAlertsOpen     = care.filter(c => !c.handled).length
  const careAlertsHandled  = care.filter(c => c.handled).length
  return { totalActive, activeMissions, avgBattery, highSeverityIncidents, warningIncidents, careAlertsOpen, careAlertsHandled }
}
