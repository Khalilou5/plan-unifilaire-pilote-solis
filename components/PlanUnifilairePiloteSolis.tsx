"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Home, Info, Power, Battery, Zap, Settings, Grid3x3, AlertTriangle, FastForward, Repeat2, Activity, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';

// =================================================================================
// 1. DÉFINITION DES TYPES ET INTERFACES (IEC 61850 Logic)
// =================================================================================

type ComponentId = "pv" | "onduleurs" | "bess" |
"tgbt" | "transfo" | "posteMV" | "pcc" | "combiner";
type LevelType = 'all' | 'dc' | 'ac-bt' | 'ac-mv';
type FlowScenarioType = 'PV_INJ' | 'BESS_DIS' | 'BESS_CHG';
type VoltageLevel = 'DC' | 'AC' | 'MV';
type LineFlowRole = 'pvSource' | 'bessPath' | 'gridPath' | 'dcPath' | 'auxLoad';

interface ComponentData {
  id: ComponentId;
  name: string;
  icon: LucideIcon;
  specs: Record<string, string>;
  compliance?: Record<string, string>;
  iec61850?: string;
  color: string;
}

interface AnimatedLineProps {
  path: string;
  color: string;
  voltageLevel: VoltageLevel;
  flowScenario: FlowScenarioType;
  flowAnimation: boolean;
  flowRole: LineFlowRole;
  reverse?: boolean;
  strokeWidth?: number;
  markerEndId?: string;
}

interface TelemetryData {
  pvPower: number;
  bessPower: number; // >0 discharge, <0 charge
  gridPower: number; // >0 export, <0 import
  bessSOC: number;
  frequency: number;
  voltage: number;
}

// =================================================================================
// 2. DONNÉES TECHNIQUES (TYPES STRICTS)
// =================================================================================

const components: Record<ComponentId, ComponentData> = {
  pv: {
    id: 'pv',
    name: 'Champ PV',
    icon: Power,
    specs: {
      'Puissance DC': '6,0 MWc',
      'Tension Max': '1500 V DC',
      'Strings': 'Multi-combiner'
    },
    compliance: {
      'IEC 62548': 'Critères conception PV',
      'IEC 60364-7-712': 'Installation PV'
    },
    iec61850: 'MMXU.W / MMXU.V',
    color: '#fb923c' // orange-500
  },
  combiner: {
    id: 'combiner',
    name: 'Combiner Box',
    icon: Grid3x3,
    specs: {
      'Type': 'DC Combiner',
      'Protection': 'String Fuses',
      'Monitoring': 'Per-string'
    },
    iec61850: 'XCBR.Pos',
    color: '#fb923c' // orange-500
  },
  onduleurs: {
    id: 'onduleurs',
    name: 'Onduleurs PV',
    icon: Zap,
    specs: {
      'Modèle': '19 × Huawei 330KTL-H1',
      'Puissance': '6,27 MWac',
      'Ratio AC/DC': '1.045',
      'Tension AC': '400 V (3ph)',
      'Rendement': '> 98,5%'
    },
    compliance: {
      'IEEE 1547-2018': 'Grid-Forming',
    },
    iec61850: 'ZINV / MMXU',
    color: '#3b82f6' // blue-500
  },
  bess: {
    id: 'bess',
    name: 'BESS 10 MWh',
    icon: Battery,
    specs: {
      'Capacité': '10 MWh (2×5MWh)',
      'PCS Continu': '6,0 MWac',
      'PCS Burst': '7,2 MWac (10min)',
      'Tension': '400 V AC'
    },
    compliance: {
      'NFPA 855': 'Sécurité BESS',
      'IEC 62548': 'Intégration'
    },
    iec61850: 'ZBAT / DRCC',
    color: '#10b981' // emerald-500
  },
  tgbt: {
    id: 'tgbt',
    name: 'TGBT 400V',
    icon: Grid3x3,
    specs: {
      'Tension': '400 V AC (3ph+N)',
      'In Bus': '1250 A',
      'Icw (1s)': '30 kA rms',
      'Protection': 'SPD Classe II'
    },
    compliance: {
      'IEC 61439-2': 'Appareillage BT',
      'IEC 60364': 'Installation BT'
    },
    iec61850: 'XCBR / CSWI',
    color: '#6366f1' // indigo-500
  },
  transfo: {
    id: 'transfo',
    name: 'Transformateur',
    icon: Settings,
    specs: {
      'Puissance': '7,5 MVA',
      'Tension': '0,4/33 kV',
      'Vector': 'Δ/Yy0',
      'OLTC': 'Contrôle EMS',
    },
    compliance: {
      'IEC 60076': 'Transformateurs'
    },
    iec61850: 'YPTR / ATCC',
    color: '#8b5cf6' // violet-500
  },
  posteMV: {
    id: 'posteMV',
    name: 'Poste MV 33kV',
    icon: AlertTriangle,
    specs: {
      'Tension': '33 kV',
      'Icw (1s)': '25 kA rms',
      'Protection': '50/51, 67/67N, 27/59, 81U/O',
      'Comptage': 'Classe 0.2S'
    },
    compliance: {
      'IEC 61850': 'SCADA/EMS',
    },
    iec61850: 'XCBR / PDIF / PTUV',
    color: '#14b8a6' // teal-500
  },
  pcc: {
    id: 'pcc',
    name: 'PCC SENELEC',
    icon: Zap,
    specs: {
      'P Injectable': '6,0 MWac (PPA)',
      'Tension': '33 kV',
      'THD': '< 5%',
      'Ramp Rate': '≤ 10%/min',
    },
    compliance: {
      'IEEE 1547-2018': 'Interconnexion',
      'SENELEC Grid Code': 'Réseau Local',
    },
    iec61850: 'MMXU / MMTR',
    color: '#f59e0b' // amber-500
  }
};
// =================================================================================
// 3. COMPOSANTS ET LOGIQUE D'ANIMATION
// =================================================================================

