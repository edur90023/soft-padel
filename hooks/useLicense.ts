import { useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Importación directa desde la configuración de Firebase

/**
 * Hook para controlar el estado del servicio remoto (Kill Switch)
 * Sincronizado con el Panel de Control SaaS mediante el ID: 79076092-0702-4cff-ad2b-ba8aaee65283
 */
export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Definimos las rutas de colecciones según la estructura del proyecto
    const CONFIG_COL = 'club_config';
    const CONFIG_DOC_ID = 'main_config';

    // 1. Referencia al documento de configuración local del club
    const configRef = doc(db, CONFIG_COL, CONFIG_DOC_ID);

    const checkStatus = async () => {
      try {
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const configData = configSnap.data();
          // Intentamos obtener el ID del campo 'licenseKey'. 
          // Si no existe en la DB, usamos el proporcionado como respaldo.
          const licenseKey = configData.licenseKey || "79076092-0702-4cff-ad2b-ba8aaee65283";

          // 2. Escuchamos la colección global 'clients' en el Panel SaaS
          const clientRef = doc(db, 'clients', licenseKey);
          
          const unsubClient = onSnapshot(clientRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const clientData = docSnapshot.data();
              // Bloqueamos la interfaz si 'isActive' es estrictamente falso en el SaaS
              setIsLocked(clientData.isActive === false);
              console.log(`LICENCIA: Estado para ${licenseKey} verificado: ${clientData.isActive ? 'Activo' : 'Suspendido'}`);
            } else {
              // Si el ID no existe en el Panel SaaS, bloqueamos por seguridad
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
          console.error("LICENCIA: No se pudo leer la configuración local (main_config).");
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
