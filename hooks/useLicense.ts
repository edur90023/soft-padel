// ARCHIVO COMPLETO: src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Importación directa de la base de datos

/**
 * Hook para controlar el estado del servicio remoto (Kill Switch)
 * Sincronizado con la lógica de firestore.ts del proyecto
 */
export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Definimos las rutas exactas según figuran en firestore.ts
    const CONFIG_COL = 'club_config';
    const CONFIG_DOC_ID = 'main_config';

    // 1. Referencia al documento de configuración del club local
    const configRef = doc(db, CONFIG_COL, CONFIG_DOC_ID);

    const checkStatus = async () => {
      try {
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const configData = configSnap.data();
          // Buscamos el ID del cliente (cuesta_padel) guardado en la base de datos local
          const licenseKey = configData.licenseKey;

          if (!licenseKey) {
            console.error("LICENCIA: No se encontró el campo 'licenseKey' en club_config/main_config.");
            setIsLocked(true); // Bloqueamos por falta de identificación
            setLoading(false);
            return;
          }

          // 2. Con la identidad confirmada, escuchamos la colección de administración del SaaS
          // Buscamos en la colección global 'clients' el documento con ID 'cuesta_padel'
          const clientRef = doc(db, 'clients', licenseKey);
          
          const unsubClient = onSnapshot(clientRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const clientData = docSnapshot.data();
              // El Kill Switch se activa si isActive es false en el Panel SaaS
              setIsLocked(clientData.isActive === false);
              console.log(`LICENCIA: Estado para ${licenseKey} es ${clientData.isActive ? 'Activo' : 'Suspendido'}`);
            } else {
              // Si el ID no existe en el Panel SaaS, bloqueamos preventivamente
              console.error(`LICENCIA: El ID ${licenseKey} no existe en el panel administrativo.`);
              setIsLocked(true);
            }
            setLoading(false);
          }, (err) => {
            console.error("LICENCIA: Error de conexión con el panel administrativo:", err);
            setLoading(false);
          });

          return unsubClient;
        } else {
          console.error("LICENCIA: No se pudo leer la configuración local del club.");
          setIsLocked(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("LICENCIA: Error crítico en el proceso de validación:", error);
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  return { isLocked, loading };
};