const FlowAnimationDefs: React.FC<{ flowAnimation: boolean;
flowScenario: FlowScenarioType }> = React.memo(({ flowAnimation, flowScenario }) => {

  const getAnimationDuration = useCallback((scenario: FlowScenarioType, voltageLevel: VoltageLevel): string => {
    if (!flowAnimation) return 'none';

    // Vitesse ajustée pour un rendu dynamique
    if (scenario === 'PV_INJ') {
      return voltageLevel === 'DC' ? '0.7s' : voltageLevel === 'AC' ? '0.75s' : '0.8s';
    }
    if (scenario === 'BESS_DIS') {
      return voltageLevel === 'AC' ? '0.85s' : '0.9s';
    }
    if (scenario === 
'BESS_CHG') {
      return voltageLevel === 'AC' ? '1.4s' : '1.1s'; // Plus lent pour la charge
    }
    return '1s';
  }, [flowAnimation]);

  if (!flowAnimation) return null;

  // Création d'un dégradé animé
  const createGradient = (id: string, color: string, duration: string, reverse: boolean = false): React.ReactElement => (
    <linearGradient key={id} id={id} x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform={reverse ? "rotate(180)" : ""}>
      <stop offset="0%" stopColor={color} stopOpacity="0">
        <animate attributeName="offset" values="0;1;0" dur={duration} repeatCount="indefinite" />
   
    </stop>
      <stop offset="30%" stopColor={color} stopOpacity="0.6">
        <animate attributeName="offset" values="0.15;1.15;0.15" dur={duration} repeatCount="indefinite" />
      </stop>
      <stop offset="50%" stopColor={color} stopOpacity="1">
        <animate attributeName="offset" values="0.3;1.3;0.3" dur={duration} repeatCount="indefinite" />
      </stop>
      <stop offset="70%" stopColor={color} stopOpacity="0.6">
        <animate attributeName="offset" values="0.45;1.45;0.45" dur={duration} repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor={color} stopOpacity="0">
    
     <animate attributeName="offset" values="0.6;1.6;0.6" dur={duration} repeatCount="indefinite" />
      </stop>
    </linearGradient>
  );
const durDC = getAnimationDuration(flowScenario, 'DC');
  const durAC_Fwd = getAnimationDuration(flowScenario, 'AC');
  const durAC_Rev = getAnimationDuration(flowScenario, 'AC'); 
  const durMV = getAnimationDuration(flowScenario, 'MV');
return (
    <>
      {createGradient("flowGradientDC", components.pv.color, durDC)}
      {createGradient("flowGradientAC_Fwd", components.onduleurs.color, durAC_Fwd)}
      {/* flowGradientAC_Rev est pour le chemin de charge BESS (TGBT -> BESS) */}
      {createGradient("flowGradientAC_Rev", components.bess.color, durAC_Rev, true)}
      {createGradient("flowGradientMV", components.posteMV.color, durMV)}
    </>
  );
});

FlowAnimationDefs.displayName = 'FlowAnimationDefs';

