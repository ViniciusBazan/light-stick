import { useState, useRef } from 'react';
import { useLightstick } from './hooks/useLightstick';

interface ColorStep {
  id: string;
  hex: string;
  delayMs: number;
}

// Template Rainbow
const RAINBOW_TEMPLATE: ColorStep[] = [
  { id: '1', hex: '#FF0000', delayMs: 500 },
  { id: '2', hex: '#FF7F00', delayMs: 500 },
  { id: '3', hex: '#FFFF00', delayMs: 500 },
  { id: '4', hex: '#00FF00', delayMs: 500 },
  { id: '5', hex: '#0000FF', delayMs: 500 },
  { id: '6', hex: '#4B0082', delayMs: 500 },
  { id: '7', hex: '#8B00FF', delayMs: 500 },
];

export default function App() {
  const { isConnected, model, connect, sendColor } = useLightstick();
  
  const [currentColor, setCurrentColor] = useState('#00FF00');
  const [sequence, setSequence] = useState<ColorStep[]>(RAINBOW_TEMPLATE);
  const [isLooping, setIsLooping] = useState(false);
  
  const loopActiveRef = useRef(false);

  const handleConnect = async () => {
    await connect();
  };

  const handleSingleColor = async () => {
    if (isLooping) toggleLoop(); // Para o loop se estiver rodando
    await sendColor(currentColor);
  };

  // Lógica recursiva do Loop
  const runLoop = async (currentIndex: number) => {
    if (!loopActiveRef.current || sequence.length === 0) return;

    const step = sequence[currentIndex];
    await sendColor(step.hex);

    const nextIndex = (currentIndex + 1) % sequence.length;
    
    // Aguarda o tempo específico deste frame antes de chamar o próximo
    setTimeout(() => {
      runLoop(nextIndex);
    }, step.delayMs);
  };

  const toggleLoop = () => {
    if (isLooping) {
      loopActiveRef.current = false;
      setIsLooping(false);
    } else {
      loopActiveRef.current = true;
      setIsLooping(true);
      runLoop(0); // Inicia do primeiro index
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 flex flex-col gap-8">
      <header className="border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-white">Bora Controller</h1>
        <p className="text-gray-400 mt-2">Status: {isConnected ? <span className="text-green-400">Conectado ({model})</span> : <span className="text-red-400">Desconectado</span>}</p>
        
        {!isConnected && (
          <button 
            onClick={handleConnect}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded font-medium transition-colors"
          >
            Parear Lightstick
          </button>
        )}
      </header>

      {/* Controle de Cor Única */}
      <section className="bg-gray-900 p-6 rounded-lg border border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Cor Estática</h2>
        <div className="flex items-center gap-4">
          <input 
            type="color" 
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-16 h-16 rounded cursor-pointer bg-transparent border-0"
          />
          <button 
            onClick={handleSingleColor}
            disabled={!isConnected}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          >
            Enviar Cor
          </button>
        </div>
      </section>

      {/* Controle de Sequência (Loop) */}
      <section className="bg-gray-900 p-6 rounded-lg border border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Sequência de Cores</h2>
          <button 
            onClick={toggleLoop}
            disabled={!isConnected || sequence.length === 0}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isLooping ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLooping ? 'Parar Loop' : 'Iniciar Loop'}
          </button>
        </div>

        <div className="space-y-3">
          {sequence.map((step) => (
            <div key={step.id} className="flex items-center gap-4 bg-gray-950 p-3 rounded">
              <div 
                className="w-6 h-6 rounded-full border border-gray-700" 
                style={{ backgroundColor: step.hex }}
              />
              <span className="font-mono text-gray-300">{step.hex}</span>
              <span className="text-gray-500 text-sm ml-auto">{step.delayMs}ms</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4 italic">*Para alterar essas cores, edite o RAINBOW_TEMPLATE no código (ou crie um form para gerenciar esse array na UI!)</p>
      </section>
    </div>
  );
}