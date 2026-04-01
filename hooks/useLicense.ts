// ARCHIVO: src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firestore';

/**
 * Hook para controlar el estado del servicio remoto (Kill Switch)
 * Se conecta a la colección 'clients' de la base de datos para verificar isActive
 */
export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reemplaza este ID con el ID del cliente que generaste en tu Panel de Control SaaS
  const LICENSE_CLIENT_ID = "ID_DEL_CLIENTE_AQUÍ"; 

  useEffect(() => {
    // Referencia al documento del cliente en la colección de administración
    const clientRef = doc(db, 'clients', LICENSE_CLIENT_ID);

    const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Si isActive es false, el servicio está cortado
        setIsLocked(data.isActive === false);
      } else {
        // Si no existe el registro, por seguridad bloqueamos
        setIsLocked(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error validando licencia:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isLocked, loading };
};
