// ARCHIVO COMPLETO: src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Hook para controlar el estado del servicio remoto (Kill Switch)
 * Se sincroniza con el ID guardado en la base de datos del club.
 */
export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Definimos las rutas según tu firestore.ts
    const CONFIG_COL = 'club_config';
    const CONFIG_DOC_ID = 'main_config';

    const initLicenseCheck = async () => {
      try {
        // 2. Leemos la licencia configurada en el club de Padel
        const configRef = doc(db, CONFIG_COL, CONFIG_DOC_ID);
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
          const licenseKey = configSnap.data().licenseKey;

          if (!licenseKey) {
            console.error("No se encontró licenseKey en la base de datos del club.");
            setLoading(false);
            return;
          }

          // 3. ESCUCHA EN TIEMPO REAL:
          // Escuchamos el documento del cliente en la colección 'clients'
          // Este es el documento que tu Panel SaaS modifica al presionar el botón.
          const clientRef = doc(db, 'clients', licenseKey);

          const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              // Si isActive es false en el SaaS, bloqueamos aquí.
              setIsLocked(data.isActive === false);
              console.log(`Estado de licencia (${licenseKey}):`, data.isActive ? "ACTIVO" : "SUSPENDIDO");
            } else {
              // Si el ID existe en el club pero no en la tabla de clientes del SaaS
              console.warn("El ID de licencia no existe en la colección de administración.");
              setIsLocked(false); 
            }
            setLoading(false);
          }, (error) => {
            console.error("Error en la conexión de licencia:", error);
            setLoading(false);
          });

          return unsubscribe;
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Fallo crítico al validar licencia:", err);
        setLoading(false);
      }
    };

    initLicenseCheck();
  }, []);

  return { isLocked, loading };
};
