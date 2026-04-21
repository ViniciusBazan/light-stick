import { useState, useRef } from 'react';

// Constantes dos Serviços
const SERVICE_P = '00010203-0405-0607-0809-0a0b0c0d1911';
const SERVICE_F = '0000180a-0000-1000-8000-00805f9b34fb';
const SERVICE_X = '0001fe01-0000-1000-8000-00805f9800c4';

export function useLightstick() {
  const [isConnected, setIsConnected] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  
  // useRef é ideal aqui porque não queremos re-renderizar o componente se a ref do Bluetooth mudar
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const buildPayload = (hexColor: string, deviceModel: string) => {
    const cleanHex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
    const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
    const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
    const b = parseInt(cleanHex.slice(4, 6), 16) || 0;

    if (deviceModel === 'BTS_V4 LS') {
      return new Uint8Array([r, g, b, 1]); // 1 = brightness default
    }

    const payload = [1, 1, 11, 0, 0, r, g, b, 0, 0];
    const checksum = (payload.reduce((sum, byte) => sum + byte, 0) - 2) & 255;
    payload.push(checksum);
    return new Uint8Array(payload);
  };

  const connect = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'BTS LIGHTSTICK_SE' },
          { name: 'multiM' },
          { name: 'BTS LIGHTSTICK3' },
          { name: 'BTS_V4 LS' }
        ],
        optionalServices: [SERVICE_P, SERVICE_F, SERVICE_X]
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error("GATT Server indisponível");

      const deviceModel = device.name?.includes('BTS_V4') ? 'BTS_V4 LS' : 'BTS Lightstick_SE';
      setModel(deviceModel);

      if (deviceModel === 'BTS_V4 LS') {
        const wakeUpService = await server.getPrimaryService(SERVICE_F);
        const wakeUpChars = await wakeUpService.getCharacteristics();
        if (wakeUpChars.length > 0) await wakeUpChars[0].readValue();

        const service = await server.getPrimaryService(SERVICE_X);
        characteristicRef.current = await service.getCharacteristic('0001ff01-0000-1000-8000-00805f9800c4');
      } else {
        const service = await server.getPrimaryService(SERVICE_P);
        characteristicRef.current = await service.getCharacteristic('00010203-0405-0607-0809-0a0b0c0d2b19');
      }

      setIsConnected(true);
      
      // Listener para caso o dispositivo seja desligado
      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setModel(null);
        characteristicRef.current = null;
      });

    } catch (error) {
      console.error("Erro na conexão:", error);
    }
  };

  const sendColor = async (hexColor: string) => {
    if (!characteristicRef.current || !model) return;

    try {
      const payload = buildPayload(hexColor, model);
      if (model === 'BTS_V4 LS') {
        await characteristicRef.current.writeValue(payload);
      } else {
        await characteristicRef.current.writeValueWithoutResponse(payload);
      }
    } catch (error) {
      console.error("Falha ao enviar cor:", error);
    }
  };

  return { isConnected, model, connect, sendColor };
}