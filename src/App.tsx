import { useState, useRef, useEffect } from 'react';
import { useLightstick } from './hooks/useLightstick';

// Tipagem do passo do loop
interface ColorStep {
  id: string;
  hex: string;
  delayMs: number;
}

// 1. Dicionário de Templates (Fácil de expandir via código!)
const TEMPLATES: Record<string, ColorStep[]> = {
  Rainbow: [
    { id: crypto.randomUUID(), hex: '#FF0000', delayMs: 500 },
    { id: crypto.randomUUID(), hex: '#FF7F00', delayMs: 500 },
    { id: crypto.randomUUID(), hex: '#FFFF00', delayMs: 500 },
    { id: crypto.randomUUID(), hex: '#00FF00', delayMs: 500 },
    { id: crypto.randomUUID(), hex: '#0000FF', delayMs: 500 },
    { id: crypto.randomUUID(), hex: '#4B0082', delayMs: 500 },
    { id: crypto.randomUUID(), hex: '#8B00FF', delayMs: 500 },
  ],
  Police: [
    { id: crypto.randomUUID(), hex: '#FF0000', delayMs: 250 },
    { id: crypto.randomUUID(), hex: '#0000FF', delayMs: 250 },
  ],
  Pulsar: [
    { id: crypto.randomUUID(), hex: '#FFFFFF', delayMs: 250 },
    { id: crypto.randomUUID(), hex: '#000000', delayMs: 900 },
  ]
};

export default function App() {
  const { isConnected, model, connect, sendColor } = useLightstick();
  
  // Estados da Cor Única
  const [currentColor, setCurrentColor] = useState('#00FF00');
  const lastSendTime = useRef<number>(0); // Ref para o Throttle do Bluetooth
  
  // Estados do Loop
  const [sequence, setSequence] = useState<ColorStep[]>(TEMPLATES['Rainbow']);
  const [isLooping, setIsLooping] = useState(false);
  const loopActiveRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // --- LÓGICA DA COR ÚNICA EM TEMPO REAL ---
  const handleColorChange = async (newColor: string) => {
    setCurrentColor(newColor);
    
    if (isLooping) toggleLoop();
    const now = Date.now();

    if (now - lastSendTime.current > 50) {
      lastSendTime.current = now;
      await sendColor(newColor);
    }
  };

  // --- LÓGICA DO FORMULÁRIO DINÂMICO ---
  const handleTemplateChange = (templateName: string) => {
    if (isLooping) toggleLoop();
    setSequence([...TEMPLATES[templateName]]); // Clona o array para evitar mutação do original
  };

  const addStep = () => {
    setSequence([...sequence, { id: crypto.randomUUID(), hex: '#FFFFFF', delayMs: 500 }]);
  };

  const removeStep = (idToRemove: string) => {
    setSequence(sequence.filter(step => step.id !== idToRemove));
  };

  const updateStep = (id: string, field: keyof ColorStep, value: string | number) => {
    setSequence(sequence.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  // --- LÓGICA DO LOOP ---
  const runLoop = async (currentIndex: number) => {
    if (!loopActiveRef.current || sequence.length === 0) return;

    const step = sequence[currentIndex];
    
    // Marca exatamente a que horas começamos a enviar a cor
    const startTime = performance.now();

    await sendColor(step.hex);
    console.log(step.hex)

    // Se o usuário clicou em Parar DURANTE o tempo que o Bluetooth 
    // levou para responder, abortamos antes de agendar o próximo!
    if (!loopActiveRef.current) return;

    const nextIndex = (currentIndex + 1) % sequence.length;
    
    // Descobre quanto tempo o Bluetooth levou para processar
    const elapsedTime = performance.now() - startTime;
    
    // Subtrai o tempo do Bluetooth do delay desejado.

    const exactWaitTime = Math.max(0, step.delayMs - elapsedTime);

    timeoutRef.current = setTimeout(() => {
      runLoop(nextIndex);
    }, exactWaitTime);
  };

  const toggleLoop = () => {
    if (isLooping) {
      loopActiveRef.current = false;
      setIsLooping(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      loopActiveRef.current = true;
      setIsLooping(true);
      runLoop(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 flex flex-col gap-8">
      <header className="border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-white">Bora Controller</h1>
        <p className="text-gray-400 mt-2">
          Status: {isConnected ? <span className="text-green-400">Conectado ({model})</span> : <span className="text-red-400">Desconectado</span>}
        </p>
        {!isConnected && (
          <button onClick={connect} className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded font-medium transition-colors">
            Parear Lightstick
          </button>
        )}
      </header>

      {/* Controle de Cor em Tempo Real */}
      <section className="bg-gray-900 p-6 rounded-lg border border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Cor Manual (Tempo Real)</h2>
        <div className="flex items-center gap-4">
          <input 
            type="color" 
            value={currentColor}
            onChange={(e) => handleColorChange(e.target.value)}
            disabled={!isConnected}
            className="w-24 h-24 rounded cursor-pointer bg-transparent border-0 disabled:opacity-50"
          />
          <div className="text-gray-400">
            <p>Selecione a cor ou arraste o mouse.</p>
            <p className="text-sm">O envio é otimizado automaticamente para não travar o Bluetooth.</p>
          </div>
        </div>
      </section>

      {/* Criador de Loop (Formulário Dinâmico) */}
      <section className="bg-gray-900 p-6 rounded-lg border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Sequência Customizada</h2>
          
          <select 
            onChange={(e) => handleTemplateChange(e.target.value)}
            disabled={isLooping}
            className="bg-gray-950 border border-gray-700 text-white text-sm rounded focus:ring-purple-500 focus:border-purple-500 block p-2"
          >
            {Object.keys(TEMPLATES).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3 mb-6">
          {sequence.map((step) => (
            <div key={step.id} className="flex items-center gap-4 bg-gray-950 p-3 rounded border border-gray-800">
              <input 
                type="color" 
                value={step.hex}
                onChange={(e) => updateStep(step.id, 'hex', e.target.value)}
                disabled={isLooping}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 disabled:opacity-50"
              />
              <input 
                type="text" 
                value={step.hex.toUpperCase()}
                onChange={(e) => updateStep(step.id, 'hex', e.target.value)}
                disabled={isLooping}
                className="bg-gray-900 border border-gray-700 text-white text-sm rounded p-2 w-24 uppercase"
              />
              <div className="flex items-center gap-2 ml-auto">
                <input 
                  type="number" 
                  value={step.delayMs}
                  onChange={(e) => updateStep(step.id, 'delayMs', Number(e.target.value))}
                  disabled={isLooping}
                  className="bg-gray-900 border border-gray-700 text-white text-sm rounded p-2 w-20 text-right"
                />
                <span className="text-gray-500 text-sm">ms</span>
              </div>
              <button 
                onClick={() => removeStep(step.id)}
                disabled={isLooping || sequence.length === 1}
                className="text-red-500 hover:bg-red-500/20 p-2 rounded transition-colors disabled:opacity-50"
                title="Remover cor"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center border-t border-gray-800 pt-4">
          <button 
            onClick={addStep}
            disabled={isLooping}
            className="text-purple-400 hover:text-purple-300 font-medium px-2 py-1 rounded hover:bg-purple-900/30 disabled:opacity-50 transition-colors"
          >
            + Adicionar Cor
          </button>
          
          <button 
            onClick={toggleLoop}
            disabled={!isConnected || sequence.length === 0}
            className={`px-8 py-2 rounded font-medium transition-colors ${
              isLooping ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLooping ? 'Parar Loop' : '▶ Play'}
          </button>
        </div>
      </section>
    </div>
  );
}