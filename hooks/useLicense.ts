// src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { licenseDb } from '../services/licenseService';

export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Este ID debe ser el mismo que pusiste en el paso 1
  const LICENSE_ID = "7WlbYHPcvXivSLINHdqB"; 

  useEffect(() => {
    const clientRef = doc(licenseDb, "clients", LICENSE_ID);

    const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Solo bloquea si isActive es EXPLÍCITAMENTE false
        setIsLocked(data.isActive === false); 
      } else {
        // Si el documento desaparece del SaaS, por seguridad NO bloqueamos
        // para que el club pueda seguir operando.
        setIsLocked(false);
      }
      setLoading(false);
    }, (error) => {
      // Si hay error de conexión o API, la app NO se bloquea
      console.error("Error de licencia (Modo Emergencia):", error);
      setIsLocked(false); 
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isLocked, loading };
};