const AnimatedLine: React.FC<AnimatedLineProps> = ({
  path,
  color,
  voltageLevel,
  flowScenario,
  flowAnimation,
  flowRole,
  reverse = false,
  strokeWidth = 5,
  markerEndId // Nouvelle prop pour la tête de flèche
}) => {
  let gradientId: string = '';
let isActive: boolean = false;

  // --- LOGIQUE D'ACTIVATION DU FLUX ---
  if (flowAnimation) {
    if (voltageLevel === 'DC') {
      gradientId = 'flowGradientDC';
// DC est actif si PV injecte (injection ou charge BESS)
      isActive = (flowScenario === 'PV_INJ' || flowScenario === 'BESS_CHG');
} else if (voltageLevel === 'MV') {
      gradientId = 'flowGradientMV';
// MV est actif uniquement pour l'exportation vers le PCC
      isActive = (flowScenario === 'PV_INJ' || flowScenario === 'BESS_DIS');
} else if (voltageLevel === 'AC') {
      if (flowRole === 'bessPath') { // Ligne bidirectionnelle BESS
        if (flowScenario === 'BESS_CHG') {
          gradientId = 'flowGradientAC_Rev';
isActive = true;
        } else if (flowScenario === 'BESS_DIS') {
          gradientId = 'flowGradientAC_Fwd';
isActive = true;
        } else { // PV_INJ
          isActive = false;
// Pas de flux BESS
        }
      } else if (flowRole === 'pvSource') { // Ligne Onduleur -> TGBT
        gradientId = 'flowGradientAC_Fwd';
isActive = (flowScenario === 'PV_INJ' || flowScenario === 'BESS_DIS' || flowScenario === 'BESS_CHG');
} else if (flowRole === 'gridPath') { // Ligne TGBT -> Transfo -> PCC
        gradientId = 'flowGradientAC_Fwd';
// Actif si PV injecte ou BESS décharge. Inactif si BESS_CHG (le PV charge le BESS, pas le réseau).
isActive = (flowScenario === 'PV_INJ' || flowScenario === 'BESS_DIS');
      } else if (flowRole === 'auxLoad') {
        gradientId = 'flowGradientAC_Fwd';
isActive = true; // Les auxiliaires sont toujours alimentés
      }
    }
  }

  const isPath = path.includes('M') ||
path.includes('L') || path.includes('C');
  const baseStroke = strokeWidth;
  const animStroke = baseStroke * 1.8;
  const LineComponent = isPath ?
'path' : 'line';

  // Helper pour extraire les coordonnées d'une chaîne de ligne simple ("x1 y1 x2 y2")
  const getLineCoords = () => {
    // Nettoyage de la chaîne et conversion en nombres
    const parts = path.split(/\s+/).map(str => parseFloat(str)).filter(n => !isNaN(n));
if (LineComponent === 'line' && parts.length >= 4) {
      // Assumer le format 'x1 y1 x2 y2'
      return { x1: parts[0], y1: parts[1], x2: parts[2], y2: parts[3] };
}
    return {};
  };

  // --- Ligne de fond (Structure) ---
  const baseProps: Record<string, any> = {
    stroke: color,
    strokeWidth: baseStroke,
    fill: "none",
    opacity: 1,
  };
if (isPath) {
    baseProps.d = path;
  } else {
    Object.assign(baseProps, getLineCoords());
}

  // Appliquer le marqueur de fin à la ligne de base si l'animation est OFF
  if (markerEndId && !flowAnimation) {
    baseProps.markerEnd = `url(#${markerEndId})`;
}


  // --- Ligne animée (Flux) ---
  const animProps: Record<string, any> = {
    stroke: `url(#${
      flowRole === 'bessPath' && flowScenario === 'BESS_CHG' ? 'flowGradientAC_Rev' : 'flowGradientAC_Fwd'
    })`,
    strokeWidth: animStroke,
    fill: "none",
    opacity: 0.9,
    filter: "url(#glow)",
  };
// Appliquer le marqueur de fin dynamiquement
  if (markerEndId && flowAnimation && isActive) {
      if (flowRole === 'bessPath') {
          // Utilise le marqueur inverse pour la charge
          animProps.markerEnd = `url(#${flowScenario === 'BESS_CHG' ? 'arrowAC_Rev' : 'arrowAC_Fwd'})`;
} else {
          // Utilise le marqueur par défaut (MV ou DC)
          animProps.markerEnd = `url(#${markerEndId})`;
}
  }


  if (isPath) {
    animProps.d = path;
} else {
    Object.assign(animProps, getLineCoords());
  }

  return (
    <g>
      {/* Ligne de fond (Structure) */}
      {React.createElement(LineComponent, baseProps)}

      {/* Ligne animée (Flux) */}
      {flowAnimation && isActive &&
        React.createElement(LineComponent, animProps)
      }
    </g>
  );
};

