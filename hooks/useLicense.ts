// ARCHIVO COMPLETO: src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../services/firestore';

/**
 * Hook para controlar el estado del servicio remoto (Kill Switch)
 * Lee el Serial/LicenseKey desde la configuración del club en Firebase
 */
export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Primero obtenemos la configuración principal del club
    // En tu firestore.ts, CONFIG_COL es 'club_config' y CONFIG_DOC_ID es 'main_config'
    const configRef = doc(db, 'club_config', 'main_config');

    const checkStatus = async () => {
      try {
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const configData = configSnap.data();
          const licenseKey = configData.licenseKey;

          if (!licenseKey) {
            console.warn("No se encontró licenseKey en la configuración del club.");
            setLoading(false);
            return;
          }

          // 2. Con el licenseKey (ID del cliente), escuchamos la colección global 'clients'
          const clientRef = doc(db, 'clients', licenseKey);
          
          const unsubClient = onSnapshot(clientRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const clientData = docSnapshot.data();
              // Bloqueamos si isActive es estrictamente false
              setIsLocked(clientData.isActive === false);
            } else {
              // Si el ID de licencia no existe en la tabla de administración, bloqueamos por seguridad
              setIsLocked(true);
            }
            setLoading(false);
          }, (err) => {
            console.error("Error en tiempo real de licencia:", err);
            setLoading(false);
          });

          return unsubClient;
        } else {
          console.error("No existe el documento main_config");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error inicializando validación de licencia:", error);
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  return { isLocked, loading };
};
