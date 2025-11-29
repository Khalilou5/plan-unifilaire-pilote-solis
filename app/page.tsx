// ./app/page.tsx
"use client";
import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Home, Info, Power, Battery, Zap, Settings, Grid3x3, AlertTriangle } from 'lucide-react';

const UnifilaireSOLIS = () => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [hoveredComponent, setHoveredComponent] = useState(null);
  const [flowAnimation, setFlowAnimation] = useState(true);
  const [activeLevel, setActiveLevel] = useState('all');
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Données techniques des composants
  const components = {
    pv: {
      id: 'pv',
      name: 'Champ PV',
      icon: Power,
      specs: {
        'Puissance DC': '6,0 MWc',
        'Modules': 'Configuration optimisée',
        'Tension Max': '1500 V DC',
        'Strings': 'Multiple combiner boxes'
      },
      color: '#fb923c'
    },
    onduleurs: {
      id: 'onduleurs',
      name: 'Onduleurs PV',
      icon: Zap,
      specs: {
        'Modèle': '19 × Huawei SUN2000-330KTL-H1',
        'Puissance Totale': '6,27 MWac',
        'Ratio AC/DC': '1.045',
        'Tension DC Max': '1500 V',
        'Tension AC': '400 V (3ph)',
        'Rendement': '> 98,5%'
      },
      color: '#3b82f6'
    },
    bess: {
      id: 'bess',
      name: 'BESS 10 MWh',
      icon: Battery,
      specs: {
        'Capacité Totale': '10 MWh (2 × 5 MWh)',
        'PCS Continu': '6,0 MWac (2 × 3,0 MW)',
        'PCS Burst': '7,2 MWac (10 min)',
        'Autonomie': '~1,5h à pleine puissance',
        'Tension': '400 V AC'
      },
      color: '#10b981'
    },
    tgbt: {
      id: 'tgbt',
      name: 'TGBT 400V',
      icon: Grid3x3,
      specs: {
        'Tension Nominale': '400 V AC (3ph + N)',
        'Courant Bus': 'Dimensionné > 10 kA',
        'Protection': 'SPD Classe II',
        'Configuration': 'Départs PV + BESS + Charge'
      },
      color: '#6366f1'
    },
    transfo: {
      id: 'transfo',
      name: 'Transformateur Step-Up',
      icon: Settings,
      specs: {
        'Puissance': '7,5 MVA',
        'Tension': '0,4 kV / 33 kV',
        'Vector Group': 'Δ/Yy0',
        'OLTC': 'Oui (contrôle EMS)',
        'Justification': 'Δ piège harmoniques rang 3'
      },
      color: '#8b5cf6'
    },
    posteMV: {
      id: 'posteMV',
      name: 'Poste MV 33 kV',
      icon: AlertTriangle,
      specs: {
        'Tension': '33 kV',
        'Sectionneur': 'Q3 (AC Isolator + Earth Switch)',
        'Disjoncteur': 'Q4',
        'CT/VT': '1500/5A / 33kV/110V',
        'Protection': '50/51, 50N/51N, 67/67N, 27/59, 81U/O',
        'Comptage': 'Classe 0.2S (fiscal)'
      },
      color: '#14b8a6'
    },
    pcc: {
      id: 'pcc',
      name: 'PCC SENELEC',
      icon: Zap,
      specs: {
        'Puissance Injectable': '6,0 MWac (limite PPA)',
        'Tension': '33 kV',
        'THD': '< 5%',
        'Ramp Rate': '≤ 10% Pnom/min',
        'Grid Code': 'SENELEC + IEEE 1547',
        'Anti-Îlotage': 'Actif (LVRT/HVRT)'
      },
      color: '#f59e0b'
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.3), 3));
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      svg.addEventListener('wheel', handleWheel, { passive: false });
      return () => svg.removeEventListener('wheel', handleWheel);
    }
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Centrale Agrivoltaïque SOLIS™</h1>
            <p className="text-sm text-gray-400 mt-1">6 MWc PV + 10 MWh BESS | Schéma Unifilaire V8 | SEDHIOU, Sénégal</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <div className="text-xs text-gray-400">Injection Max (PPA)</div>
              <div className="text-lg font-bold text-green-400">6,0 MWac</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Tension MV</div>
              <div className="text-lg font-bold text-amber-400">33 kV</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Panneau latéral */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info size={20} className="text-cyan-400" />
              Navigation & Info
            </h3>

            {/* Filtres de niveau */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-2 block">Niveaux de tension</label>
              <div className="space-y-2">
                {['all', 'dc', 'ac-bt', 'ac-mv'].map(level => (
                  <button
                    key={level}
                    onClick={() => setActiveLevel(level)}
                    className={`w-full px-3 py-2 rounded text-sm transition-all ${
                      activeLevel === level
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {level === 'all' ? 'Tous les niveaux' : 
                     level === 'dc' ? 'DC (≤1500V)' :
                     level === 'ac-bt' ? 'AC BT (400V)' : 'AC MV (33kV)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Info composant sélectionné */}
            {(selectedComponent || hoveredComponent) && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4 border border-cyan-500/30">
                <h4 className="font-semibold mb-3 text-cyan-400 flex items-center gap-2">
                  {React.createElement(components[selectedComponent || hoveredComponent].icon, { size: 20 })}
                  {components[selectedComponent || hoveredComponent].name}
                </h4>
                <div className="space-y-2">
                  {Object.entries(components[selectedComponent || hoveredComponent].specs).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-gray-400">{key}:</span>
                      <span className="ml-2 text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Légende */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-gray-300">Légende</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-orange-500"></div>
                  <span>DC (≤1500V)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-blue-500"></div>
                  <span>AC BT (400V)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-green-500"></div>
                  <span>AC MV (33kV)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-gray-500 border-dashed border-t-2 border-gray-400"></div>
                  <span>SCADA/EMS</span>
                </div>
              </div>
            </div>

            {/* Caractéristiques système */}
            <div className="bg-gray-700 rounded-lg p-4 mt-4">
              <h4 className="font-semibold mb-3 text-gray-300">Protections & Grid Code</h4>
              <div className="space-y-2 text-xs">
                <div>✓ Anti-îlotage IEEE 1547 / VDE</div>
                <div>✓ LVRT/HVRT conforme SENELEC</div>
                <div>✓ Relais 67/67N (directionnel)</div>
                <div>✓ THD {'<'} 5% au PCC</div>
                <div>✓ Ramp Rate ≤ 10% Pnom/min</div>
                <div>✓ Mise à la terre TN-S (R ≤ 1Ω)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Zone de dessin SVG */}
        <div 
          className="flex-1 relative bg-gray-950"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* Contrôles de zoom */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button
              onClick={() => setZoom(z => Math.min(z * 1.2, 3))}
              className="bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-600 transition-colors"
            >
              <ZoomIn size={20} />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z * 0.8, 0.3))}
              className="bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-600 transition-colors"
            >
              <ZoomOut size={20} />
            </button>
            <button
              onClick={resetView}
              className="bg-gray-800 hover:bg-gray-700 p-2 rounded border border-gray-600 transition-colors"
            >
              <Home size={20} />
            </button>
            <button
              onClick={() => setFlowAnimation(!flowAnimation)}
              className={`p-2 rounded border transition-colors ${
                flowAnimation 
                  ? 'bg-cyan-600 border-cyan-500' 
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-600'
              }`}
            >
              <Zap size={20} />
            </button>
          </div>

          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox="0 0 1600 1000"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <defs>
              {/* Marqueurs pour les flèches */}
              <marker id="arrowDC" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#fb923c" />
              </marker>
              <marker id="arrowAC" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
              </marker>
              <marker id="arrowMV" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
              </marker>

              {/* Animation de flux */}
              {flowAnimation && (
                <>
                  <linearGradient id="flowGradientDC" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="0">
                      <animate attributeName="offset" values="0;1" dur="2s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopColor="#fb923c" stopOpacity="1">
                      <animate attributeName="offset" values="0;1" dur="2s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#fb923c" stopOpacity="0">
                      <animate attributeName="offset" values="0;1" dur="2s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>

                  <linearGradient id="flowGradientAC" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0">
                      <animate attributeName="offset" values="0;1" dur="1.5s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="1">
                      <animate attributeName="offset" values="0;1" dur="1.5s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0">
                      <animate attributeName="offset" values="0;1" dur="1.5s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>

                  <linearGradient id="flowGradientMV" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0">
                      <animate attributeName="offset" values="0;1" dur="1.8s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopColor="#10b981" stopOpacity="1">
                      <animate attributeName="offset" values="0;1" dur="1.8s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0">
                      <animate attributeName="offset" values="0;1" dur="1.8s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>
                </>
              )}
            </defs>

            {/* Grille de fond */}
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1f2937" strokeWidth="0.5" />
            </pattern>
            <rect width="1600" height="1000" fill="url(#grid)" />

            {/* NIVEAU 1: CHAMP PV */}
            {(activeLevel === 'all' || activeLevel === 'dc') && (
              <g id="niveau-pv">
                {/* Modules PV */}
                <g
                  onMouseEnter={() => setHoveredComponent('pv')}
                  onMouseLeave={() => setHoveredComponent(null)}
                  onClick={() => setSelectedComponent('pv')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect x="50" y="50" width="200" height="120" rx="8" fill="#1f2937" stroke="#fb923c" strokeWidth="2" />
                  <text x="150" y="85" textAnchor="middle" fill="#fb923c" fontSize="16" fontWeight="bold">
                    CHAMP PV
                  </text>
                  <text x="150" y="105" textAnchor="middle" fill="#fff" fontSize="14">
                    6,0 MWc DC
                  </text>
                  <text x="150" y="125" textAnchor="middle" fill="#9ca3af" fontSize="12">
                    Vmax 1500 V
                  </text>
                  <text x="150" y="145" textAnchor="middle" fill="#9ca3af" fontSize="11">
                    Multiple Strings
                  </text>
                </g>

                {/* Fusibles et Combiner */}
                <rect x="280" y="85" width="80" height="50" rx="4" fill="#374151" stroke="#fb923c" strokeWidth="1.5" />
                <text x="320" y="107" textAnchor="middle" fill="#fb923c" fontSize="11">Combiner</text>
                <text x="320" y="122" textAnchor="middle" fill="#9ca3af" fontSize="10">+ Fusibles</text>

                {/* Ligne DC vers onduleurs */}
                <line x1="250" y1="110" x2="280" y2="110" stroke="#fb923c" strokeWidth="3" markerEnd="url(#arrowDC)" />
                {flowAnimation && (
                  <line x1="250" y1="110" x2="280" y2="110" stroke="url(#flowGradientDC)" strokeWidth="3" opacity="0.8" />
                )}
              </g>
            )}

            {/* NIVEAU 2: ONDULEURS */}
            {(activeLevel === 'all' || activeLevel === 'dc' || activeLevel === 'ac-bt') && (
              <g id="niveau-onduleurs">
                <g
                  onMouseEnter={() => setHoveredComponent('onduleurs')}
                  onMouseLeave={() => setHoveredComponent(null)}
                  onClick={() => setSelectedComponent('onduleurs')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect x="400" y="50" width="220" height="160" rx="8" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="3" />
                  <text x="510" y="80" textAnchor="middle" fill="#3b82f6" fontSize="16" fontWeight="bold">
                    ONDULEURS PV
                  </text>
                  <text x="510" y="105" textAnchor="middle" fill="#fff" fontSize="14">
                    19 × Huawei 330KTL-H1
                  </text>
                  <text x="510" y="125" textAnchor="middle" fill="#dbeafe" fontSize="13">
                    6,27 MWac Total
                  </text>
                  <text x="510" y="145" textAnchor="middle" fill="#9ca3af" fontSize="11">
                    Ratio AC/DC: 1.045
                  </text>
                  <text x="510" y="165" textAnchor="middle" fill="#9ca3af" fontSize="11">
                    DC 1500V → AC 400V
                  </text>
                  <text x="510" y="185" textAnchor="middle" fill="#10b981" fontSize="10">
                    η {'>'} 98,5%
                  </text>
                </g>

                {/* Ligne DC vers onduleurs */}
                <line x1="360" y1="110" x2="400" y2="110" stroke="#fb923c" strokeWidth="3" markerEnd="url(#arrowDC)" />
                {flowAnimation && (
                  <line x1="360" y1="110" x2="400" y2="110" stroke="url(#flowGradientDC)" strokeWidth="3" opacity="0.8" />
                )}

                {/* Parafoudre DC */}
                <g transform="translate(380, 85)">
                  <path d="M 0 0 L 5 10 L -5 10 Z" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1" />
                  <text x="0" y="25" textAnchor="middle" fill="#fbbf24" fontSize="9">SPD</text>
                </g>
              </g>
            )}

            {/* NIVEAU 3: BESS */}
            {(activeLevel === 'all' || activeLevel === 'ac-bt') && (
              <g id="niveau-bess">
                <g
                  onMouseEnter={() => setHoveredComponent('bess')}
                  onMouseLeave={() => setHoveredComponent(null)}
                  onClick={() => setSelectedComponent('bess')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect x="400" y="280" width="220" height="180" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="3" />
                  <text x="510" y="310" textAnchor="middle" fill="#10b981" fontSize="16" fontWeight="bold">
                    BESS
                  </text>
                  <text x="510" y="335" textAnchor="middle" fill="#fff" fontSize="14">
                    10 MWh (2 × 5 MWh)
                  </text>
                  <text x="510" y="360" textAnchor="middle" fill="#d1fae5" fontSize="13">
                    PCS: 6,0 MWac
                  </text>
                  <text x="510" y="380" textAnchor="middle" fill="#9ca3af" fontSize="11">
                    (2 × 3,0 MW)
                  </text>
                  <text x="510" y="400" textAnchor="middle" fill="#9ca3af" fontSize="11">
                    Burst: 7,2 MWac (10min)
                  </text>
                  <text x="510" y="420" textAnchor="middle" fill="#9ca3af" fontSize="11">
                    Autonomie: ~1,5h
                  </text>
                  <text x="510" y="440" textAnchor="middle" fill="#10b981" fontSize="10">
                    400V AC Output
                  </text>
                </g>
              </g>
            )}

            {/* NIVEAU 4: TGBT 400V */}
            {(activeLevel === 'all' || activeLevel === 'ac-bt') && (
              <g id="niveau-tgbt">
                <g
                  onMouseEnter={() => setHoveredComponent('tgbt')}
                  onMouseLeave={() => setHoveredComponent(null)}
                  onClick={() => setSelectedComponent('tgbt')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect x="700" y="180" width="180" height="200" rx="8" fill="#312e81" stroke="#6366f1" strokeWidth="3" />
                  <text x="790" y="210" textAnchor="middle" fill="#6366f1" fontSize="16" fontWeight="bold">
                    TGBT
                  </text>
                  <text x="790" y="235" textAnchor="middle" fill="#fff" fontSize="14">
                    400 V AC
                  </text>
                  <text x="790" y="255" textAnchor="middle" fill="#c7d2fe" fontSize="12">
                    Bus Principal
                  </text>
                  
                  {/* Départs */}
                  <line x1="720" y1="280" x2="860" y2="280" stroke="#6366f1" strokeWidth="8" />
                  <text x="790" y="305" textAnchor="middle" fill="#9ca3af" fontSize="10">
                    Q1: Charge 20%
                  </text>
                  <text x="790" y="325" textAnchor="middle" fill="#9ca3af" fontSize="10">
                    Q2: Vers Transfo
                  </text>
                  <text x="790" y="345" textAnchor="middle" fill="#9ca3af" fontSize="10">
                    SPD Classe II
                  </text>
                  <text x="790" y="365" textAnchor="middle" fill="#10b981" fontSize="9">
                    Icc {'>'} 10 kA
                  </text>
                </g>

                {/* Lignes AC BT vers TGBT */}
                {/* Depuis Onduleurs */}
                <path d="M 620 130 L 670 130 L 670 280 L 700 280" stroke="#3b82f6" strokeWidth="3" fill="none" markerEnd="url(#arrowAC)" />
                {flowAnimation && (
                  <path d="M 620 130 L 670 130 L 670 280 L 700 280" stroke="url(#flowGradientAC)" strokeWidth="3" fill="none" opacity="0.8" />
                )}

                {/* Depuis BESS */}
                <line x1="620" y1="370" x2="700" y2="370" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowAC)" />
                {flowAnimation && (
                  <line x1="620" y1="370" x2="700" y2="370" stroke="url(#flowGradientAC)" strokeWidth="3" opacity="0.8" />
                )}

                {/* Charge agricole Q1 */}
                <g>
                  <path d="M 790 380 L 790 450" stroke="#6366f1" strokeWidth="2" strokeDasharray="4,4" />
                  <rect x="750" y="450" width="80" height="40" rx="4" fill="#374151" stroke="#6366f1" strokeWidth="1.5" />
                  <text x="790" y="475" textAnchor="middle" fill="#9ca3af" fontSize="11">Charge</text>
                </g>
              </g>
            )}

            {/* NIVEAU 5: TRANSFORMATEUR */}
            {(activeLevel === 'all' || activeLevel === 'ac-bt' || activeLevel === 'ac-mv') && (
              <g id="niveau-transfo">
                <g
                  onMouseEnter={() => setHoveredComponent('transfo')}
                  onMouseLeave={() => setHoveredComponent(null)}
                  onClick={() => setSelectedComponent('transfo')}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Symbole transformateur */}
                  <circle cx="1000" cy="280" r="70" fill="#581c87" stroke="#8b5cf6" strokeWidth="3" />
                  <circle cx="980" cy="280" r="35" fill="none" stroke="#a78bfa" strokeWidth="2" />
                  <circle cx="1020" cy="280" r="35" fill="none" stroke="#a78bfa" strokeWidth="2" />
                  
                  <text x="1000" y="240" textAnchor="middle" fill="#8b5cf6" fontSize="15" fontWeight="bold">
                    TRANSFO
                  </text>
                  <text x="1000" y="270" textAnchor="middle" fill="#fff" fontSize="13">
                    7,5 MVA
                  </text>
                  <text x="1000" y="290" textAnchor="middle" fill="#c4b5fd" fontSize="12">
                    Δ/Yy0
                  </text>
                  <text x="1000" y="310" textAnchor="middle" fill="#9ca3af" fontSize="10">
                    0,4/33 kV
                  </text>
                  <text x="1000" y="330" textAnchor="middle" fill="#10b981" fontSize="9">
                    OLTC (EMS)
                  </text>
                </g>

                {/* Ligne AC BT vers Transfo */}
                <line x1="880" y1="280" x2="930" y2="280" stroke="#3b82f6" strokeWidth="4" markerEnd="url(#arrowAC)" />
                {flowAnimation && (
                  <line x1="880" y1="280" x2="930" y2="280" stroke="url(#flowGradientAC)" strokeWidth="4" opacity="0.8" />
                )}

                {/* Annotation Vector Group */}
                <g transform="translate(1000, 360)">
                  <rect x="-80" y="0" width="160" height="35" rx="4" fill="#1f2937" stroke="#8b5cf6" strokeWidth="1" />
                  <text x="0" y="15" textAnchor="middle" fill="#a78bfa" fontSize="9">
                    Δ piège harmoniques 3
                  </text>
                  <text x="0" y="27" textAnchor="middle" fill="#9ca3af" fontSize="8">
                    Yy0 neutre stable
                  </text>
                </g>
              </g>
            )}

            {/* NIVEAU 6: POSTE MV 33kV */}
            {(activeLevel === 'all' || activeLevel === 'ac-mv') && (
              <g id="niveau-posteMV">
                <g
                  onMouseEnter={() => setHoveredComponent('posteMV')}
                  onMouseLeave={() => setHoveredComponent(null)}
                  onClick={() => setSelectedComponent('posteMV')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect x="1150" y="150" width="240" height="260" rx="8" fill="#134e4a" stroke="#14b8a6" strokeWidth="3" />
                  <text x="1270" y="180" textAnchor="middle" fill="#14b8a6" fontSize="16" fontWeight="bold">
                    POSTE MV 33 kV
                  </text>

                  {/* Sectionneur Q3 */}
                  <g transform="translate(1180, 200)">
                    <rect x="0" y="0" width="60" height="35" rx="3" fill="#374151" stroke="#14b8a6" strokeWidth="1.5" />
                    <text x="30" y="15" textAnchor="middle" fill="#14b8a6" fontSize="11">Q3</text>
                    <text x="30" y="28" textAnchor="middle" fill="#9ca3af" fontSize="8">Isolator</text>
                  </g>

                  {/* Disjoncteur Q4 */}
                  <g transform="translate(1270, 200)">
                    <rect x="0" y="0" width="60" height="35" rx="3" fill="#374151" stroke="#ef4444" strokeWidth="2" />
                    <text x="30" y="15" textAnchor="middle" fill="#ef4444" fontSize="11">Q4</text>
                    <text x="30" y="28" textAnchor="middle" fill="#9ca3af" fontSize="8">Breaker</text>
                  </g>

                  {/* CT/VT */}
                  <g transform="translate(1180, 250)">
                    <rect x="0" y="0" width="160" height="30" rx="3" fill="#1f2937" stroke="#fbbf24" strokeWidth="1.5" />
                    <text x="80" y="12" textAnchor="middle" fill="#fbbf24" fontSize="10">CT: 1500/5A</text>
                    <text x="80" y="24" textAnchor="middle" fill="#fbbf24" fontSize="10">VT: 33kV/110V</text>
                  </g>

                  {/* Relais de protection */}
                  <g transform="translate(1160, 295)">
                    <rect x="0" y="0" width="200" height="80" rx="4" fill="#1e293b" stroke="#14b8a6" strokeWidth="1.5" />
                    <text x="100" y="18" textAnchor="middle" fill="#14b8a6" fontSize="11" fontWeight="bold">
                      Protections ANSI
                    </text>
                    <text x="100" y="35" textAnchor="middle" fill="#9ca3af" fontSize="9">
                      50/51 | 50N/51N
                    </text>
                    <text x="100" y="50" textAnchor="middle" fill="#9ca3af" fontSize="9">
                      67/67N (Directionnel)
                    </text>
                    <text x="100" y="65" textAnchor="middle" fill="#9ca3af" fontSize="9">
                      27/59 | 81U/O
                    </text>
                  </g>

                  {/* Comptage fiscal */}
                  <g transform="translate(1190, 385)">
                    <rect x="0" y="0" width="140" height="20" rx="3" fill="#065f46" stroke="#10b981" strokeWidth="1.5" />
                    <text x="70" y="14" textAnchor="middle" fill="#10b981" fontSize="9">
                      Compteur 0.2S (Fiscal)
                    </text>
                  </g>
                </g>

                {/* Ligne MV du transfo au poste */}
                <line x1="1070" y1="280" x2="1150" y2="280" stroke="#10b981" strokeWidth="5" markerEnd="url(#arrowMV)" />
                {flowAnimation && (
                  <line x1="1070" y1="280" x2="1150" y2="280" stroke="url(#flowGradientMV)" strokeWidth="5" opacity="0.8" />
                )}

                {/* Parafoudre MV */}
                <g transform="translate(1110, 255)">
                  <path d="M 0 0 L 7 15 L -7 15 Z" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1.5" />
                  <text x="0" y="32" textAnchor="middle" fill="#fbbf24" fontSize="9">SPD MV</text>
                </g>
              </g>
            )}

            {/* NIVEAU 7: PCC SENELEC */}
            {(activeLevel === 'all' || activeLevel === 'ac-mv') && (
              <g id="niveau-pcc">
                <g
                  onMouseEnter={() => setHoveredComponent('pcc')}
                  onMouseLeave={() => setHoveredComponent(null)}
                  onClick={() => setSelectedComponent('pcc')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect x="1450" y="200" width="120" height="160" rx="8" fill="#78350f" stroke="#f59e0b" strokeWidth="3" />
                  <text x="1510" y="230" textAnchor="middle" fill="#f59e0b" fontSize="16" fontWeight="bold">
                    PCC
                  </text>
                  <text x="1510" y="255" textAnchor="middle" fill="#fff" fontSize="13">
                    33 kV
                  </text>
                  <text x="1510" y="280" textAnchor="middle" fill="#fde68a" fontSize="12">
                    Pmax: 6,0 MWac
                  </text>
                  <text x="1510" y="300" textAnchor="middle" fill="#9ca3af" fontSize="10">
                    Limite PPA
                  </text>
                  <text x="1510" y="320" textAnchor="middle" fill="#9ca3af" fontSize="9">
                    THD {'<'} 5%
                  </text>
                  <text x="1510" y="335" textAnchor="middle" fill="#9ca3af" fontSize="9">
                    Ramp ≤10%/min
                  </text>
                  <text x="1510" y="350" textAnchor="middle" fill="#10b981" fontSize="8">
                    LVRT/HVRT OK
                  </text>
                </g>

                {/* Ligne MV du poste au PCC */}
                <line x1="1390" y1="280" x2="1450" y2="280" stroke="#10b981" strokeWidth="5" markerEnd="url(#arrowMV)" />
                {flowAnimation && (
                  <line x1="1390" y1="280" x2="1450" y2="280" stroke="url(#flowGradientMV)" strokeWidth="5" opacity="0.8" />
                )}
              </g>
            )}

            {/* NIVEAU 8: RÉSEAU SENELEC */}
            <g id="reseau-senelec">
              <g transform="translate(1510, 410)">
                <path d="M -30 0 L 30 0 M -20 10 L 20 10 M -10 20 L 10 20" stroke="#f59e0b" strokeWidth="4" />
                <text x="0" y="45" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">
                  RÉSEAU SENELEC
                </text>
                <text x="0" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">
                  33 kV - 50 Hz
                </text>
              </g>

              <line x1="1510" y1="360" x2="1510" y2="410" stroke="#10b981" strokeWidth="5" markerEnd="url(#arrowMV)" />
              {flowAnimation && (
                <line x1="1510" y1="360" x2="1510" y2="410" stroke="url(#flowGradientMV)" strokeWidth="5" opacity="0.8" />
              )}
            </g>

            {/* SYSTÈME SCADA/EMS */}
            <g id="scada-ems">
              <rect x="100" y="600" width="1400" height="120" rx="8" fill="#18181b" stroke="#6b7280" strokeWidth="2" strokeDasharray="8,4" />
              <text x="800" y="630" textAnchor="middle" fill="#6b7280" fontSize="16" fontWeight="bold">
                SCADA / EMS (Smart Logger) - IEC 61850
              </text>
              
              <g transform="translate(200, 650)">
                <text x="0" y="0" fill="#9ca3af" fontSize="11">• Écrêtement: P ≤ 6,0 MWac</text>
                <text x="300" y="0" fill="#9ca3af" fontSize="11">• Régulation Q/V</text>
                <text x="550" y="0" fill="#9ca3af" fontSize="11">• OLTC Control</text>
                <text x="800" y="0" fill="#9ca3af" fontSize="11">• Inertie Synthétique</text>
                <text x="1050" y="0" fill="#9ca3af" fontSize="11">• Plan Blackout</text>
              </g>

              <g transform="translate(200, 680)">
                <text x="0" y="0" fill="#9ca3af" fontSize="11">• Anti-îlotage actif</text>
                <text x="300" y="0" fill="#9ca3af" fontSize="11">• Ramp Rate Limit</text>
                <text x="550" y="0" fill="#9ca3af" fontSize="11">• PF Control</text>
                <text x="800" y="0" fill="#9ca3af" fontSize="11">• Monitoring THD</text>
                <text x="1050" y="0" fill="#9ca3af" fontSize="11">• Grid Support</text>
              </g>

              {/* Lignes de communication */}
              <line x1="150" y1="170" x2="150" y2="600" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
              <line x1="510" y1="210" x2="510" y2="600" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
              <line x1="510" y1="370" x2="510" y2="600" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
              <line x1="790" y1="280" x2="790" y2="600" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
              <line x1="1000" y1="350" x2="1000" y2="600" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
              <line x1="1270" y1="410" x2="1270" y2="600" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
            </g>

            {/* SYSTÈME DE MISE À LA TERRE */}
            <g id="mise-terre">
              <g transform="translate(100, 800)">
                <rect x="0" y="0" width="350" height="80" rx="6" fill="#1f2937" stroke="#10b981" strokeWidth="2" />
                <text x="175" y="25" textAnchor="middle" fill="#10b981" fontSize="14" fontWeight="bold">
                  MISE À LA TERRE - TN-S
                </text>
                <text x="175" y="45" textAnchor="middle" fill="#9ca3af" fontSize="11">
                  Résistance Cible: R ≤ 1 Ω
                </text>
                <text x="175" y="62" textAnchor="middle" fill="#9ca3af" fontSize="10">
                  Séparation N/PE après transfo
                </text>
              </g>

              {/* Symboles de terre */}
              {[
                { x: 150, y: 170 },
                { x: 510, y: 210 },
                { x: 510, y: 460 },
                { x: 790, y: 490 },
                { x: 1000, y: 360 },
                { x: 1270, y: 410 }
              ].map((pos, idx) => (
                <g key={idx} transform={`translate(${pos.x}, ${pos.y})`}>
                  <line x1="0" y1="0" x2="0" y2="20" stroke="#10b981" strokeWidth="2" />
                  <line x1="-12" y1="20" x2="12" y2="20" stroke="#10b981" strokeWidth="2" />
                  <line x1="-8" y1="25" x2="8" y2="25" stroke="#10b981" strokeWidth="2" />
                  <line x1="-4" y1="30" x2="4" y2="30" stroke="#10b981" strokeWidth="2" />
                </g>
              ))}
            </g>

            {/* ANNOTATIONS TECHNIQUES */}
            <g id="annotations">
              {/* Ratio AC/DC */}
              <g transform="translate(500, 30)">
                <rect x="0" y="0" width="140" height="30" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
                <text x="70" y="20" textAnchor="middle" fill="#3b82f6" fontSize="10">
                  Ratio AC/DC: 1.045
                </text>
              </g>

              {/* Capacité BESS */}
              <g transform="translate(430, 470)">
                <rect x="0" y="0" width="150" height="30" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                <text x="75" y="20" textAnchor="middle" fill="#10b981" fontSize="10">
                  Burst: 1.2×Pnom (10min)
                </text>
              </g>

              {/* Marge Transformateur */}
              <g transform="translate(960, 400)">
                <rect x="0" y="0" width="140" height="30" rx="4" fill="#581c87" stroke="#8b5cf6" strokeWidth="1" />
                <text x="70" y="20" textAnchor="middle" fill="#8b5cf6" fontSize="10">
                  Marge: 1.25×PAC
                </text>
              </g>
            </g>

            {/* LÉGENDE DES TENSIONS */}
            <g id="legende-tensions" transform="translate(1150, 550)">
              <rect x="0" y="0" width="200" height="120" rx="6" fill="#1f2937" stroke="#6b7280" strokeWidth="2" />
              <text x="100" y="25" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">
                Niveaux de Tension
              </text>
              
              <line x1="20" y1="45" x2="60" y2="45" stroke="#fb923c" strokeWidth="3" />
              <text x="70" y="50" fill="#9ca3af" fontSize="11">DC: ≤ 1500 V</text>

              <line x1="20" y1="65" x2="60" y2="65" stroke="#3b82f6" strokeWidth="3" />
              <text x="70" y="70" fill="#9ca3af" fontSize="11">AC BT: 400 V</text>

              <line x1="20" y1="85" x2="60" y2="85" stroke="#10b981" strokeWidth="3" />
              <text x="70" y="90" fill="#9ca3af" fontSize="11">AC MV: 33 kV</text>

              <line x1="20" y1="105" x2="60" y2="105" stroke="#6b7280" strokeWidth="2" strokeDasharray="4,4" />
              <text x="70" y="110" fill="#9ca3af" fontSize="11">SCADA/EMS</text>
            </g>

            {/* INDICATEURS DE PERFORMANCE */}
            <g id="indicateurs" transform="translate(1150, 690)">
              <rect x="0" y="0" width="200" height="100" rx="6" fill="#1f2937" stroke="#f59e0b" strokeWidth="2" />
              <text x="100" y="25" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">
                Conformité Grid Code
              </text>
              
              <text x="20" y="45" fill="#10b981" fontSize="10">✓ IEEE 1547</text>
              <text x="20" y="60" fill="#10b981" fontSize="10">✓ VDE-AR-N 4110</text>
              <text x="20" y="75" fill="#10b981" fontSize="10">✓ SENELEC Grid Code</text>
              <text x="20" y="90" fill="#10b981" fontSize="10">✓ IEC 61850 (SCADA)</text>
            </g>

            {/* VERSION & SIGNATURE */}
            <text x="50" y="970" fill="#6b7280" fontSize="12" fontWeight="bold">
              Schéma Unifilaire V8 - SOLIS™ Agrivoltaïque
            </text>
            <text x="50" y="988" fill="#6b7280" fontSize="10">
              6 MWc PV + 10 MWh BESS | DAC SEFA / Salikégné, SEDHIOU | Document Technique Exécution
            </text>
            <text x="1550" y="988" textAnchor="end" fill="#6b7280" fontSize="10">
              Design: Bureau d'Études SOLIS | 2025
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
            <span className="ml-2 text-white font-medium">7,5 MVA Δ/Yy0</span>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
          <span>|</span>
          <span>Animation: {flowAnimation ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    </div>
  );
};

export default UnifilaireSOLIS;