// =================================================================================
// 4. COMPOSANT PRINCIPAL (PlanUnifilairePiloteSolis)
// =================================================================================

const PlanUnifilairePiloteSolis: React.FC = () => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedComponent, setSelectedComponent] = useState<ComponentId | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<ComponentId | null>(null);
  const [flowAnimation, setFlowAnimation] = useState<boolean>(true);
  const [flowScenario, setFlowScenario] = useState<FlowScenarioType>('PV_INJ');
  const [activeLevel, setActiveLevel] = useState<LevelType>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); // ⬅️ MODIFICATION 1

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
// Télémétrie simulée (Dynamique selon le scénario)
  const telemetry: TelemetryData = useMemo(() => {
    let pvPower = 5.8;
    let bessPower = 0; // >0 discharge, <0 charge
    const auxLoad = 0.1; // Charge auxiliaire constante
    let gridPower = 0; // >0 export, <0 import

    if (flowScenario === 'BESS_DIS') {
      pvPower = 0.1; // PV très bas pour simuler nuit/nuage (alimentation auxiliaire)
      bessPower = 4.2; // Discharge from BESS
      gridPower 
= bessPower - auxLoad + pvPower; // BESS + PV fournissent au réseau et aux auxiliaires
    } else if (flowScenario === 'BESS_CHG') {
      bessPower = -3.5; // Charge BESS
      gridPower = pvPower + bessPower - auxLoad; // pvPower + (charge_bess_negative) - auxLoad
      if (gridPower < 0) gridPower = 0; // On ne veut pas importer du réseau ici
    } else { // PV_INJ
      bessPower = 0;
      gridPower = pvPower 
- auxLoad; // PV fournit au réseau et aux auxiliaires
    }

    return {
      pvPower: pvPower,
      bessPower: bessPower,
      gridPower: gridPower,
      bessSOC: 67,
      frequency: 50.02,
      voltage: 32.8
    };
}, [flowScenario]);

  const handleWheel = useCallback((e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.3), 3));
  }, []);
const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.button === 0) {
      setIsDragging(true);
setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); 
    }
  };
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
}
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
  };
