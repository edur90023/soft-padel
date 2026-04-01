// ARCHIVO COMPLETO: src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // DB del Club
import { licenseDb } from '../services/licenseService'; // DB del SaaS

export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIdAndListen = async () => {
      try {
        // 1. Leemos el ID desde la configuración propia del club (DB local)
        const configRef = doc(db, 'club_config', 'main_config');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const licenseId = configSnap.data().licenseKey;

          if (!licenseId) {
            console.error("⚠️ No se encontró licenseKey en la DB local.");
            setIsLocked(true); // Bloqueo preventivo si no hay ID
            setLoading(false);
            return;
          }

          // 2. Escuchamos en TIEMPO REAL el panel administrativo (DB SaaS)
          const clientRef = doc(licenseDb, "clients", licenseId);

          const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              // Si isActive es false en el panel SaaS -> BLOQUEAR
              setIsLocked(data.isActive === false); 
              console.log(`Licencia ${licenseId}: ${data.isActive ? 'ACTIVA' : 'BLOQUEADA'}`);
            } else {
              setIsLocked(true); // Bloqueo si el cliente no existe en el SaaS
            }
            setLoading(false);
          }, (error) => {
            console.error("Error de conexión con LicenseDb:", error);
            setIsLocked(false); // Fail-safe: si falla el SaaS, permitimos seguir
            setLoading(false);
          });

          return unsubscribe;
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Fallo crítico en useLicense:", error);
        setLoading(false);
      }
    };

    const unsubPromise = fetchIdAndListen();
    return () => { unsubPromise.then(u => u && u()); };
  }, []);

  return { isLocked, loading };
};