const resetView = (): void => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
const handleSelectComponent = (id: ComponentId): void => {
      setSelectedComponent(prev => (prev === id ? null : id));
};

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
        svg.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            svg.removeEventListener('wheel', handleWheel);
        };
    }
  }, [handleWheel]);
  
  const activeComponentData: ComponentData | null = useMemo(() => {
    const activeId = selectedComponent || hoveredComponent;
    return activeId ? components[activeId] : null;
  }, [selectedComponent, hoveredComponent]);

  // Fonction pour afficher le panneau d'information du composant sélectionné
  const renderInfoPanel = (): React.ReactElement | null => {
    const comp = activeComponentData;
    if (!comp) return null;

    const IconComponent = comp.icon;
    const SpecEntries = Object.entries(comp.specs);
    const ComplianceEntries = Object.entries(comp.compliance || {});

    // Correction: On vérifie si les SpecEntries existent pour éviter un affichage vide
    if (SpecEntries.length === 0) return null;

    return (
      <div className="bg-gray-700 rounded-lg p-4 border border-cyan-500/30 shadow-lg">
        <h4 className="font-semibold mb-3 text-cyan-400 flex items-center gap-2">
          {/* L'utilisation de 'flex items-center gap-2' garantit l'alignement et l'espacement corrects */}
          <IconComponent size={20} />
          {comp.name}
        </h4>
        {comp.iec61850 && (
          <div className="text-xs bg-indigo-900/40 px-2 py-1 rounded mb-3 border border-indigo-500/30">
            <span className="text-indigo-300 font-medium">IEC 61850:</span>
            <span className="text-white ml-2">{comp.iec61850}</span>
          </div>
        )}
        <h5 className="font-semibold mt-3 mb-2 text-white text-sm">Spécifications Électriques</h5>
        <div className="space-y-1 bg-gray-600/50 p-2 rounded">
          {SpecEntries.map(([key, value]): React.ReactElement => (
            <div key={key} className="text-xs flex justify-between">
              <span className="text-gray-400">{key}:</span>
              <span className="ml-2 text-white font-medium text-right">{value}</span>
            </div>
          ))}
        </div>
        {ComplianceEntries.length > 0 && (
          <>
            <h5 className="font-semibold mt-4 mb-2 text-white text-sm">Conformité Normative</h5>
            <div className="space-y-1 bg-gray-600/50 p-2 rounded">
              {ComplianceEntries.map(([key, value]): React.ReactElement => (
                <div key={key} className="text-xs flex justify-between">
                  <span className="text-cyan-300">{key}:</span>
                  <span className="text-gray-300 ml-2 text-right">{value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Fonction pour créer un bloc de composant SVG
  const renderComponentBlock = (
    id: ComponentId, 
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    titleY: number, 
    detailY: number, 
    lineY?: number
  ): React.ReactElement => {
    const comp = components[id];
    const isSelected = selectedComponent === id;
    const isHovered = hoveredComponent === id;
    const IconComponent = comp.icon;
    
    // Logic to calculate text and icon positions
    const iconX = x + 15;
    const iconY = y + 15;
    const textX = x + w / 2;

    // Filter logic based on activeLevel
    const isLevelActive = (level: LevelType) => activeLevel === 'all' || activeLevel === level;
    
    let activeClass = '';
    if (comp.id === 'pv' || comp.id === 'combiner') activeClass = isLevelActive('dc') ? '' : 'opacity-20';
    if (comp.id === 'onduleurs' || comp.id === 'bess' || comp.id === 'tgbt') activeClass = isLevelActive('ac-bt') ? '' : 'opacity-20';
    if (comp.id === 'transfo' || comp.id === 'posteMV' || comp.id === 'pcc') activeClass = isLevelActive('ac-mv') ? '' : 'opacity-20';

    return (
      <g 
        key={id}
        className={`cursor-pointer transition-all duration-300 ${activeClass}`}
        onMouseEnter={() => setHoveredComponent(id)}
        onMouseLeave={() => setHoveredComponent(null)}
        onClick={() => handleSelectComponent(id)}
      >
        {/* Block Rectangle */}
        <rect 
          x={x} 
          y={y} 
          width={w} 
          height={h} 
          fill={comp.color} 
          opacity={0.15} 
          stroke={comp.color} 
          strokeWidth={isSelected || isHovered ? 4 : 1}
          rx="5"
          filter={isSelected || isHovered ? "url(#glow)" : "url(#componentShadow)"}
        />
        {/* Icone */}
        <IconComponent 
          x={iconX} 
          y={iconY} 
          size={24} 
          color={comp.color} 
          strokeWidth={1.5}
        />
        
        {/* Nom du composant */}
        <text 
          x={textX} 
          y={titleY} 
          textAnchor="middle" 
          fill="white" 
          fontSize="14" 
          fontWeight="bold"
        >
          {comp.name}
        </text>

        {/* Spécification clé */}
        <text 
          x={textX} 
          y={detailY} 
          textAnchor="middle" 
          fill={comp.color} 
          fontSize="10" 
          fontWeight="medium"
        >
          {comp.specs[Object.keys(comp.specs)[0]]}
        </text>

        {/* Représentation du Bus Bar pour TGBT */}
        {id === 'tgbt' && lineY && (
            <rect x={x + 10} y={lineY} width={w - 20} height={5} fill="#f59e0b" rx="2" />
        )}

      </g>
    );
  };
// =================================================================================

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900 text-white select-none">
      {/* Header avec titre et infos rapides */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Centrale Agrivoltaïque SOLIS™</h1>
            <p className="text-sm text-gray-400 mt-1">Pilote 6 MWc PV + 10 MWh BESS | Schéma Unifilaire | SEDHIOU, Sénégal</p>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-right">
              <div className="text-xs text-gray-400">Scénario de Flux</div>
              <div className="text-lg font-bold text-green-400">
                {flowScenario === 'PV_INJ' ? 'PV Injection (Max)' : flowScenario === 'BESS_DIS' ? 'BESS Décharge' : 'BESS Charge (PV)'}
              </div>
            </div>
            <div className="text-right bg-gray-700 px-4 py-2 rounded border border-cyan-500/30">
              <div className="text-xs text-gray-400">Tension PCC</div>
              <div className="text-lg font-bold text-cyan-400">{telemetry.voltage} kV</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* ⬇️ MODIFICATION 4: AJOUTER CET OVERLAY (visible uniquement quand sidebar ouverte sur mobile) ⬇️ */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-20"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Panneau latéral - OK: flex flex-col et overflow-hidden */}
        {/* MODIFICATION 3: Remplacer la classe pour le contrôle conditionnel et le positionnement mobile */}
        <div className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex md:w-80 w-80 bg-gray-800 border-r border-gray-700 flex-col overflow-hidden absolute md:relative z-30 h-full transition-transform`}>
          {/* Contenu du panneau latéral avec scrollbar - OK: flex-1 et overflow-y-auto */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info size={20} className="text-cyan-400" />
              Navigation & Télémétrie
              {/* ⬇️ MODIFICATION 5: AJOUTER CE BOUTON DE FERMETURE (visible uniquement sur mobile) ⬇️ */}
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden ml-auto text-gray-400 hover:text-white"
              >
                <ZoomOut size={20} />
              </button>
            </h3>

            {/* Télémétrie SCADA */}
            <div className="mb-6 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-4 border border-cyan-500/30 shadow-xl">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                <Activity size={16} /> Télémétrie Temps Réel
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-gray-900/50 px-2 py-1 rounded">
                  <span className="text-orange-400 flex items-center gap-1"><Power size={12}/> PV (DC)</span>
                  <span className="text-white font-bold">{telemetry.pvPower.toFixed(2)} MW</span>
                </div>
                <div className="flex justify-between items-center bg-gray-900/50 px-2 py-1 rounded">
                  <span className={`flex items-center gap-1 ${telemetry.bessPower > 0 ? 'text-green-400' : 'text-red-400'}`}><Battery size={12}/> BESS (AC)</span>
                  <span className={`font-bold ${telemetry.bessPower > 0 ? 'text-green-400' : 'text-red-400'}`}>{Math.abs(telemetry.bessPower).toFixed(2)} MW {telemetry.bessPower > 0 ? '(DIS)' : '(CHG)'}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-900/50 px-2 py-1 rounded">
                  <span className="text-cyan-400 flex items-center gap-1"><TrendingUp size={12}/> Réseau (PCC)</span>
                  <span className={`font-bold ${telemetry.gridPower > 0 ? 'text-cyan-400' : 'text-white'}`}>{telemetry.gridPower.toFixed(2)} MW {telemetry.gridPower > 0 ? '(EXPORT)' : '(N/A)'}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-900/50 px-2 py-1 rounded">
                  <span className="text-gray-400">SOC BESS</span>
                  <span className="text-white font-bold">{telemetry.bessSOC}%</span>
                </div>
                <div className="flex justify-between items-center bg-gray-900/50 px-2 py-1 rounded">
                  <span className="text-gray-400">Fréquence</span>
                  <span className="text-white font-bold">{telemetry.frequency.toFixed(2)} Hz</span>
                </div>
              </div>
            </div>

            {/* Contrôles de Flux */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block font-medium">Sélection Scénario de Flux</label>
              <div className="flex gap-2 mb-2">
                <button 
                  onClick={() => setFlowScenario('PV_INJ')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs transition-all font-medium ${
                    flowScenario === 'PV_INJ' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  PV → Réseau (Injection)
                </button>
                <button 
                  onClick={() => setFlowScenario('BESS_DIS')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs transition-all font-medium ${
                    flowScenario === 'BESS_DIS' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  BESS → Réseau
                </button>
              </div>
              <button 
                onClick={() => setFlowScenario('BESS_CHG')}
                className={`w-full px-2 py-1.5 rounded text-xs transition-all font-medium mb-2 ${
                  flowScenario === 'BESS_CHG' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                BESS ← PV (Charge)
              </button>
              <button 
                onClick={() => setFlowAnimation(!flowAnimation)}
                className={`w-full px-2 py-1.5 rounded text-xs border transition-colors flex items-center justify-center gap-1 font-medium ${
                  flowAnimation ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg' : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-300'
                }`}
              >
                <Repeat2 size={12} /> {flowAnimation ? 'Animation ON' : 'Animation OFF'}
              </button>
            </div>

            {/* Filtres de niveau */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block font-medium">Niveaux de tension</label>
              <div className="space-y-2">
                {(['all', 'dc', 'ac-bt', 'ac-mv'] as LevelType[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setActiveLevel(level)}
                    className={`w-full px-3 py-2 rounded text-sm transition-all font-medium ${
                      activeLevel === level ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {level === 'all' ? 'Tous les niveaux' : level === 'dc' ? 'DC (≤1500V)' : level === 'ac-bt' ? 'AC BT (400V)' : 'AC MV (33kV)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Panneau d'information du composant sélectionné */}
            {renderInfoPanel()}
            
            {/* Conformité Normative - suppression de mb-4 */}
            <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg mt-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} /> Normes & Standards
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Protection :</span>
                  <span className="text-gray-300 font-medium">IEC 61850</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Réseau :</span>
                  <span className="text-gray-300 font-medium">IEEE 1547-2018</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Installation :</span>
                  <span className="text-gray-300 font-medium">IEC 60364 / NFPA 855</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Espace principal du schéma (drag & zoom) */}
        <div 
          className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-gray-900"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves container
        >
          
          {/* Boutons de Zoom et Reset (Positionnés en haut à droite) */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button onClick={() => setZoom(z => Math.min(z * 1.2, 3))} className="bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-600 transition-colors">
              <ZoomIn size={20} />
            </button>
            <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.3))} className="bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-600 transition-colors">
              <ZoomOut size={20} />
            </button>
            <button onClick={resetView} className="bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-600 transition-colors">
              <Home size={20} />
            </button>
          </div>

          {/* ⬇️ MODIFICATION 2: AJOUTER CE BOUTON MENU (visible uniquement sur mobile) ⬇️ */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden absolute top-4 left-4 bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-600 transition-colors z-20"
          >
            <Settings size={20} />
          </button>

          <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            viewBox="0 0 1600 1000" 
            style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
            className="transition-transform duration-100 ease-out"
            onMouseEnter={() => setHoveredComponent(null)} // Clear hover state when entering SVG area
          >
            <FlowAnimationDefs flowAnimation={flowAnimation} flowScenario={flowScenario} />
            <defs>
              {/* Marqueurs de flèche pour indiquer la direction du flux */}
              <marker id="arrowDC" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#fb923c" />
              </marker>
              <marker id="arrowAC_Fwd" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
              </marker>
              {/* Marqueur de flux inverse (BESS Charge) - RefX ajusté à 1 pour la charge */}
              <marker id="arrowAC_Rev" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M9,0 L9,6 L0,3 z" fill="#10b981" />
              </marker>
              <marker id="arrowMV" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
              </marker>
              {/* Filtre de Glow (Halo au hover/select) */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feFlood floodColor="cyan" floodOpacity="0.8" result="color"/>
                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                <feMerge>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              {/* Filtre Soft Shadow (Micro-ombre) */}
              <filter id="componentShadow">
                <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5"/>
              </filter>
            </defs>

            {/* ======================================= */}
            {/* SCHÉMA UNIFILAIRE (Niveaux de tension) */}
            {/* ======================================= */}

            {/* NIVEAU 1: CHAMP PV & Combiner Boxes (DC) */}
            {(activeLevel === 'all' || activeLevel === 'dc') && (
              <g id="niveau-pv-dc">
                {/* Représentation simplifiée du champ PV */}
                {renderComponentBlock('pv', 200, 20, 200, 100, 50, 75)}

                {/* Bloc Combiner Box */}
                {renderComponentBlock('combiner', 220, 150, 160, 80, 180, 205)}

                {/* Ligne DC PV -> Combiner */}
                <AnimatedLine path="M 300 120 L 300 150" color={components.pv.color} voltageLevel="DC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="dcPath" />
                
                {/* Ligne DC Combiner -> Onduleurs */}
                <AnimatedLine path="M 300 230 L 300 370 L 400 370" color={components.pv.color} voltageLevel="DC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="pvSource" strokeWidth={5} markerEndId="arrowDC" />
              </g>
            )}

            {/* NIVEAU 2: Onduleurs et BESS (AC-BT 400V) */}
            {(activeLevel === 'all' || activeLevel === 'ac-bt') && (
              <g id="niveau-bt-400v">
                {/* Onduleurs PV Block */}
                {renderComponentBlock('onduleurs', 400, 300, 200, 140, 330, 385)}

                {/* BESS Block */}
                {renderComponentBlock('bess', 400, 550, 200, 140, 580, 635)}
                
                {/* Ligne AC Onduleurs -> TGBT Bus */}
                <AnimatedLine path="M 600 370 L 750 370" color={components.onduleurs.color} voltageLevel="AC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="pvSource" />

                {/* Ligne AC BESS (Bidirectionnelle) */}
                <AnimatedLine path="M 600 620 L 750 620 L 750 430 L 670 430" color={components.bess.color} voltageLevel="AC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="bessPath" />
                
                {/* TGBT Block avec Bus Bar */}
                {renderComponentBlock('tgbt', 750, 180, 180, 280, 210, 235, 320)}

                {/* Protection Q1 (Charge Auxiliaire) */}
                <g transform="translate(830, 340)">
                  <rect x="-5" y="0" width="10" height="12" fill="#ef4444" stroke="#ef4444" strokeWidth="1" />
                  <path d="M 5 0 L 8 6 L 5 12 Z" fill="#ef4444" />
                </g>
                <text x="830" y="365" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">Q1</text>
                <AnimatedLine path="M 830 320 L 830 340" color="#6366f1" voltageLevel="AC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="auxLoad" strokeWidth={2} />
                <AnimatedLine path="M 830 352 L 830 430" color="#6366f1" voltageLevel="AC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="auxLoad" strokeWidth={2} markerEndId="arrowAC_Fwd" />
                <text x="834" y="415" textAnchor="middle" fill="#6366f1" fontSize="10" fontWeight="bold">AUX LOAD</text>
                
                {/* Q2 Disjoncteur (TGBT -> Transfo) */}
                <g transform="translate(837, 280)">
                  <rect x="-5" y="-10" width="10" height="20" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="-5" y1="0" x2="5" y2="0" stroke="#000" strokeWidth="1"/>
                </g>
                <text x="837" y="265" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">Q2</text>

                {/* Ligne TGBT Bus -> Q2 -> Transfo */}
                <AnimatedLine path="M 837 320 L 837 300" color="#6366f1" voltageLevel="AC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="gridPath" />
                <AnimatedLine path="M 837 260 L 837 200 L 980 200" color="#6366f1" voltageLevel="AC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="gridPath" strokeWidth={5} />
              </g>
            )}

            {/* NIVEAU 3: Transformateur et Poste MV (AC-MV 33kV) */}
            {(activeLevel === 'all' || activeLevel === 'ac-mv') && (
              <g id="niveau-mv-33kv">
                {/* Transformateur Block */}
                {renderComponentBlock('transfo', 980, 130, 180, 180, 160, 220)}

                {/* Ligne Basse Tension (Secondaire Transfo) */}
                <AnimatedLine path="M 980 200 L 1160 200" color={components.transfo.color} voltageLevel="AC" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="gridPath" />

                {/* Poste MV 33kV Block */}
                {renderComponentBlock('posteMV', 1330, 200, 160, 160, 230, 260)}

                {/* Ligne Haute Tension (Primaire Transfo -> Poste MV) */}
                <AnimatedLine path="M 1160 220 L 1330 220" color={components.transfo.color} voltageLevel="MV" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="gridPath" />

                {/* Q4 Disjoncteur (Breaker/PTRC) */}
                <g transform="translate(1330, 280)">
                  <rect x="-15" y="-10" width="30" height="20" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="-15" y1="0" x2="15" y2="0" stroke="#000" strokeWidth="1"/>
                </g>
                <text x="1330" y="265" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">Q4</text>

                {/* Ligne MV du poste au PCC (Point de Connexion) */}
                <AnimatedLine path="M 1490 280 L 1550 280" color="#f59e0b" voltageLevel="MV" flowScenario={flowScenario} flowAnimation={flowAnimation} flowRole="gridPath" strokeWidth={5} />

                {/* Début de la Ligne Réseau/PCC (Point de Connexion) */}
                {renderComponentBlock('pcc', 1550, 250, 20, 60, 275, 295)}

              </g>
            )}

            {/* Légende du Schéma */}
            <text x="50" y="970" fill="#6b7280" fontSize="12" fontWeight="bold">
              PLAN UNIFILAIRE SIMPLIFIÉ | Centrale Agrivoltaïque
            </text>
            <text x="50" y="988" fill="#6b7280" fontSize="10">
              Pilote 6 MWc PV + 10 MWh BESS | DAC SEFA / Salikégné, SEDHIOU | Document Technique Exécution
            </text>
            <text x="1550" y="988" textAnchor="end" fill="#6b7280" fontSize="10">
              © SOLIS™ 2025. Tous droits réservés.
            </text>

          </svg>
        </div>
      </div>
      
      {/* Footer avec informations clés */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 flex justify-between items-center text-sm">
        <div className="flex gap-6">
          <div>
            <span className="text-gray-400">Onduleurs:</span>
            <span className="ml-2 text-white font-medium">19 × 330 kW = 6,27 MWac</span>
          </div>
          <div>
            <span className="text-gray-400">BESS:</span>
            <span className="ml-2 text-white font-medium">10 MWh / 6 MW PCS</span>
          </div>
          <div>
            <span className="text-gray-400">Transfo:</span>
            <span className="ml-2 text-white font-medium">7,5 MVA (0,4/33 kV)</span>
          </div>
        </div>
        <div className="text-sm text-right">
          <span className="text-gray-400">Statut:</span>
          <span className="text-green-400 font-bold"> PRODUCTION STABLE</span>
        </div>
      </div>
    </div>
  );
};

export default PlanUnifilairePiloteSolis;